import json
import sys
import tempfile
import unittest
from pathlib import Path

RAIZ_REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(RAIZ_REPO / "packages" / "schemas"))

import simulacion  # noqa: E402
import validador  # noqa: E402

import reanclaje  # noqa: E402


class Simulacion(unittest.TestCase):
    def test_determinismo_por_semilla(self):
        c1 = simulacion.generar_caso_referencia(semilla=2026)
        c2 = simulacion.generar_caso_referencia(semilla=2026)
        self.assertEqual(c1, c2)
        self.assertEqual(len(c1["tripulantes"]), 4)
        self.assertEqual(len(c1["entorno_diario"]), 30)

    def test_caso_referencia_cumple_esquema(self):
        esquema = json.loads((RAIZ_REPO / "packages" / "schemas" / "caso-referencia.schema.json").read_text("utf-8"))
        caso = simulacion.generar_caso_referencia(semilla=2026)
        errores = validador.validar(caso, esquema, _raiz=esquema)
        self.assertEqual(errores, [])
        # El caso de referencia debe detectar anomalías en trip-1, trip-2 y trip-3 sin falsas en trip-4 nominal
        ids_con_alerta = {a["tripulante_id"] for a in caso["alertas_esperadas"]}
        self.assertTrue({"trip-1", "trip-2", "trip-3"}.issubset(ids_con_alerta))

    def test_ejecucion_y_publicacion_en_gold(self):
        with tempfile.TemporaryDirectory() as tmp:
            anterior = reanclaje.datalake.ROOT
            reanclaje.datalake.ROOT = Path(tmp)
            try:
                salida = simulacion.publicar_simulacion(n_misiones=12, semilla=2026)
                manifest = json.loads((Path(tmp) / "gold" / "manifest.json").read_text("utf-8"))
                self.assertIn("caso_referencia", manifest)
                self.assertIn("kpi", manifest)
                self.assertEqual(manifest["caso_referencia"]["tipo"], "simulacion")
                self.assertEqual(salida["kpi"]["misiones"], 12)
                res = salida["resumen_kpi"]
                self.assertGreaterEqual(res["A1_deriva_cardiaca"]["deteccion_pct"], 80.0)
                self.assertGreaterEqual(res["A2_perdida_aguda_sueno"]["deteccion_pct"], 80.0)
                self.assertGreaterEqual(res["A3_deriva_conductual_cusum"]["deteccion_pct"], 80.0)
            finally:
                reanclaje.datalake.ROOT = anterior


class FixtureDelMotor(unittest.TestCase):
    def test_el_fixture_de_packages_engine_es_el_caso_de_referencia(self):
        # el test de paridad del motor TS (packages/engine) usa este fixture: si el simulador
        # cambia una regla, regénéralo: ver packages/engine/MODULE.md
        ruta = Path(__file__).resolve().parents[2] / "packages" / "engine" / "fixtures" / "caso-referencia.json"
        self.assertEqual(json.loads(ruta.read_text(encoding="utf-8")),
                         json.loads(json.dumps(simulacion.generar_caso_referencia())))


if __name__ == "__main__":
    unittest.main()
