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
        self.publicar("panel-x", {"escenario": "x", "dosis": None})

    def tearDown(self):
        del os.environ["DATALAKE_DIR"]
        self.tmp.cleanup()

    def publicar(self, clave, datos):
        contenido = json.dumps(datos).encode()
        (self.gold / f"{clave}.json").write_bytes(contenido)
        ruta = self.gold / "manifest.json"
        manifiesto = json.loads(ruta.read_text()) if ruta.exists() else {}
        manifiesto[clave] = {"sha256": hashlib.sha256(contenido).hexdigest()}
        ruta.write_text(json.dumps(manifiesto))

    def test_listar_y_leer(self):
        self.assertEqual(set(self.cliente.get("/gold").json()), {"ejemplo", "panel-x"})
        self.assertEqual(self.cliente.get("/gold/panel-x").json()["escenario"], "x")

    def test_filtros(self):
        r = self.cliente.get("/gold/ejemplo", params={"fuente": "goes"}).json()
        self.assertEqual([f["valor"] for f in r["serie5min"]], [2.0])
        r = self.cliente.get("/gold/ejemplo", params={"dia_mision": 22}).json()
        self.assertEqual([f["valor"] for f in r["serie5min"]], [1.0])

    def test_clave_desconocida_o_ruta_no_se_sirve(self):
        self.assertEqual(self.cliente.get("/gold/nada").status_code, 404)
        self.assertEqual(self.cliente.get("/gold/..%2Fmanifest").status_code, 404)

    def test_gold_alterado_falla_cerrado(self):
        (self.gold / "panel-x.json").write_text('{"escenario": "otro"}')
        self.assertEqual(self.cliente.get("/gold/panel-x").status_code, 500)

    def test_sin_gold_lista_vacia(self):
        (self.gold / "manifest.json").unlink()
        self.assertEqual(self.cliente.get("/gold").json(), {})


if __name__ == "__main__":
    unittest.main()
