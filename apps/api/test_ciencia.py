"""La ausencia, alteración y caducidad del reporte nunca producen una validación aparente."""
import hashlib
import json
import os
import tempfile
import unittest
from importlib import import_module
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import main

rutas_ciencia = import_module("rutas_ciencia")


class Ciencia(unittest.TestCase):
    def producto(self, clave, tipo, datos):
        contenido = json.dumps(datos).encode()
        (self.gold / f"{clave}.json").write_bytes(contenido)
        ruta = self.gold / "manifest.json"
        manifiesto = json.loads(ruta.read_text()) if ruta.exists() else {}
        manifiesto[clave] = {"sha256": hashlib.sha256(contenido).hexdigest(), **tipo}
        ruta.write_text(json.dumps(manifiesto))

    def test_datasets_ausentes_no_inventan_adquisicion(self):
        self.assertEqual(self.cliente.get("/ciencia/datasets").json()["datasets"], [])
        self.assertEqual(self.cliente.get("/ciencia/datasets/no-existe").status_code, 404)
        self.assertEqual(self.cliente.get("/ciencia/datasets/mmash").status_code, 404)

    def test_mmash_se_sirve_como_referencia_y_no_como_evaluacion(self):
        datos = {"id": "mmash", "version": "dataset-fisiologico-v1", "version_fuente": "1.0.0", "uso": "referencia",
                 "validacion_clinica": False, "fuente": "https://physionet.org/content/mmash/1.0.0/", "licencia": "ODbL-1.0",
                 "resumen": {"sujetos": 1, "intervalos_originales": 5, "intervalos_utilizados": 3, "puntos_5min": 2, "periodos_sueno": 1}}
        self.producto("dataset-mmash", {"tipo": "dataset_fisiologico"}, datos)
        d = self.cliente.get("/ciencia/datasets").json()["datasets"][0]
        self.assertEqual((d["sujetos"], d["evaluacion_motor"], d["t_real_observacion"]), (1, False, None))
        self.assertEqual(self.cliente.get("/ciencia/datasets/mmash").json(), datos)
        (self.gold / "dataset-mmash.json").write_text("{}")
        self.assertEqual(self.cliente.get("/ciencia/datasets").status_code, 500)

    def test_orion_cuenta_instrumentos_y_observaciones_sin_fusionarlos(self):
        datos = {"serie5min": [{"serie": "A", "n": 3}, {"serie": "B", "n": 2}],
                 "ventanas": [{"desde": "2022-11-17T00:00:00Z", "hasta": "2022-11-18T00:00:00Z"}]}
        self.producto("orion-artemis-i-piloto", {"serie5min": 2}, datos)
        d = self.cliente.get("/ciencia/datasets").json()["datasets"][0]
        self.assertEqual((d["detectores"], d["registros"], d["uso"]), (2, 5, "referencia"))
        self.assertNotIn("dosis_personal", d)

    def setUp(self):
        temporal = tempfile.TemporaryDirectory()
        self.addCleanup(temporal.cleanup)
        entorno = patch.dict(os.environ, DATALAKE_DIR=temporal.name)
        entorno.start()
        self.addCleanup(entorno.stop)
        self.gold = Path(temporal.name) / "gold"
        self.gold.mkdir()
        self.cliente = TestClient(main.app)

    def publicar(self, informe):
        contenido = json.dumps(informe).encode()
        (self.gold / "validacion.json").write_bytes(contenido)
        (self.gold / "manifest.json").write_text(json.dumps({"validacion": {
            "tipo": "auditoria_sintetica", "sha256": hashlib.sha256(contenido).hexdigest()}}))

    def informe(self):
        hashes = {a: hashlib.sha256((rutas_ciencia.RAIZ / a).read_bytes()).hexdigest() for a in rutas_ciencia.ARCHIVOS}
        return {"version": "evidencia-v1", "conclusion": "exploratoria_sin_validacion_clinica", "congelacion": {
            "datos_humanos": False, "conjunto_independiente": False,
            "protocolo_sha256": hashes.pop("tools/validacion/protocolo.json"), "archivos": hashes}}

    def test_sin_reporte_no_inventa_metricas_ni_revision(self):
        datos = self.cliente.get("/ciencia/evidencia").json()
        self.assertEqual(datos["estado"], "no_publicado")
        self.assertIsNone(datos["informe"])
        self.assertFalse(datos["catalogo"]["validacion_clinica"])
        self.assertEqual(datos["catalogo"]["revisiones"], [])

    def test_distingue_vigencia_y_otros_componentes_del_banco(self):
        informe = self.informe()
        self.publicar(informe)
        self.assertEqual(self.cliente.get("/ciencia/evidencia").json()["estado"], "vigente")
        informe["congelacion"]["archivos"]["tools/validacion/generador.ts"] = "0" * 64
        self.publicar(informe)
        self.assertEqual(self.cliente.get("/ciencia/evidencia").json()["estado"], "desactualizado")

    def test_alteracion_y_metadatos_incompletos_fallan_cerrado(self):
        self.publicar(self.informe())
        (self.gold / "validacion.json").write_text("{}")
        self.assertEqual(self.cliente.get("/ciencia/evidencia").status_code, 500)
        self.publicar({"version": "incompatible"})
        self.assertEqual(self.cliente.get("/ciencia/evidencia").status_code, 500)
