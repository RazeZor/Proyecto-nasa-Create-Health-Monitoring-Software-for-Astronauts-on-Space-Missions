"""Las afirmaciones publicadas tienen fuente, código existente y límites traducidos."""
import copy
import json
import unittest
from pathlib import Path

from validador import validar

RAIZ = Path(__file__).resolve().parents[2]
CARPETA = Path(__file__).parent


class Evidencia(unittest.TestCase):
    def test_mmash_no_admite_fecha_utc_de_toma_inventada_ni_aval_clinico(self):
        esquema = json.loads((CARPETA / "mmash-gold.schema.json").read_text(encoding="utf-8"))
        datos = {"version": "dataset-fisiologico-v1", "id": "mmash", "version_fuente": "1.0.0", "uso": "referencia",
                 "dominio": "humano_terrestre", "t_real_observacion": None, "fecha_observacion_conocida": False,
                 "evaluacion_motor": False, "validacion_clinica": False, "resumen": {"sujetos": 1,
                     "intervalos_originales": 0, "intervalos_utilizados": 0, "puntos_5min": 0, "periodos_sueno": 0},
                 "archivos": [{"url": "https://physionet.org/files/mmash/1.0.0/ejemplo", "raw": "raw/x", "sha256": "a" * 64, "bytes": 1}] * 3,
                 "sujetos": [{"id": "user_1", "intervalos_originales": 0, "intervalos_utilizados": 0, "serie_5min": [], "periodos_sueno": []}]}
        self.assertEqual(validar(datos, esquema), [])
        datos["t_real_observacion"] = "2026-11-16T00:00:00Z"
        self.assertTrue(validar(datos, esquema))

    def setUp(self):
        self.catalogo = json.loads((CARPETA / "evidencia-cientifica.json").read_text(encoding="utf-8"))
        self.esquema = json.loads((CARPETA / "evidencia-cientifica.schema.json").read_text(encoding="utf-8"))

    def test_contrato_y_trazabilidad_de_todas_las_afirmaciones(self):
        self.assertEqual(validar(self.catalogo, self.esquema), [])
        ids = [a["id"] for a in self.catalogo["afirmaciones"]]
        self.assertEqual(len(ids), len(set(ids)))
        for idioma in ("es", "en"):
            textos = json.loads((RAIZ / f"packages/i18n/locales/{idioma}.json").read_text(encoding="utf-8"))
            for a in self.catalogo["afirmaciones"]:
                for campo in ("clave", "limite"):
                    valor = textos
                    for parte in a[campo].split("."):
                        valor = valor[parte]
                    self.assertTrue(valor)
                self.assertTrue(all((RAIZ / archivo).is_file() for archivo in a["artefactos"]))

    def test_v1_no_permite_convertir_simulacion_en_aval_profesional(self):
        for campo, valor in (("validacion_clinica", True), ("revision_profesional", "aprobada"), ("revisiones", [{}])):
            falso = copy.deepcopy(self.catalogo)
            falso[campo] = valor
            self.assertTrue(validar(falso, self.esquema), campo)
