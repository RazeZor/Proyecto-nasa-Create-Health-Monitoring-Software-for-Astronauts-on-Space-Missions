import asyncio
import json
import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import main
from almacen import conectar, lecturas, migrar
from almacen import tripulacion as tr

pr = main.puente_reloj  # main agrega packages/i18n al path antes de importarlo

CHEQUEO = {"type": "chequeo", "tripulante": "Sebastián", "t": "2026-11-14T19:19:18Z", "duracion_s": 60,
           "fc_reposo_lpm": 81, "rmssd_ms": 28.5, "spo2_pct": 98, "valido": True, "motivo": None}


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
        for v in ("VIGIA_DB", "VIGIA_RELOJ_SEG", "SMART_URL", "SMART_TRIPULANTES"):
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

    def test_chequeo_reemplaza_el_mismo_t_y_limpia_la_fase(self):
        e = pr.EstadoReloj()
        e.aplicar({"type": "chequeo_estado", "tripulante": "Sebastián", "detalle": "midiendo"})
        self.assertEqual(e.aplicar(CHEQUEO), [{k: v for k, v in CHEQUEO.items() if k != "type"}])
        e.aplicar(CHEQUEO)
        r = e.de_tripulante(["sebastián"])
        self.assertEqual(len(r["chequeos"]), 1)
        self.assertIsNone(r["chequeo_estado"])

    def test_tripulacion_solo_dato_minimo_y_config(self):
        e = pr.EstadoReloj()
        e.aplicar({"type": "tripulacion", "miembros": [
            {"tripulante": "Sebastián", "conectado": True, "fc_lpm": 72, "relojes_conectados": 2,
             "ultima_lectura": "2026-11-14T18:48:57Z", "chequeo_hoy": {"valido": True, "fc_reposo_lpm": 64}},
            {"tripulante": "Ana", "conectado": False}]})
        filas = e.tripulacion()
        self.assertEqual([f["nombre"] for f in filas], ["Ana", "Sebastián"])
        self.assertEqual(filas[1], {"nombre": "Sebastián", "conectado": True, "relojes_conectados": 2,
                                    "ultima_lectura": "2026-11-14T18:48:57Z", "chequeo_hoy": True})
        self.assertNotIn("72", str(filas))  # ningún valor fisiológico
        self.assertIsNone(filas[0]["chequeo_hoy"])
        e.aplicar({"type": "config", "tolerancia": {"preset": "normal"}, "presets": {"normal": {}}})
        e.aplicar({"type": "config", "tolerancia": {"preset": "flexible"}})  # al reloj no le llegan presets
        self.assertEqual(e.config, {"tolerancia": {"preset": "flexible"}, "presets": {"normal": {}}})

    def test_url_http(self):
        self.assertEqual(pr.url_http("wss://smart.ejemplo.dev/live", "export.csv"), "https://smart.ejemplo.dev/export.csv")
        self.assertEqual(pr.url_http("ws://127.0.0.1:8765/live", "/export.csv"), "http://127.0.0.1:8765/export.csv")


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

    def test_no_valido_o_desconocido_no_se_guarda(self):
        conn = conectar()
        try:
            malos = [dict(CHEQUEO, valido=False), dict(CHEQUEO, tripulante="Sin nombre"), dict(CHEQUEO, t="nada")]
            self.assertEqual(pr.persistir_chequeos(conn, malos, self.mapa), 0)
            # sin mapa se usa el alias de la base
            self.assertEqual(pr.persistir_chequeos(conn, [dict(CHEQUEO, tripulante="Astronauta")], {}), 2)
        finally:
            conn.close()

    def test_reloj_nuevo_queda_con_su_id_de_tripulante(self):
        conn = conectar()
        try:
            self.assertEqual(pr.persistir_chequeos(conn, [dict(CHEQUEO, tripulante="Fernando")], self.mapa), 2)
            id_ = pr.resolver_id(conn, "fernando", {})
            self.assertNotIn(id_, self.ids.values())
            self.assertEqual(pr.persistir_chequeos(conn, [dict(CHEQUEO, tripulante="Fernando")], self.mapa), 2)  # idempotente
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM tripulante WHERE alias = 'Fernando'").fetchone()[0], 1)
            self.assertEqual(conn.execute("SELECT rol FROM tripulante WHERE id = ?", (id_,)).fetchone()[0], "astronauta")
        finally:
            conn.close()
        self.assertEqual(len(self.lecturas_de(id_)), 2)


class Rutas(Base):
    def setUp(self):
        super().setUp()
        self.c = TestClient(main.app)
        self.h = {"X-Tripulante": str(self.ana)}
        os.environ["SMART_TRIPULANTES"] = f"Sebastián={self.ana}"

    def test_estado_sin_configurar(self):
        r = self.c.get("/reloj/estado").json()
        self.assertEqual((r["configurado"], r["conectado"]), (False, False))

    def test_reloj_del_tripulante_y_privacidad(self):
        self.assertFalse(self.c.get(f"/tripulantes/{self.ana}/reloj", headers=self.h).json()["vinculado"])
        pr.ESTADO.aplicar({"type": "lectura", "tripulante": "Sebastián", "t": "2026-11-14T18:48:57Z", "fc_lpm": 70})
        r = self.c.get(f"/tripulantes/{self.ana}/reloj", headers=self.h).json()
        self.assertEqual((r["vinculado"], r["reloj"]["fc_lpm"]), (True, 70))
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/reloj").status_code, 401)
        otro = {"X-Tripulante": str(self.ids["oficial_medico"])}
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/reloj", headers=otro).status_code, 403)

    def test_orden_sin_puente_da_503_y_tipo_invalido_422(self):
        ruta = f"/tripulantes/{self.ana}/reloj/ordenes"
        self.assertEqual(self.c.post(ruta, json={"tipo": "medir_spo2"}, headers=self.h).status_code, 503)
        self.assertEqual(self.c.post(ruta, json={"tipo": "borrar_todo"}, headers=self.h).status_code, 422)

    def test_tripulacion_y_config_por_api(self):
        self.assertEqual(self.c.get("/reloj/tripulacion").status_code, 401)
        pr.ESTADO.aplicar({"type": "tripulacion", "miembros": [{"tripulante": "Sebastián", "conectado": True}]})
        self.assertEqual(self.c.get("/reloj/tripulacion", headers=self.h).json()[0]["nombre"], "Sebastián")
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
            await ws.send(json.dumps(CHEQUEO))
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
                    if len(recibidas) == 2:
                        break
                    await asyncio.sleep(0.02)
                tarea.cancel()
                return puente

        puente = asyncio.run(escenario())
        self.assertEqual(recibidas, [{"type": "medir_spo2", "tripulante": "Sebastián"},
                                     {"type": "set_config", "tolerancia": {"preset": "flexible"}}])
        self.assertTrue(puente.estado.de_tripulante(["sebastián"])["conectado"])
        self.assertEqual({f["indicador"] for f in self.lecturas_de(self.ana)}, {"frecuencia_cardiaca_reposo", "spo2"})


if __name__ == "__main__":
    unittest.main()
