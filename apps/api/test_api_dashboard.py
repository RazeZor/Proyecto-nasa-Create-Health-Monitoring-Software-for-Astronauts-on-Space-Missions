import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import main
from almacen import cola, conectar, migrar
from almacen import tripulacion as tr

T = "2026-11-14T08:00:00Z"


class Dashboard(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["VIGIA_DB"] = str(Path(self.tmp.name) / "vigia.db")
        os.environ["DATALAKE_DIR"] = self.tmp.name  # sin gold publicado: los tests no leen el datalake local
        conn = conectar()
        migrar(conn)
        self.ids = tr.sembrar_demo(conn)
        self.ana, self.med = self.ids["astronauta"], self.ids["oficial_medico"]
        conn.close()
        self.c = TestClient(main.app)
        self.h = {"X-Tripulante": str(self.ana)}

    def tearDown(self):
        del os.environ["VIGIA_DB"], os.environ["DATALAKE_DIR"]
        self.tmp.cleanup()

    def test_fichas_lista_y_una(self):
        fichas = self.c.get("/fichas").json()
        self.assertIn("spo2", [f["id"] for f in fichas])
        self.assertNotIn("index", [f["id"] for f in fichas])
        self.assertEqual(self.c.get("/fichas/spo2").json()["id"], "spo2")
        self.assertEqual(self.c.get("/fichas/no-existe").status_code, 404)
        en = self.c.get("/fichas/spo2?lang=en").json()  # mismos campos y fuentes; solo cambian los textos
        es = self.c.get("/fichas/spo2").json()
        self.assertEqual((set(en), [f["url"] for f in en["fuentes"]]), (set(es), [f["url"] for f in es["fuentes"]]))
        self.assertNotEqual(en["que_es"], es["que_es"])
        self.assertEqual(len(self.c.get("/fichas?lang=en").json()), len(fichas))
        self.assertEqual(self.c.get("/fichas/..%2Fperfiles").status_code, 404)  # sin rutas arbitrarias

    def test_referencia_de_entorno(self):
        r = self.c.get("/entorno/referencia").json()
        self.assertEqual((r["limite_carrera_msv"], r["co2_limite_mmhg"], r["umbral_protones_pfu"]), (600, 3, 10))
        self.assertEqual({f["id"] for f in r["fuentes"]}, {"radlab", "eda", "donki", "goes"})
        self.assertEqual(r["naturaleza_dosis_previa"], "Simulado")

    def test_historial_demo_es_el_caso_de_referencia_simulado(self):
        r = self.c.get(f"/tripulantes/{self.ana}/historial?modo=demo", headers=self.h)
        self.assertEqual(r.status_code, 200)
        h = r.json()
        self.assertEqual((h["modo"], h["naturaleza"], h["dias_vuelo"], h["dia_actual"]), ("demo", "Simulado", 30, 27))
        self.assertEqual(len(h["lecturas"]), 44)  # 14 de prevuelo + 30 de vuelo
        self.assertEqual(len(h["entorno_diario"]), 30)
        dia12 = h["entorno_diario"][11]  # anomalía A2 inyectada: va rotulada Simulado
        self.assertEqual((dia12["co2_mmhg_max_horario"], dia12["co2_origen"]["naturaleza"]), (4.6, "Simulado"))

    def test_historial_real_sin_registros_no_inventa_lecturas(self):
        h = self.c.get(f"/tripulantes/{self.ana}/historial", headers=self.h).json()
        self.assertEqual((h["modo"], h["naturaleza"], h["lecturas"], h["entorno_diario"]), ("real", "Real", [], []))
        self.assertGreaterEqual(h["dia_actual"], 1)
        self.assertGreaterEqual(h["dias_vuelo"], 30)

    def test_historial_real_agrupa_lo_ingresado_por_dia_de_mision(self):
        def lectura(indicador, valor, t_real, **extra):
            return self.c.post(f"/tripulantes/{self.ana}/lecturas", headers=self.h,
                               json={"indicador": indicador, "valor": valor, "t_real": t_real, "naturaleza": "Real", **extra})
        lectura("spo2", 97, "2026-11-14T08:00:00Z")
        lectura("spo2", 95, "2026-11-14T20:00:00Z")  # la última del día manda
        lectura("frecuencia_cardiaca_reposo", 61, "2026-11-15T08:00:00Z", origen="sensor", metodo="galaxy_watch4:gw")
        lectura("sueno", 7.5, "2026-11-12T08:00:00Z")  # antes del día 1: prevuelo
        lectura("spo2", 80, "2026-11-16T08:00:00Z", naturaleza="Simulado")  # no es un dato real: no entra
        self.c.post(f"/tripulantes/{self.ana}/sintomas", headers=self.h,
                    json={"codigo": "cefalea", "gravedad": 1, "t_real": "2026-11-14T08:00:00Z"})
        h = self.c.get(f"/tripulantes/{self.ana}/historial?modo=real", headers=self.h).json()
        por_dia = {f["dia_mision"]: f for f in h["lecturas"]}
        self.assertEqual(sorted(por_dia), [-1, 1, 2])
        self.assertEqual((por_dia[1]["spo2_pct"], por_dia[1]["fc_reposo_lpm"], por_dia[1]["sintomas"]), (95.0, None, ["cefalea"]))
        self.assertEqual(por_dia[1]["t_real"], "2026-11-14T20:00:00Z")
        self.assertEqual((por_dia[2]["fc_reposo_lpm"], por_dia[2]["fc_instrumento"]), (61.0, "galaxy_watch4:gw"))
        self.assertEqual((por_dia[-1]["sueno_h"], h["dias_prevuelo"]), (7.5, 1))

    def test_tripulacion_de_la_mision(self):
        t = self.c.get("/tripulacion", headers=self.h).json()
        self.assertEqual({x["rol"] for x in t}, {"astronauta", "oficial_medico", "comandante"})
        self.assertEqual(self.c.get("/tripulacion").status_code, 401)

    def test_historial_y_demo_ajenos_dan_403(self):
        for ruta in ("historial", "recordatorios", "mensajes"):
            self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/{ruta}", headers={"X-Tripulante": str(self.med)}).status_code, 403, ruta)
            self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/{ruta}").status_code, 401, ruta)

    def test_recordatorios_y_mensajes(self):
        rec = self.c.get(f"/tripulantes/{self.ana}/recordatorios", headers=self.h).json()
        self.assertTrue(rec and all(isinstance(x, str) for x in rec))
        self.assertEqual(len(self.c.get(f"/tripulantes/{self.ana}/recordatorios?lang=en", headers=self.h).json()), len(rec))
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/mensajes", headers=self.h).json(), [])  # real: sin hilo de ejemplo
        msj = self.c.get(f"/tripulantes/{self.ana}/mensajes?modo=demo", headers=self.h).json()
        self.assertTrue(msj)
        self.assertEqual(set(msj[0]), {"id", "de", "autor", "dia", "hora", "texto"})

    def test_mensajes_incluyen_las_respuestas_reales_de_tierra(self):
        conn = conectar()
        rid = cola.encolar_reporte(conn, self.ana, T, 0)
        cola.avanzar_cola(conn, T)
        cola.responder_reporte(conn, rid, "Recibido, sigue el protocolo.", T)
        conn.close()
        textos = [m["texto"] for m in self.c.get(f"/tripulantes/{self.ana}/mensajes", headers=self.h).json()]
        self.assertIn("Recibido, sigue el protocolo.", textos)

    def test_reporte_guarda_y_devuelve_su_contenido(self):
        contenido = {"titulo": "Informe diario · Día 24", "resumen": "Ámbar", "lectura": "FC 70 lpm"}
        r = self.c.post(f"/tripulantes/{self.ana}/reportes", headers=self.h,
                        json={"creado_t_real": T, "retardo_min": 1, "contenido": contenido})
        self.assertEqual(r.status_code, 201)
        (f,) = self.c.get(f"/tripulantes/{self.ana}/reportes", headers=self.h).json()
        self.assertEqual(f["contenido"], contenido)

    def test_reporte_sin_contenido_sigue_valiendo(self):
        self.c.post(f"/tripulantes/{self.ana}/reportes", headers=self.h, json={"creado_t_real": T, "retardo_min": 1})
        (f,) = self.c.get(f"/tripulantes/{self.ana}/reportes", headers=self.h).json()
        self.assertIsNone(f["contenido"])

    def test_sembrar_informes_demo_es_idempotente(self):
        conn = conectar()
        tr.sembrar_informes_demo(conn, self.ids)
        tr.sembrar_informes_demo(conn, self.ids)
        (f,) = cola.leer_reportes(conn, self.ana)
        conn.close()
        self.assertEqual((f["estado"], f["contenido"]["titulo"]), ("respondido", "Informe diario · Día 23"))


class Entorno(unittest.TestCase):
    """El entorno que evalúa el motor sale del panel gold (medición real reanclada), con su fuente y fecha real."""

    PANEL = {"escenario": "x", "aviso": "aviso", "dosis": None,
             "ventanas": [{"fuente": "eda", "desde": "2014-09-21T00:00:00Z", "hasta": "2014-09-26T00:00:00Z", "dia_mision": 18},
                          {"fuente": "goes", "desde": "2026-11-13T00:00:00Z", "hasta": "2026-11-15T00:00:00Z", "dia_mision": 12},
                          {"fuente": "donki", "desde": "2024-05-09T00:00:00Z", "hasta": "2024-05-14T00:00:00Z", "dia_mision": 18}],
             "cabina": [{"dia_mision": 12, "mision": "RR-1", "co2_ppm_promedio_horario_max": 2900.0},
                        {"dia_mision": 19, "mision": "RR-1", "co2_ppm_promedio_horario_max": 2950.5}],
             "protones": [{"dia_mision": 12, "serie": "G18 >=10 MeV", "max_pfu": 0.31, "modo_tormenta": False},
                          {"dia_mision": 12, "serie": "G18 >=100 MeV", "max_pfu": 0.1, "modo_tormenta": False},
                          {"dia_mision": 22, "serie": "G18 >=10 MeV", "max_pfu": 0.4, "modo_tormenta": False}],
             "eventos": [{"t_mision": "D018T13:59:00", "t_real": "2024-05-09T13:59:00Z", "sepID": "SEP-1", "link": "http://x"}]}

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["VIGIA_DB"] = str(Path(self.tmp.name) / "vigia.db")
        os.environ["DATALAKE_DIR"] = self.tmp.name
        conn = conectar()
        migrar(conn)
        self.ana = tr.sembrar_demo(conn)["astronauta"]
        conn.close()
        self.c = TestClient(main.app)
        self.h = {"X-Tripulante": str(self.ana)}
        carpeta = Path(self.tmp.name) / "gold"
        carpeta.mkdir()
        manifiesto = {}
        for nombre in ("mision-real", "mision-vigia"):
            contenido = json.dumps({**self.PANEL, "escenario": nombre}).encode()
            (carpeta / f"panel-{nombre}.json").write_bytes(contenido)
            manifiesto[f"panel-{nombre}"] = {"sha256": hashlib.sha256(contenido).hexdigest(), "dosis": False}
        (carpeta / "manifest.json").write_text(json.dumps(manifiesto))

    def tearDown(self):
        del os.environ["VIGIA_DB"], os.environ["DATALAKE_DIR"]
        self.tmp.cleanup()

    def entorno(self, modo):
        h = self.c.get(f"/tripulantes/{self.ana}/historial?modo={modo}", headers=self.h).json()
        return h, {e["dia_mision"]: e for e in h["entorno_diario"]}

    def test_modo_real_solo_trae_mediciones_reales_con_fuente_y_fecha(self):
        h, e = self.entorno("real")
        self.assertEqual((h["escenario_entorno"], h["aviso_entorno"]), ("mision-real", "aviso"))
        self.assertEqual(sorted(e), [12, 18, 19, 22])
        self.assertEqual(e[19]["co2_ppm_max_horario"], 2950.5)
        self.assertIsNone(e[19]["co2_mmhg_max_horario"])  # la conversión depende del perfil: la hace la app
        self.assertEqual(e[19]["co2_origen"], {"naturaleza": "Real", "fuente": "EDA RR-1 (NASA OSDR)", "fecha_real": "2014-09-22"})
        self.assertEqual((e[12]["flujo_protones_10mev_pfu"], e[12]["flujo_origen"]["fecha_real"]), (0.31, "2026-11-13"))
        self.assertTrue(e[18]["modo_tormenta"])  # evento SEP real de DONKI
        self.assertEqual(e[18]["eventos_sep"][0]["sepID"], "SEP-1")
        self.assertFalse(e[19]["modo_tormenta"])

    def test_modo_demo_mezcla_real_y_anomalias_simuladas_rotuladas(self):
        _, e = self.entorno("demo")
        self.assertEqual(len(e), 30)
        self.assertEqual(e[19]["co2_origen"]["naturaleza"], "Real")
        self.assertEqual((e[12]["co2_mmhg_max_horario"], e[12]["co2_origen"]["naturaleza"]), (4.6, "Simulado"))  # A2 manda
        self.assertEqual(e[12]["flujo_origen"]["naturaleza"], "Real")
        self.assertEqual((e[22]["flujo_protones_10mev_pfu"], e[22]["flujo_origen"]["naturaleza"]), (200.0, "Simulado"))  # A3 manda
        self.assertEqual(e[1]["co2_origen"]["naturaleza"], "Simulado")
        self.assertTrue(e[18]["modo_tormenta"])

    def test_gold_alterado_no_se_usa(self):
        (Path(self.tmp.name) / "gold" / "panel-mision-real.json").write_text("{}")
        h, e = self.entorno("real")
        self.assertEqual((h["escenario_entorno"], e), (None, {}))


if __name__ == "__main__":
    unittest.main()
