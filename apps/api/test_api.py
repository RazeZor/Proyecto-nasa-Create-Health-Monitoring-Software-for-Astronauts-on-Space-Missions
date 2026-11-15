import hashlib
import json
import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import main

SERIE = [{"t_mision": "D022T00:00:00", "fuente": "radlab", "variable": "absorbed_dose_rate", "valor": 1.0},
         {"t_mision": "D023T00:00:00", "fuente": "goes", "variable": "flux", "valor": 2.0}]


class Api(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["DATALAKE_DIR"] = self.tmp.name
        self.gold = Path(self.tmp.name) / "gold"
        self.gold.mkdir()
        self.cliente = TestClient(main.app)
        self.publicar("ejemplo", {"escenario": "ejemplo", "serie5min": SERIE, "diario": []})
        self.publicar("panel-x", {"escenario": "x", "dosis": None, "protones": [], "cabina": [], "eventos": []})

    def tearDown(self):
        del os.environ["DATALAKE_DIR"]
        self.tmp.cleanup()

    def publicar(self, clave, datos):
        contenido = json.dumps(datos).encode()
        (self.gold / f"{clave}.json").write_bytes(contenido)
        ruta = self.gold / "manifest.json"
        manifiesto = json.loads(ruta.read_text()) if ruta.exists() else {}
        resumen = {"serie5min": len(datos["serie5min"])} if "serie5min" in datos else {"dosis": datos["dosis"] is not None}
        manifiesto[clave] = {"sha256": hashlib.sha256(contenido).hexdigest(), **resumen}
        ruta.write_text(json.dumps(manifiesto))

    def test_listar_separa_escenarios_y_paneles(self):
        self.assertEqual(self.cliente.get("/escenarios").json(), ["ejemplo"])
        self.assertEqual(self.cliente.get("/paneles").json(), ["x"])

    def test_panel_y_secciones(self):
        self.assertEqual(self.cliente.get("/paneles/x").json()["escenario"], "x")
        self.assertEqual(self.cliente.get("/paneles/x/protones").json(), [])
        self.assertIsNone(self.cliente.get("/paneles/x/dosis").json())
        self.assertEqual(self.cliente.get("/paneles/x/nada").status_code, 422)

    def test_escenario_serie_y_filtros(self):
        r = self.cliente.get("/escenarios/ejemplo", params={"fuente": "goes"}).json()
        self.assertEqual([f["valor"] for f in r["serie5min"]], [2.0])
        serie = self.cliente.get("/escenarios/ejemplo/serie", params={"dia_mision": 22}).json()
        self.assertEqual([f["valor"] for f in serie], [1.0])
        self.assertEqual(self.cliente.get("/escenarios/ejemplo/diario").json(), [])

    def test_un_tipo_no_se_sirve_como_el_otro(self):
        self.assertEqual(self.cliente.get("/escenarios/x").status_code, 404)  # x es panel
        self.assertEqual(self.cliente.get("/paneles/ejemplo").status_code, 404)  # ejemplo es escenario

    def test_escenario_que_se_llama_panel(self):
        # el escenario de la demo se llama "panel-demo": su panel es "panel-panel-demo"
        self.publicar("panel-demo", {"escenario": "panel-demo", "serie5min": [], "diario": []})
        self.publicar("panel-panel-demo", {"escenario": "panel-demo", "dosis": None})
        self.assertIn("panel-demo", self.cliente.get("/escenarios").json())
        self.assertIn("panel-demo", self.cliente.get("/paneles").json())
        self.assertIn("serie5min", self.cliente.get("/escenarios/panel-demo").json())
        self.assertIn("dosis", self.cliente.get("/paneles/panel-demo").json())

    def test_clave_desconocida_o_ruta_no_se_sirve(self):
        self.assertEqual(self.cliente.get("/escenarios/nada").status_code, 404)
        self.assertEqual(self.cliente.get("/escenarios/..%2Fmanifest").status_code, 404)

    def test_gold_alterado_falla_cerrado(self):
        (self.gold / "panel-x.json").write_text('{"escenario": "otro"}')
        self.assertEqual(self.cliente.get("/paneles/x").status_code, 500)

    def test_openapi_documentado_para_agentes(self):
        guia = (Path(main.__file__).parent / "AGENTES.md").read_text()
        for ruta, operaciones in self.cliente.get("/openapi.json").json()["paths"].items():
            for op in operaciones.values():
                self.assertTrue(op.get("summary") and op.get("description"), ruta)
            self.assertIn(ruta.split("{seccion}")[0].rstrip("/"), guia, ruta)  # la guía cubre cada ruta

    def test_datalake_dir_vacio_usa_el_de_por_defecto(self):
        os.environ["DATALAKE_DIR"] = ""  # así viene en .env.example; setUp/tearDown restauran la variable
        self.assertEqual(main._gold(), main.DATALAKE_DEFECTO / "gold")

    def test_sin_gold_lista_vacia(self):
        (self.gold / "manifest.json").unlink()
        self.assertEqual(self.cliente.get("/escenarios").json(), [])

    def test_perfiles_y_simulacion_y_no_mezclan_con_paneles(self):
        perfiles = self.cliente.get("/perfiles").json()
        self.assertEqual(len(perfiles), 5)
        self.assertEqual(perfiles["transito"]["presion_cabina_mmHg"], 760)
        self.assertEqual(perfiles["transito_acoplado"]["presion_cabina_mmHg"], 527)
        self.assertEqual(perfiles["superficie_marciana"]["presion_cabina_mmHg"], 424)
        self.publicar_sim("caso_referencia", {"semilla": 2026, "alertas_esperadas": []})
        self.publicar_sim("kpi", {"misiones": 500})
        self.assertNotIn("caso_referencia", self.cliente.get("/paneles").json())
        self.assertNotIn("kpi", self.cliente.get("/escenarios").json())
        self.assertEqual(self.cliente.get("/simulacion/caso-referencia").json()["semilla"], 2026)
        self.assertEqual(self.cliente.get("/simulacion/kpi").json()["misiones"], 500)
        (self.gold / "kpi.json").write_text('{"misiones": 0}')
        self.assertEqual(self.cliente.get("/simulacion/kpi").status_code, 500)

    def publicar_sim(self, clave, datos):
        contenido = json.dumps(datos).encode()
        (self.gold / f"{clave}.json").write_bytes(contenido)
        ruta = self.gold / "manifest.json"
        manifiesto = json.loads(ruta.read_text()) if ruta.exists() else {}
        manifiesto[clave] = {"sha256": hashlib.sha256(contenido).hexdigest(), "tipo": "simulacion"}
        ruta.write_text(json.dumps(manifiesto))

if __name__ == "__main__":
    unittest.main()


class Entorno(unittest.TestCase):
    """`cargar_env`: el .env de la raíz se carga con la biblioteca estándar, sin pisar el entorno."""

    def test_cargar_env_no_pisa_ni_define_vacias(self):
        os.environ["VIGIA_PRUEBA_FIJA"] = "shell"
        try:
            with tempfile.TemporaryDirectory() as d:
                ruta = Path(d) / ".env"
                ruta.write_text("# comentario\nVIGIA_PRUEBA_FIJA=archivo\nVIGIA_PRUEBA_A=\"Sebastián=1\"\n"
                                "export VIGIA_PRUEBA_B = ws://127.0.0.1:8765/live \nVIGIA_PRUEBA_VACIA=\nsin_igual\n",
                                encoding="utf-8")
                definidas = main.cargar_env(ruta)
            self.assertEqual(definidas, {"VIGIA_PRUEBA_A": "Sebastián=1", "VIGIA_PRUEBA_B": "ws://127.0.0.1:8765/live"})
            self.assertEqual(os.environ["VIGIA_PRUEBA_FIJA"], "shell")
            self.assertEqual(os.environ["VIGIA_PRUEBA_A"], "Sebastián=1")
            self.assertNotIn("VIGIA_PRUEBA_VACIA", os.environ)
            self.assertEqual(main.cargar_env(Path(d) / "no-existe"), {})
        finally:
            for clave in ("VIGIA_PRUEBA_FIJA", "VIGIA_PRUEBA_A", "VIGIA_PRUEBA_B"):
                os.environ.pop(clave, None)
