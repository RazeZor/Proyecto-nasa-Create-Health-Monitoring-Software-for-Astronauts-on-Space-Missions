"""Aceptación de identidad, medidas, seguimiento y transporte sin datos del usuario."""
import hashlib
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import main
from almacen import cola, conectar, migrar, observaciones
from almacen import tripulacion as tr
from seguridad import crear_cuenta
from transporte import entregar_pendientes, recoger_respuestas

T = "2026-11-14T08:00:00Z"


class PlanIntegral(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        entorno = patch.dict(os.environ, {"VIGIA_DB": str(Path(self.tmp.name) / "ensayo.db"), "VIGIA_IDENTIDAD_ENSAYO": "0",
                                          "VIGIA_TIERRA_URL": "http://127.0.0.1:8100", "VIGIA_TIERRA_CLAVE": "x" * 40})
        entorno.start()
        self.addCleanup(entorno.stop)
        conn = conectar()
        migrar(conn)
        mision = tr.crear_mision(conn, "Ensayo", "transito", "2026-11-14T00:00:00Z")
        self.ana = tr.crear_tripulante(conn, "Ana", mision, "astronauta")
        self.bea = tr.crear_tripulante(conn, "Bea", mision, "astronauta")
        self.med = tr.crear_tripulante(conn, "Med", mision, "oficial_medico")
        tr.consentir(conn, self.ana, "historial_clinico", T)
        for usuario, sujeto, rol in (("ana", self.ana, "astronaut"), ("bea", self.bea, "astronaut"), ("med", self.med, "cmo")):
            crear_cuenta(conn, usuario, "clave-privada-de-ensayo", sujeto, rol)
        conn.close()
        self.c = TestClient(main.app)
        self.addCleanup(self.c.close)

    def entrar(self, usuario="ana"):
        res = self.c.post("/sesion", json={"usuario": usuario, "clave": "clave-privada-de-ensayo"})
        self.assertEqual(res.status_code, 200, res.text)
        return {"X-Vigia-CSRF": res.json()["csrf"]}

    def dato(self, id_="o1", **cambios):
        return {"id": id_, "operacion_id": id_, "indicador": "spo2", "valor": 89, "unidad": "%", "t_real": T,
                "precision_tiempo": "declarada", "origen": "manual", "metodo": "oximetro", "instrumento": "ensayo",
                "sitio": "dedo", "uso": "operativo", "comparable": True, "configuracion_version": "captura-v1", "corrige_id": None, **cambios}

    def test_cabecera_no_autentica_y_suplantar_identidad_no_autoriza(self):
        url = f"/tripulantes/{self.bea}/lecturas"
        self.assertEqual(self.c.get(url, headers={"X-Tripulante": str(self.bea)}).status_code, 401)
        self.entrar()
        self.assertEqual(self.c.get(url, headers={"X-Tripulante": str(self.bea)}).status_code, 403)
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/lecturas").status_code, 200)

    def test_csrf_y_revocacion(self):
        csrf = self.entrar()
        url = f"/tripulantes/{self.ana}/observaciones"
        self.assertEqual(self.c.post(url, json=self.dato()).status_code, 403)
        self.assertEqual(self.c.post(url, headers=csrf, json=self.dato()).status_code, 201)
        cookie = self.c.cookies.get("vigia_sesion")
        self.assertEqual(self.c.delete("/sesion", headers=csrf).status_code, 200)
        self.assertEqual(self.c.get("/sesion", headers={"Cookie": f"vigia_sesion={cookie}"}).status_code, 401)

    def test_sesion_no_guarda_token_ni_clave_en_claro(self):
        self.entrar()
        cookie = self.c.cookies.get("vigia_sesion")
        conn = conectar()
        try:
            fila = conn.execute("SELECT token_hash FROM identidad_sesion").fetchone()
            self.assertNotEqual(fila[0], cookie)
            self.assertEqual(fila[0], hashlib.sha256(cookie.encode()).hexdigest())
            self.assertNotIn("clave-privada-de-ensayo", str([tuple(f) for f in conn.execute("SELECT * FROM identidad_cuenta")]))
        finally:
            conn.close()

    def test_bloqueo_temporal_de_intentos(self):
        for _ in range(5):
            self.assertEqual(self.c.post("/sesion", json={"usuario": "desconocido", "clave": "mala"}).status_code, 401)
        self.assertEqual(self.c.post("/sesion", json={"usuario": "ana", "clave": "clave-privada-de-ensayo"}).status_code, 429)

    def test_rol_de_cuenta_no_hereda_privilegios_medicos(self):
        conn = conectar()
        try:
            with self.assertRaises(ValueError):
                crear_cuenta(conn, "privilegio", "clave-privada-de-ensayo", self.med, "astronaut")
            with self.assertRaises(ValueError):
                crear_cuenta(conn, "privilegio", "clave-privada-de-ensayo", self.ana, "cmo")
        finally:
            conn.close()

    def test_revocar_consentimiento_bloquea_acceso_clinico_nuevo(self):
        csrf = self.entrar()
        url = f"/tripulantes/{self.ana}/consentimientos"
        self.assertEqual(self.c.post(url, headers=csrf, json={"regla": "historial_clinico", "aceptado": False}).status_code, 200)
        self.entrar("med")
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/historial").status_code, 403)
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/observaciones").status_code, 403)
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/episodios").status_code, 403)

    def test_acuse_observacion_y_conflicto(self):
        csrf = self.entrar()
        url = f"/tripulantes/{self.ana}/observaciones"
        a = self.c.post(url, headers=csrf, json=self.dato())
        b = self.c.post(url, headers=csrf, json=self.dato())
        self.assertEqual((a.status_code, b.status_code), (201, 201))
        self.assertEqual(a.json()["recibido_t_real"], b.json()["recibido_t_real"])
        self.assertEqual(self.c.post(url, headers=csrf, json=self.dato(valor=98)).status_code, 409)
        self.assertEqual(len(self.c.get(url).json()), 1)

    def test_dos_tomas_mismo_segundo_conservan_extremo_y_horas(self):
        csrf = self.entrar()
        url = f"/tripulantes/{self.ana}/observaciones"
        self.c.post(url, headers=csrf, json=self.dato())
        self.c.post(url, headers=csrf, json=self.dato("o2", valor=98))
        self.assertEqual([o["valor"] for o in self.c.get(url).json()], [89, 98])
        h = self.c.get(f"/tripulantes/{self.ana}/historial").json()["lecturas"][0]
        self.assertEqual(h["spo2_pct"], 98)
        self.assertEqual([o["valor"] for o in h["observaciones"]], [89, 98])
        self.assertEqual(h["mediciones"]["spo2_pct"]["t_real"], T)

    def test_hora_desconocida_no_inventa_instante_ni_toma_diaria(self):
        csrf = self.entrar()
        dato = self.dato(t_real=None, precision_tiempo="desconocida")
        self.assertEqual(self.c.post(f"/tripulantes/{self.ana}/observaciones", headers=csrf, json=dato).status_code, 201)
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/lecturas").json(), [])
        self.assertIsNone(self.c.get(f"/tripulantes/{self.ana}/observaciones").json()[0]["t_real"])

    def test_correccion_no_borra_original_y_no_acepta_otro_indicador(self):
        csrf = self.entrar()
        url = f"/tripulantes/{self.ana}/observaciones"
        self.c.post(url, headers=csrf, json=self.dato())
        self.assertEqual(self.c.post(url, headers=csrf, json=self.dato("o2", valor=98, corrige_id="o1")).status_code, 201)
        self.assertEqual(self.c.post(url, headers=csrf, json=self.dato("o3", corrige_id="o1", indicador="sueno", unidad="h")).status_code, 422)
        conn = conectar()
        try:
            for sql in ("DELETE FROM observacion", "UPDATE observacion SET valor = 98"):
                with self.assertRaises(sqlite3.IntegrityError):
                    conn.execute(sql)
                conn.rollback()
            self.assertEqual(len(observaciones.listar(conn, self.ana)), 2)
        finally:
            conn.close()

    def evento(self, tipo, version, id_):
        return {"id": id_, "episodio_id": "ep1", "clave": "spo2", "indicador": "spo2", "tipo": tipo,
                "nota": "Motivo documentado", "observaciones": [], "t_real": T, "version_previa": version}

    def test_episodio_conserva_historia_y_exige_revision_para_cerrar(self):
        csrf = self.entrar()
        url = f"/tripulantes/{self.ana}/episodios/eventos"
        abrir = self.evento("abrir", 0, "ev1")
        self.assertEqual(self.c.post(url, headers=csrf, json=abrir).status_code, 201)
        self.assertEqual(self.c.post(url, headers=csrf, json=abrir).json()["version"], 1)
        self.assertEqual(self.c.post(url, headers=csrf, json=self.evento("accion", 0, "evx")).status_code, 409)
        self.assertEqual(self.c.post(url, headers=csrf, json=self.evento("solicitar_revision", 1, "ev2")).status_code, 201)
        self.assertEqual(self.c.post(url, headers=csrf, json=self.evento("cerrar", 2, "ev3")).status_code, 422)
        medico = self.entrar("med")
        self.assertEqual(self.c.post(url, headers=medico, json=self.evento("cerrar", 2, "ev3")).status_code, 201)
        episodio = self.c.get(f"/tripulantes/{self.ana}/episodios").json()[0]
        self.assertEqual((episodio["estado"], len(episodio["eventos"])), ("cerrado", 3))

    def test_remedicion_rechaza_una_toma_anterior_a_la_accion(self):
        csrf = self.entrar()
        self.c.post(f"/tripulantes/{self.ana}/observaciones", headers=csrf, json=self.dato())
        url = f"/tripulantes/{self.ana}/episodios/eventos"
        self.c.post(url, headers=csrf, json=self.evento("abrir", 0, "ev1"))
        remedicion = {**self.evento("remedicion", 1, "ev2"), "observaciones": ["o1"]}
        self.assertEqual(self.c.post(url, headers=csrf, json=remedicion).status_code, 422)
        posterior = self.dato("o2", valor=98, t_real="2026-11-14T08:00:01Z")
        self.c.post(f"/tripulantes/{self.ana}/observaciones", headers=csrf, json=posterior)
        remedicion["observaciones"] = ["o2"]
        self.assertEqual(self.c.post(url, headers=csrf, json=remedicion).status_code, 201)

    def test_receptor_incorrecto_no_acredita_entrega_y_acuse_perdido_reintenta(self):
        conn = conectar()
        try:
            reporte = cola.encolar_reporte(conn, self.ana, T, 0, {"titulo": "Ensayo"}, "envio-1")
            self.assertEqual(entregar_pendientes(conn, T, lambda m, b: {"id": "otro", "sha256": "00"}), 0)
            self.assertEqual(cola.leer_reportes(conn, self.ana)[0]["estado"], "en_cola")
            enviados = []
            def receptor(m, b):
                enviados.append(m["id"])
                if len(enviados) == 1:
                    raise OSError("acuse perdido después de persistir en el destino")
                return {"id": m["id"], "sha256": hashlib.sha256(b).hexdigest(), "t_real": T}
            self.assertEqual(entregar_pendientes(conn, T, receptor), 0)
            self.assertEqual(entregar_pendientes(conn, T, receptor), 1)
            self.assertEqual(enviados[0], enviados[1])
            self.assertEqual(cola.leer_reportes(conn, self.ana)[0]["acuse_destino"]["mensaje_id"], enviados[0])
            self.assertEqual(entregar_pendientes(conn, T, receptor), 0)
            self.assertEqual(conn.execute("SELECT reporte_id FROM transporte_acuse").fetchone()[0], reporte)
        finally:
            conn.close()

    def test_datos_privados_no_se_cachean_y_temporizador_no_finge_entrega(self):
        csrf = self.entrar()
        res = self.c.get(f"/tripulantes/{self.ana}/historial")
        self.assertEqual(res.headers["Cache-Control"], "no-store")
        self.assertEqual(self.c.post("/reportes/avanzar", headers=csrf, json={"ahora": T}).status_code, 403)

    def test_respuesta_destino_conserva_causalidad_y_es_idempotente(self):
        conn = conectar()
        try:
            cola.encolar_reporte(conn, self.ana, T, 0, {"titulo": "Ensayo"}, "envio-1")
            entregar_pendientes(conn, T, lambda m, b: {"id": m["id"], "sha256": hashlib.sha256(b).hexdigest(), "t_real": T})
            acuse = cola.leer_reportes(conn, self.ana)[0]["acuse_destino"]
            respuesta = {"id": "respuesta-1", "en_respuesta_a": "otro", "t_real": T, "texto": "Recibido para revisión"}
            consultar = lambda _: {"id": acuse["mensaje_id"], "sha256": acuse["sha256"], "respuesta": respuesta}  # noqa: E731
            self.assertEqual(recoger_respuestas(conn, consultar), 0)
            respuesta["en_respuesta_a"] = acuse["mensaje_id"]
            self.assertEqual(recoger_respuestas(conn, consultar), 1)
            self.assertEqual(recoger_respuestas(conn, consultar), 0)
            self.assertEqual(cola.leer_reportes(conn, self.ana)[0]["estado"], "respondido")
        finally:
            conn.close()

    def test_estudio_no_acepta_presentar_practica_como_validada(self):
        csrf = self.entrar()
        dato = {"id": "tarea-1", "t_real": T, "tipo": "reaccion", "protocolo": "reaccion-practica-v1",
                "datos": {"practica": True, "comparable": True, "ensayos": []}}
        self.assertEqual(self.c.post(f"/tripulantes/{self.ana}/estudios", headers=csrf, json=dato).status_code, 422)
