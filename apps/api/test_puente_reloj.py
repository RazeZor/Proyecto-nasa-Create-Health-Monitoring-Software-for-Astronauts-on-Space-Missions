import asyncio
import json
import os
import tempfile
import time
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import main
from almacen import conectar, lecturas, migrar
from almacen import tripulacion as tr

pr = main.puente_reloj  # main agrega packages/i18n al path antes de importarlo

CHEQUEO = {"type": "chequeo", "tripulante": "Sebastián", "t": "2026-11-14T19:19:18Z", "duracion_s": 60,
           "fc_reposo_lpm": 81, "rmssd_ms": 28.5, "spo2_pct": 98, "valido": True, "motivo": None}
VARIABLES = ("VIGIA_DB", "VIGIA_RELOJ_SEG", "SMART_URL", "SMART_TRIPULANTES", "SMART_DESACTIVADO", "SMART_AUTOREGISTRO")


class RelojFalso:
    """Fuente de tiempo monótona que se avanza a mano."""

    def __init__(self):
        self.ahora = 1000.0

    def __call__(self):
        return self.ahora


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["VIGIA_DB"] = str(Path(self.tmp.name) / "vigia.db")
        os.environ["VIGIA_RELOJ_SEG"] = "0"
        conn = conectar()
        migrar(conn)
        self.ids = tr.sembrar_demo(conn)
        conn.close()
        self.ana = self.ids["astronauta"]
        self.mapa = {"sebastián": self.ana}
        pr.ESTADO.__init__()

    def tearDown(self):
        for v in VARIABLES:
            os.environ.pop(v, None)
        pr.PUENTE = None
        self.tmp.cleanup()

    def lecturas_de(self, id_):
        conn = conectar()
        try:
            return lecturas.leer_lecturas(conn, id_)
        finally:
            conn.close()


class Estado(Base):
    def test_mapa_y_tiempo(self):
        self.assertEqual(pr.mapa_tripulantes(" Sebastián=1, Ana = 2,malo,x=y"), {"sebastián": 1, "ana": 2})
        self.assertEqual(pr.t_canonico("2026-11-14T19:19:18.512Z"), "2026-11-14T19:19:18Z")
        self.assertIsNone(pr.t_canonico("2026-11-14T19:19:18"))  # sin zona: no se adivina
        self.assertIsNone(pr.t_canonico("ayer"))

    def test_nombres_por_defecto_y_metodo(self):
        for nombre in ("Tripulante A1b2", "tripulante previo", "Sin nombre", "", None, "desconocido"):
            self.assertTrue(pr.nombre_por_defecto(nombre), nombre)
        for nombre in ("Sebastián", "Tripulante Ana", "Tripulante 12345", "Ana"):
            self.assertFalse(pr.nombre_por_defecto(nombre), nombre)
        self.assertEqual(pr.metodo_de({"dispositivo": "gw-77950ea2"}), "galaxy_watch4:gw-77950ea2")
        self.assertEqual(pr.metodo_de({"dispositivo": None}), "galaxy_watch4")
        self.assertEqual(pr.metodo_de({}), "galaxy_watch4")

    def test_aplica_lectura_resumen_y_tripulacion(self):
        e = pr.EstadoReloj()
        e.aplicar({"type": "tripulacion", "miembros": [{"tripulante": "Sebastián", "conectado": True,
                                                        "dispositivos": ["gw-1"], "modelo": "SM-R860", "sdk": True}]})
        e.aplicar({"type": "lectura", "tripulante": "Sebastián", "t": "2026-11-14T18:48:57Z", "fc_lpm": 72})
        e.aplicar({"type": "resumen", "tripulante": "Sebastián", "fc_reposo": 68, "rmssd_ms": 31.2})
        e.aplicar({"type": "config", "tolerancia": {}})  # sin tripulante: se ignora
        r = e.de_tripulante(["SEBASTIÁN"])
        self.assertTrue(r["conectado"])
        self.assertEqual((r["fc_lpm"], r["modelo"], r["resumen"]["fc_reposo"]), (72, "SM-R860", 68))
        self.assertEqual(r["serie"], [{"t": "2026-11-14T18:48:57Z", "fc_lpm": 72}])
        e.aplicar({"type": "tripulacion", "miembros": []})
        self.assertFalse(e.de_tripulante(["sebastián"])["conectado"])
        self.assertIsNone(e.de_tripulante(["nadie"]))

    def test_history_reemplaza_la_serie_sin_duplicar(self):
        e = pr.EstadoReloj()
        e.aplicar({"type": "lectura", "tripulante": "Sebastián", "t": "2026-11-14T18:48:50Z", "fc_lpm": 70})
        items = [{"t": "2026-11-14T18:48:57Z", "fc_lpm": 72}, {"t": "2026-11-14T18:48:58Z", "fc_lpm": 73},
                 {"t": "2026-11-14T18:48:57Z", "fc_lpm": 72}]
        e.aplicar({"type": "history", "tripulante": "Sebastián", "items": items})
        e.aplicar({"type": "history", "tripulante": "Sebastián", "items": items})  # reconexión: misma foto
        self.assertEqual([p["t"] for p in e.de_tripulante(["sebastián"])["serie"]],
                         ["2026-11-14T18:48:57Z", "2026-11-14T18:48:58Z"])
        # una lectura en vivo repetida (búfer del reloj) tampoco duplica el punto
        e.aplicar({"type": "lectura", "tripulante": "Sebastián", "t": "2026-11-14T18:48:58Z", "fc_lpm": 74})
        e.aplicar({"type": "lectura", "tripulante": "Sebastián", "t": "2026-11-14T18:48:59Z", "fc_lpm": 75})
        serie = e.de_tripulante(["sebastián"])["serie"]
        self.assertEqual([(p["t"][-3:], p["fc_lpm"]) for p in serie], [("57Z", 72), ("58Z", 74), ("59Z", 75)])

    def test_chequeo_reemplaza_el_mismo_t_y_limpia_la_fase(self):
        e = pr.EstadoReloj()
        e.aplicar({"type": "chequeo_estado", "tripulante": "Sebastián", "detalle": "midiendo"})
        self.assertEqual(e.aplicar(CHEQUEO), [{k: v for k, v in CHEQUEO.items() if k != "type"}])
        e.aplicar(CHEQUEO)
        r = e.de_tripulante(["sebastián"])
        self.assertEqual(len(r["chequeos"]), 1)
        self.assertIsNone(r["chequeo_estado"])

    def test_fase_del_chequeo_caduca_y_se_limpia_al_desconectar(self):
        reloj = RelojFalso()
        e = pr.EstadoReloj(reloj=reloj)
        e.aplicar({"type": "chequeo_estado", "tripulante": "Sebastián", "detalle": "estabilizando"})
        e.aplicar({"type": "chequeo_progreso", "tripulante": "Sebastián", "quietos": 5, "ventana": 60,
                   "transcurridos": 7, "maximo": 120})
        reloj.ahora += 119
        r = e.de_tripulante(["sebastián"])
        self.assertEqual((r["chequeo_estado"], r["chequeo_progreso"]["quietos"]), ("estabilizando", 5))
        reloj.ahora += 2  # 121 s sin novedades: el chequeo ya no está en curso
        r = e.de_tripulante(["sebastián"])
        self.assertIsNone(r["chequeo_estado"])
        self.assertIsNone(r["chequeo_progreso"])
        e.aplicar({"type": "chequeo_estado", "tripulante": "Sebastián", "detalle": "midiendo"})
        self.assertEqual(e.de_tripulante(["sebastián"])["chequeo_estado"], "midiendo")
        e.aplicar({"type": "tripulacion", "miembros": [{"tripulante": "Sebastián", "conectado": False}]})
        self.assertIsNone(e.de_tripulante(["sebastián"])["chequeo_estado"])

    def test_recibido_hace_s_con_el_reloj_del_servidor(self):
        reloj = RelojFalso()
        e = pr.EstadoReloj(reloj=reloj)
        e.aplicar({"type": "tripulacion", "miembros": [{"tripulante": "Sebastián", "conectado": True}]})
        self.assertIsNone(e.de_tripulante(["sebastián"])["recibido_hace_s"])
        e.aplicar({"type": "lectura", "tripulante": "Sebastián", "t": "2000-01-01T00:00:00Z", "fc_lpm": 72})  # t del reloj desfasado
        reloj.ahora += 3.26
        r = e.de_tripulante(["sebastián"])
        self.assertEqual(r["recibido_hace_s"], 3.3)
        self.assertFalse(any(k.startswith("_") for k in r))  # lo interno no sale por la API

    def test_resumen_notas_se_combina_con_las_notas_en_vivo(self):
        e = pr.EstadoReloj()
        n1 = {"t": "2026-11-14T10:00:00Z", "tipo": "cambio_instrumento", "detalle": "gw-a -> gw-b"}
        n2 = {"t": "2026-11-14T12:00:00Z", "tipo": "cambio_instrumento", "detalle": "gw-b -> gw-c"}
        e.aplicar({"type": "nota", "tripulante": "Sebastián", **n2})
        e.aplicar({"type": "resumen", "tripulante": "Sebastián", "fc_reposo": 60, "notas": [n1, n2]})
        e.aplicar({"type": "resumen", "tripulante": "Sebastián", "fc_reposo": 61, "notas": [n1]})
        self.assertEqual(e.de_tripulante(["sebastián"])["notas"], [n1, n2])

    def test_aviso_sin_tripulante_es_global_del_puente(self):
        e = pr.EstadoReloj()
        e.aplicar({"type": "aviso", "detalle": "Tolerancia inválida: revisa que reposo ≤ pico ≤ sacudida."})
        e.aplicar({"type": "aviso", "tripulante": "Sebastián", "detalle": "El reloj de Sebastián no está conectado"})
        self.assertEqual([a["detalle"][:10] for a in e.avisos], ["Tolerancia"])
        self.assertEqual(e.de_tripulante(["sebastián"])["avisos"][0]["tipo"], "aviso")
        self.assertNotIn("sin nombre", e.tripulantes)  # el aviso global no inventa un tripulante

    def test_tripulacion_solo_dato_minimo_y_config(self):
        e = pr.EstadoReloj()
        e.aplicar({"type": "tripulacion", "miembros": [
            {"tripulante": "Sebastián", "conectado": True, "fc_lpm": 72, "relojes_conectados": 2,
             "ultima_lectura": "2026-11-14T18:48:57Z", "chequeo_hoy": {"valido": True, "fc_reposo_lpm": 64}},
            {"tripulante": "Ana", "conectado": False}, {"tripulante": "Tripulante 7f3a", "conectado": True}]})
        filas = e.tripulacion()
        self.assertEqual([f["nombre"] for f in filas], ["Ana", "Sebastián", "Tripulante 7f3a"])
        self.assertEqual(filas[1], {"nombre": "Sebastián", "conectado": True, "relojes_conectados": 2,
                                    "ultima_lectura": "2026-11-14T18:48:57Z", "chequeo_hoy": True,
                                    "nombre_por_defecto": False})
        self.assertNotIn("72", str(filas))  # ningún valor fisiológico
        self.assertIsNone(filas[0]["chequeo_hoy"])
        self.assertTrue(filas[2]["nombre_por_defecto"])
        e.aplicar({"type": "config", "tolerancia": {"preset": "normal"}, "presets": {"normal": {}}})
        e.aplicar({"type": "config", "tolerancia": {"preset": "flexible"}})  # al reloj no le llegan presets
        self.assertEqual(e.config, {"tolerancia": {"preset": "flexible"}, "presets": {"normal": {}}})

    def test_url_http_y_url_del_reloj(self):
        self.assertEqual(pr.url_http("wss://smart.ejemplo.dev/live", "export.csv"), "https://smart.ejemplo.dev/export.csv")
        self.assertEqual(pr.url_http("ws://127.0.0.1:8765/live", "/export.csv"), "http://127.0.0.1:8765/export.csv")
        self.assertEqual(pr.url_reloj_sugerida("ws://127.0.0.1:8765/live", "192.168.1.20"), "ws://192.168.1.20:8765/watch")
        self.assertEqual(pr.url_reloj_sugerida("ws://localhost:9000/live", "10.0.0.5"), "ws://10.0.0.5:9000/watch")
        self.assertIsNone(pr.url_reloj_sugerida("ws://127.0.0.1:8765/live", None))
        # SMART_URL en otra máquina: el reloj debe apuntar a esa misma máquina, no a esta
        self.assertEqual(pr.url_reloj_sugerida("wss://smart.ejemplo.dev/live", "192.168.1.20"), "wss://smart.ejemplo.dev/watch")
        ip = pr.ip_lan()
        self.assertTrue(ip is None or (ip.count(".") == 3 and not ip.startswith("127.")))

    def test_crear_puente_por_defecto_desactivado_y_autoregistro(self):
        self.assertEqual(pr.crear_puente().url, pr.SMART_URL_DEFECTO)
        self.assertFalse(pr.crear_puente().autoregistro)
        os.environ["SMART_URL"] = " ws://10.0.0.2:8765/live "
        os.environ["SMART_AUTOREGISTRO"] = "1"
        puente = pr.crear_puente()
        self.assertEqual((puente.url, puente.autoregistro), ("ws://10.0.0.2:8765/live", True))
        os.environ["SMART_DESACTIVADO"] = "1"
        self.assertIsNone(pr.crear_puente())


class Persistencia(Base):
    def test_chequeo_valido_se_guarda_una_vez_como_sensor_real(self):
        conn = conectar()
        try:
            chequeo = {k: v for k, v in CHEQUEO.items() if k != "type"}
            self.assertEqual(pr.persistir_chequeos(conn, [chequeo, chequeo], self.mapa), 4)
        finally:
            conn.close()
        filas = self.lecturas_de(self.ana)
        self.assertEqual(sorted((f["indicador"], f["valor"]) for f in filas),
                         [("frecuencia_cardiaca_reposo", 81.0), ("spo2", 98.0)])
        self.assertTrue(all(f["origen"] == "sensor" and f["naturaleza"] == "Real" and f["metodo"] == "galaxy_watch4"
                            for f in filas))

    def test_metodo_lleva_el_dispositivo(self):
        conn = conectar()
        try:
            pr.persistir_chequeos(conn, [dict(CHEQUEO, dispositivo="gw-77950ea2")], self.mapa)
        finally:
            conn.close()
        self.assertEqual({f["metodo"] for f in self.lecturas_de(self.ana)}, {"galaxy_watch4:gw-77950ea2"})

    def test_no_valido_o_desconocido_no_se_guarda(self):
        conn = conectar()
        try:
            malos = [dict(CHEQUEO, valido=False), dict(CHEQUEO, tripulante="Sin nombre"), dict(CHEQUEO, t="nada")]
            self.assertEqual(pr.persistir_chequeos(conn, malos, self.mapa), 0)
            # sin mapa se usa el alias de la base
            self.assertEqual(pr.persistir_chequeos(conn, [dict(CHEQUEO, tripulante="Astronauta")], {}), 2)
        finally:
            conn.close()

    def test_nombres_por_defecto_nunca_se_guardan(self):
        conn = conectar()
        try:
            defecto = [dict(CHEQUEO, tripulante="Tripulante 7f3a"), dict(CHEQUEO, tripulante="Tripulante previo")]
            self.assertEqual(pr.persistir_chequeos(conn, defecto, {"tripulante 7f3a": self.ana}, registrar=True), 0)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM tripulante").fetchone()[0], len(self.ids))
        finally:
            conn.close()

    def test_reloj_desconocido_no_se_da_de_alta_salvo_autoregistro(self):
        conn = conectar()
        try:
            self.assertEqual(pr.persistir_chequeos(conn, [dict(CHEQUEO, tripulante="Marcos")], self.mapa), 0)
            self.assertIsNone(pr.resolver_id(conn, "marcos", {}))
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM tripulante WHERE alias = 'Marcos'").fetchone()[0], 0)
            # con SMART_AUTOREGISTRO=1 (registrar) sí: rol astronauta y una sola vez
            self.assertEqual(pr.persistir_chequeos(conn, [dict(CHEQUEO, tripulante="Marcos")], self.mapa, registrar=True), 2)
            id_ = pr.resolver_id(conn, "marcos", {})
            self.assertNotIn(id_, self.ids.values())
            self.assertEqual(pr.persistir_chequeos(conn, [dict(CHEQUEO, tripulante="Marcos")], self.mapa, registrar=True), 2)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM tripulante WHERE alias = 'Marcos'").fetchone()[0], 1)
            self.assertEqual(conn.execute("SELECT rol FROM tripulante WHERE id = ?", (id_,)).fetchone()[0], "astronauta")
        finally:
            conn.close()
        self.assertEqual(len(self.lecturas_de(id_)), 2)

    def test_vinculo_en_la_base_resuelve_el_nombre(self):
        conn = conectar()
        try:
            conn.execute("INSERT INTO reloj_vinculo VALUES ('Seba Reloj', ?, '2026-11-15T00:00:00Z')", (self.ana,))
            conn.commit()
            self.assertEqual(pr.mapa_completo(conn, {"ana": 7}), {"ana": 7, "galaxy fernando": self.ids["fernando"], "seba reloj": self.ana})
            self.assertEqual(pr.resolver_id(conn, "SEBA RELOJ", {}), self.ana)
            self.assertEqual(sorted(pr.nombres_de(conn, self.ana, {})), ["astronauta", "seba reloj"])
            self.assertEqual(pr.persistir_chequeos(conn, [dict(CHEQUEO, tripulante="Seba Reloj")], {}), 2)
        finally:
            conn.close()

    def test_dos_relojes_con_el_mismo_nombre_no_se_guardan_y_avisan(self):
        puente = pr.Puente("ws://x", pr.EstadoReloj(), self.mapa)
        puente.recibir(json.dumps({"type": "tripulacion", "miembros": [
            {"tripulante": "Sebastián", "conectado": True, "relojes_conectados": 2}]}))
        puente.recibir(json.dumps(CHEQUEO))
        puente.recibir(json.dumps({"type": "chequeos", "tripulante": "Sebastián", "items": [dict(CHEQUEO, t="2026-11-13T19:19:18Z")]}))
        self.assertEqual(self.lecturas_de(self.ana), [])
        avisos = puente.estado.de_tripulante(["sebastián"])["avisos"]
        self.assertEqual([(a["tipo"], a["codigo"]) for a in avisos], [("puente", "relojes_duplicados")] * 2)
        puente.recibir(json.dumps({"type": "tripulacion", "miembros": [
            {"tripulante": "Sebastián", "conectado": True, "relojes_conectados": 1}]}))
        puente.recibir(json.dumps(CHEQUEO))
        self.assertEqual(len(self.lecturas_de(self.ana)), 2)
        self.assertEqual(puente.recibir("esto no es json"), 0)


class Rutas(Base):
    def setUp(self):
        super().setUp()
        self.c = TestClient(main.app)
        self.h = {"X-Tripulante": str(self.ana)}
        os.environ["SMART_TRIPULANTES"] = f"Sebastián={self.ana}"

    def test_estado_sin_configurar(self):
        r = self.c.get("/reloj/estado").json()
        self.assertEqual((r["configurado"], r["desactivado"], r["conectado"]), (False, False, False))
        self.assertEqual((r["url_live"], r["url_reloj_sugerida"], r["avisos"]), (None, None, []))
        self.assertIn("ip_lan", r)

    def test_estado_con_puente_y_avisos_globales(self):
        pr.PUENTE = pr.Puente("ws://127.0.0.1:8765/live", pr.ESTADO, self.mapa)
        pr.PUENTE.estado.error = "ConnectionRefusedError: [Errno 111]"
        pr.ESTADO.aplicar({"type": "aviso", "detalle": "Tolerancia inválida"})
        r = self.c.get("/reloj/estado").json()
        self.assertEqual((r["configurado"], r["conectado"], r["url_live"]), (True, False, "ws://127.0.0.1:8765/live"))
        self.assertTrue(r["error"].startswith("ConnectionRefusedError"))
        self.assertEqual(r["avisos"][0]["detalle"], "Tolerancia inválida")
        self.assertEqual(r["url_reloj_sugerida"], pr.url_reloj_sugerida("ws://127.0.0.1:8765/live", r["ip_lan"]))

    def test_reloj_del_tripulante_y_privacidad(self):
        r = self.c.get(f"/tripulantes/{self.ana}/reloj", headers=self.h).json()
        self.assertEqual((r["vinculado"], r["reloj"], sorted(r["nombres"])), (False, None, ["astronauta", "sebastián"]))
        pr.ESTADO.aplicar({"type": "lectura", "tripulante": "Sebastián", "t": "2026-11-14T18:48:57Z", "fc_lpm": 70})
        r = self.c.get(f"/tripulantes/{self.ana}/reloj", headers=self.h).json()
        self.assertEqual((r["vinculado"], r["reloj"]["fc_lpm"]), (True, 70))
        self.assertLess(r["reloj"]["recibido_hace_s"], 5)
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/reloj").status_code, 401)
        otro = {"X-Tripulante": str(self.ids["oficial_medico"])}
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/reloj", headers=otro).status_code, 403)

    def test_reloj_no_vinculado_no_se_ve_aunque_este_en_memoria(self):
        pr.ESTADO.aplicar({"type": "lectura", "tripulante": "Tripulante 7f3a", "t": "2026-11-14T18:48:57Z", "fc_lpm": 70})
        pr.ESTADO.aplicar({"type": "lectura", "tripulante": "Marcos", "t": "2026-11-14T18:48:57Z", "fc_lpm": 71})
        r = self.c.get(f"/tripulantes/{self.ana}/reloj", headers=self.h).json()
        self.assertEqual((r["vinculado"], r["reloj"]), (False, None))
        filas = self.c.get("/reloj/tripulacion", headers=self.h).json()
        self.assertEqual([(f["nombre"], f["vinculado"], f["tripulante_id"], f["nombre_por_defecto"]) for f in filas],
                         [("Marcos", False, None, False), ("Tripulante 7f3a", False, None, True)])

    def test_vincular_y_desvincular_desde_la_api(self):
        ruta = f"/tripulantes/{self.ana}/reloj/vinculo"
        pr.ESTADO.aplicar({"type": "lectura", "tripulante": "Seba GW", "t": "2026-11-14T18:48:57Z", "fc_lpm": 70})
        self.assertEqual(self.c.post(ruta, json={"nombre": " Seba GW "}).status_code, 401)
        otro = {"X-Tripulante": str(self.ids["oficial_medico"])}
        self.assertEqual(self.c.post(ruta, json={"nombre": "Seba GW"}, headers=otro).status_code, 403)
        self.assertEqual(self.c.post(ruta, json={"nombre": "Tripulante 7f3a"}, headers=self.h).status_code, 422)
        self.assertEqual(self.c.post(ruta, json={"nombre": "  "}, headers=self.h).status_code, 422)
        r = self.c.post(ruta, json={"nombre": " Seba GW "}, headers=self.h)
        self.assertEqual(r.status_code, 201)
        self.assertEqual((r.json()["nombre"], r.json()["tripulante_id"]), ("Seba GW", self.ana))
        self.assertEqual(self.c.post(ruta, json={"nombre": "seba gw"}, headers=self.h).status_code, 201)  # repetir: ok
        reloj = self.c.get(f"/tripulantes/{self.ana}/reloj", headers=self.h).json()
        self.assertEqual((reloj["vinculado"], reloj["reloj"]["fc_lpm"]), (True, 70))
        self.assertIn("seba gw", reloj["nombres"])
        fila = next(f for f in self.c.get("/reloj/tripulacion", headers=self.h).json() if f["nombre"] == "Seba GW")
        self.assertEqual((fila["vinculado"], fila["tripulante_id"]), (True, self.ana))
        self.assertNotIn("70", str(fila))
        # el mismo nombre no puede ir a otro tripulante (ni por vínculo ni por SMART_TRIPULANTES)
        medico = self.ids["oficial_medico"]
        self.assertEqual(self.c.post(f"/tripulantes/{medico}/reloj/vinculo", json={"nombre": "SEBA GW"}, headers=otro).status_code, 409)
        self.assertEqual(self.c.post(f"/tripulantes/{medico}/reloj/vinculo", json={"nombre": "Sebastián"}, headers=otro).status_code, 409)
        # desde ahora sus chequeos se persisten como lecturas del tripulante
        puente = pr.Puente("ws://x", pr.ESTADO, {})
        puente.recibir(json.dumps(dict(CHEQUEO, tripulante="Seba GW", dispositivo="gw-1")))
        self.assertEqual({f["metodo"] for f in self.lecturas_de(self.ana)}, {"galaxy_watch4:gw-1"})
        self.assertEqual(self.c.delete(ruta, headers=otro).status_code, 403)
        self.assertEqual(self.c.delete(ruta + "?nombre=otro", headers=self.h).json(), {"eliminados": 0})
        self.assertEqual(self.c.delete(ruta, headers=self.h).json(), {"eliminados": 1})
        self.assertFalse(self.c.get(f"/tripulantes/{self.ana}/reloj", headers=self.h).json()["vinculado"])
        self.assertEqual(len(self.lecturas_de(self.ana)), 2)  # las lecturas guardadas no se tocan

    def test_orden_sin_puente_da_503_y_tipo_invalido_422(self):
        ruta = f"/tripulantes/{self.ana}/reloj/ordenes"
        self.assertEqual(self.c.post(ruta, json={"tipo": "medir_spo2"}, headers=self.h).status_code, 503)
        self.assertEqual(self.c.post(ruta, json={"tipo": "borrar_todo"}, headers=self.h).status_code, 422)

    def test_tripulacion_y_config_por_api(self):
        self.assertEqual(self.c.get("/reloj/tripulacion").status_code, 401)
        pr.ESTADO.aplicar({"type": "tripulacion", "miembros": [{"tripulante": "Sebastián", "conectado": True}]})
        fila = self.c.get("/reloj/tripulacion", headers=self.h).json()[0]
        self.assertEqual((fila["nombre"], fila["vinculado"], fila["tripulante_id"]), ("Sebastián", True, self.ana))
        self.assertEqual(self.c.get("/reloj/config").json(), {"tolerancia": None, "presets": None})
        self.assertEqual(self.c.put("/reloj/config", json={"preset": "flexible"}, headers=self.h).status_code, 503)
        self.assertEqual(self.c.put("/reloj/config", json={"preset": "otra"}, headers=self.h).status_code, 422)
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/reloj/export.csv", headers=self.h).status_code, 503)


class ExtremoAExtremo(Base):
    """Un `/live` falso que habla el protocolo de smart-monitor: el puente recibe, guarda y reenvía órdenes."""

    def test_puente_contra_servidor_falso(self):
        try:
            import websockets
        except ImportError:
            self.skipTest("websockets no está instalado (pip install -r requirements.txt)")
        recibidas = []

        async def servidor(ws):
            await ws.send(json.dumps({"type": "tripulacion", "miembros": [{"tripulante": "Sebastián", "conectado": True}]}))
            await ws.send(json.dumps(dict(CHEQUEO, dispositivo="gw-77950ea2")))
            recibidas.append(json.loads(await ws.recv()))
            recibidas.append(json.loads(await ws.recv()))
            await ws.wait_closed()

        async def escenario():
            async with websockets.serve(servidor, "127.0.0.1", 0) as srv:
                puerto = srv.sockets[0].getsockname()[1]
                puente = pr.Puente(f"ws://127.0.0.1:{puerto}/live", pr.EstadoReloj(), self.mapa)
                tarea = asyncio.create_task(puente.correr())
                for _ in range(100):
                    if puente.estado.de_tripulante(["sebastián"]) and puente.estado.de_tripulante(["sebastián"])["chequeos"]:
                        break
                    await asyncio.sleep(0.02)
                self.assertTrue(await puente.enviar({"type": "medir_spo2", "tripulante": "Sebastián"}))
                self.assertTrue(await puente.enviar({"type": "set_config", "tolerancia": {"preset": "flexible"}}))
                for _ in range(100):
                    if len(recibidas) == 2 and len(self.lecturas_de(self.ana)) == 2:  # la escritura va en otro hilo
                        break
                    await asyncio.sleep(0.02)
                tarea.cancel()
                return puente

        puente = asyncio.run(escenario())
        self.assertEqual(recibidas, [{"type": "medir_spo2", "tripulante": "Sebastián"},
                                     {"type": "set_config", "tolerancia": {"preset": "flexible"}}])
        self.assertTrue(puente.estado.de_tripulante(["sebastián"])["conectado"])
        self.assertEqual({(f["indicador"], f["metodo"]) for f in self.lecturas_de(self.ana)},
                         {("frecuencia_cardiaca_reposo", "galaxy_watch4:gw-77950ea2"), ("spo2", "galaxy_watch4:gw-77950ea2")})

    def test_correr_sin_servidor_reintenta_y_expone_el_error(self):
        try:
            import websockets  # noqa: F401
        except ImportError:
            self.skipTest("websockets no está instalado")
        puente = pr.Puente("ws://127.0.0.1:1/live", pr.EstadoReloj(), self.mapa)  # puerto cerrado

        async def escenario():
            tarea = asyncio.create_task(puente.correr())
            limite = time.monotonic() + 5
            while puente.estado.error is None and time.monotonic() < limite:
                await asyncio.sleep(0.02)
            tarea.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await tarea

        asyncio.run(escenario())
        self.assertFalse(puente.estado.conectado)
        self.assertTrue(puente.estado.error)


if __name__ == "__main__":
    unittest.main()
