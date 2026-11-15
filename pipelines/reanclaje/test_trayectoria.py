import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from trayectoria import DIAS_TRANSITO, posicion  # noqa: E402


class TrayectoriaTest(unittest.TestCase):
    def test_dia_0_la_nave_esta_en_la_tierra(self):
        p = posicion(0)
        self.assertLess(p["dist_tierra_ua"], 1e-6)
        self.assertAlmostEqual(p["dist_sol_ua"], 1.0, places=6)

    def test_dia_259_la_nave_esta_en_marte(self):
        p = posicion(DIAS_TRANSITO)
        self.assertAlmostEqual(p["dist_sol_ua"], 1.524, places=3)
        self.assertLess(math.hypot(p["x_ua"] - p["marte"]["x_ua"], p["y_ua"] - p["marte"]["y_ua"]), 1e-3)

    def test_distancia_al_sol_crece_sin_saltos(self):
        r = [posicion(d)["dist_sol_ua"] for d in range(DIAS_TRANSITO + 1)]
        self.assertTrue(all(b >= a for a, b in zip(r, r[1:])))
        self.assertLess(max(b - a for a, b in zip(r, r[1:])), 0.01)

    def test_retardo_dentro_del_perfil(self):
        # recién salida la nave está a segundos de la Tierra; el máximo del tránsito cabe en el rango del perfil (3-22 min)
        self.assertLess(posicion(1)["retardo_min"], 1)
        self.assertGreater(posicion(DIAS_TRANSITO)["retardo_min"], 3)
        for d in range(1, DIAS_TRANSITO + 1):
            p = posicion(d)
            self.assertLessEqual(p["retardo_min"], 22, d)
            self.assertAlmostEqual(p["retardo_min"], p["dist_tierra_ua"] * 499.0 / 60, places=2)

    def test_es_determinista(self):
        self.assertEqual(posicion(100), posicion(100))

    def test_kepler_converge_en_todo_el_tramo(self):
        for d in range(DIAS_TRANSITO + 1):
            p = posicion(d)
            self.assertTrue(all(math.isfinite(p[k]) for k in ("x_ua", "y_ua", "dist_sol_ua")), d)


if __name__ == "__main__":
    unittest.main()
