"""Un visitante explora la demo sin credenciales y sin acceso a la base personal."""
import os
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import main
from almacen import conectar, lecturas, migrar, tripulacion
from demostracion import _ruta, _token
from seguridad import crear_cuenta

T = "2026-11-14T08:00:00Z"


class Demostracion(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        entorno = patch.dict(os.environ, {"VIGIA_DB": str(Path(self.tmp.name) / "personal.db"), "VIGIA_DEMO_DIR": str(Path(self.tmp.name) / "visitas"), "VIGIA_IDENTIDAD_ENSAYO": "0", "SMART_DESACTIVADO": "1", "VIGIA_RELOJ_SEG": "0"})
        entorno.start()
        self.addCleanup(entorno.stop)
        conn = conectar()
        migrar(conn)
        mision = tripulacion.crear_mision(conn, "Misión privada", "estacion", "2026-11-14T00:00:00Z")
        tripulacion.crear_tripulante(conn, "Nombre personal reservado", mision, "astronauta")
        lecturas.registrar_lectura(conn, 1, "spo2", 93, T, naturaleza="Real")
        conn.close()
        self.c = TestClient(main.app)
        self.addCleanup(self.c.close)

    def entrar(self, cliente=None):
        cliente = cliente or self.c
        r = cliente.post("/demo/sesion")
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()

    def test_entrada_sin_clave_es_idempotente_y_no_crea_cuentas(self):
        s = self.entrar()
        self.assertTrue(s["demo_publica"])
        self.assertEqual(self.entrar()["espacio_demo"], s["espacio_demo"])
        self.assertIn("HttpOnly", self.c.post("/demo/sesion").headers["set-cookie"])
        self.assertEqual(self.c.get("/demo/sesion").json()["espacio_demo"], s["espacio_demo"])
        conn = conectar()
        try:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM identidad_cuenta").fetchone()[0], 0)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM lectura").fetchone()[0], 1)
        finally:
            conn.close()

    def test_cookie_demo_no_autoriza_api_personal_ni_lee_nombres_reales(self):
        self.entrar()
        self.assertEqual(self.c.get("/tripulantes/1/lecturas").status_code, 401)
        self.assertEqual(self.c.get("/sesion").status_code, 401)
        equipo = self.c.get("/demo/tripulacion")
        self.assertEqual(equipo.status_code, 200, equipo.text)
        self.assertNotIn("Nombre personal reservado", equipo.text)
        historial = self.c.get("/demo/tripulantes/1/historial?modo=demo")
        self.assertEqual(historial.status_code, 200)
        self.assertEqual(historial.json()["naturaleza"], "Simulado")

    def test_escrituras_aisladas_csrf_y_dos_visitantes(self):
        s = self.entrar()
        cuerpo = {"id": "obs-demo", "operacion_id": "obs-demo", "indicador": "spo2", "valor": 97, "unidad": "%", "t_real": T,
                  "precision_tiempo": "declarada", "origen": "manual", "uso": "escenario", "comparable": False, "configuracion_version": "captura-v1"}
        ruta = "/demo/tripulantes/1/observaciones"
        self.assertEqual(self.c.post(ruta, json=cuerpo).status_code, 403)
        self.assertEqual(self.c.post(ruta, json=cuerpo, headers={"X-Vigia-CSRF": s["csrf"]}).status_code, 201)
        self.assertEqual(len(self.c.get(ruta).json()), 1)
        with TestClient(main.app) as otro:
            segunda = self.entrar(otro)
            self.assertNotEqual(segunda["espacio_demo"], s["espacio_demo"])
            self.assertEqual(otro.get(ruta).json(), [])
        conn = conectar()
        try:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM lectura").fetchone()[0], 1)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM observacion WHERE id = 'obs-demo'").fetchone()[0], 0)
        finally:
            conn.close()

    def test_roles_y_respuesta_simulada_no_contactan_transporte(self):
        s = self.entrar()
        medico = {"X-Vigia-Demo-Rol": "surgeon", "X-Vigia-CSRF": s["csrf"]}
        self.assertEqual(self.c.get("/demo/tripulantes/1/historial?modo=demo", headers=medico).status_code, 200)
        self.assertEqual(self.c.get("/demo/reportes/recibidos").status_code, 403)
        self.assertEqual(self.c.get("/demo/reportes/recibidos", headers=medico).status_code, 200)
        with patch("transporte.responder_en_destino", side_effect=AssertionError("No debe tocar el enlace real")):
            r = self.c.post("/demo/tripulantes/1/reportes", headers={"X-Vigia-CSRF": s["csrf"]}, json={"creado_t_real": T, "retardo_min": 0, "contenido": {"titulo": "Ensayo", "demo": True}, "operacion_id": "prueba"})
            self.assertEqual(r.status_code, 201)
            contestar = self.c.post(f"/demo/reportes/{r.json()['id']}/respuesta", headers=medico, json={"respuesta": "Respuesta simulada", "t_real": T})
            self.assertEqual(contestar.status_code, 200, contestar.text)

    def test_no_expone_reloj_real_y_no_abre_rutas_arbitrarias(self):
        self.entrar()
        self.assertEqual(self.c.get("/demo/tripulantes/1/reloj").status_code, 404)
        self.assertEqual(self.c.get("/demo/reloj/estado").status_code, 404)
        self.c.cookies.clear()
        self.c.cookies.set("vigia_demo", "../../personal.db")
        self.assertEqual(self.c.get("/demo/tripulacion").status_code, 401)
        with self.assertRaises(ValueError):
            _ruta("../personal")

    def test_sesion_caducada_y_firma_alterada_no_autorizan(self):
        s = self.entrar()
        token = self.c.cookies.get("vigia_demo")
        self.c.cookies.clear()
        self.c.cookies.set("vigia_demo", _token(s["espacio_demo"], int(time.time()) - 1))
        self.assertEqual(self.c.get("/demo/sesion").status_code, 401)
        self.c.cookies.set("vigia_demo", token[:-1] + ("0" if token[-1] != "0" else "1"))
        self.assertEqual(self.c.get("/demo/sesion").status_code, 401)

    def test_marcador_demo_tampoco_usa_una_cookie_personal_valida(self):
        conn = conectar()
        crear_cuenta(conn, "personal", "clave-de-prueba-local", 1, "astronaut")
        conn.close()
        real = self.c.post("/sesion", json={"usuario": "personal", "clave": "clave-de-prueba-local"})
        self.assertEqual(real.status_code, 200)
        cookie = self.c.cookies.get("vigia_sesion")
        self.entrar()
        self.assertEqual(self.c.cookies.get("vigia_sesion"), cookie)
        self.assertEqual(self.c.get("/tripulantes/1/lecturas", headers={"X-Vigia-Demo-Rol": "astronaut"}).status_code, 403)
        self.assertEqual(self.c.get("/tripulantes/1/lecturas").status_code, 200)
