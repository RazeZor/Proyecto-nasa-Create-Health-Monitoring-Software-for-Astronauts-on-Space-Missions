import json
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path

import reanclaje as rc

V = {"fuente": "radlab", "desde": "2024-05-10T00:00:00Z", "hasta": "2024-05-10T01:00:00Z", "dia_mision": 22}


def radlab(t, absorbida):
    return {"t_real": t, "instrument_id": "DosTel1", "absorbed_dose_rate": absorbida, "dose_equivalent_rate": None}


FILAS = [radlab("2024-05-10T00:01:00Z", 4.0), radlab("2024-05-10T00:03:00Z", 6.0),
         radlab("2024-05-10T00:07:00Z", 12.0)]


class Pasos(unittest.TestCase):
    def test_un_solo_corrimiento_y_doble_marca(self):
        corr = rc.corrimiento(V)
        self.assertEqual(corr, rc.BASE + timedelta(days=21) - rc._dt(V["desde"]))
        pts = rc.rejilla("radlab", FILAS, corr)
        self.assertEqual([(p["t_mision"], p["t_real"]) for p in pts],
                         [("D022T00:00:00", "2024-05-10T00:00:00Z"), ("D022T00:05:00", "2024-05-10T00:05:00Z")])

    def test_rejilla_promedia_y_no_toca_los_valores(self):
        corr = rc.corrimiento(V)
        pts = rc.rejilla("radlab", FILAS, corr)
        self.assertEqual([(p["valor"], p["n"]) for p in pts], [(5.0, 2), (12.0, 1)])

    def test_flujo_y_co2_usan_maximo(self):
        self.assertEqual(rc._agregar("flux", [1, 9, 2]), 9)
        self.assertEqual(rc._agregar("co2_iss", [1, 9, 2]), 9)

    def test_diario_dosis_y_co2(self):
        corr = rc.corrimiento(V)
        (d,) = rc.diario(rc.rejilla("radlab", FILAS, corr))
        self.assertEqual((d["dia_mision"], d["max"], d["bins"]), (22, 12.0, 2))
        self.assertAlmostEqual(d["dosis"], (5.0 + 12.0) * 5 / 60)
        co2 = [{"t_mision": f"D001T{h:02d}:{m:02d}:00", "fuente": "eda", "serie": "RR-1", "variable": "co2_iss",
                "valor": v} for h, m, v in [(0, 0, 100), (0, 5, 300), (1, 0, 150)]]
        (c,) = rc.diario(co2)
        self.assertEqual((c["max"], c["max_prom_horario"]), (300, 200))

    def test_diario_calcula_dosis_tambien_de_la_dosis_equivalente(self):
        # bug visto con ALTEA-Survey: "dose_equivalent_rate" no termina en "_dose_rate"
        pts = [{"t_mision": "D001T00:00:00", "fuente": "radlab", "serie": "ALTEA-Survey",
                "variable": "dose_equivalent_rate", "valor": 12.0}]
        (d,) = rc.diario(pts)
        self.assertAlmostEqual(d["dosis"], 12.0 * 5 / 60)

    def test_validar(self):
        for malo in ({}, {"nombre": "x", "ventanas": [{**V, "fuente": "otra"}]},
                     {"nombre": "x", "ventanas": [{**V, "dia_mision": 0}]},
                     {"nombre": "x", "ventanas": [{**V, "desde": V["hasta"]}]}):
            with self.assertRaises(ValueError):
                rc.validar(malo)


class Construir(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        rc.datalake.ROOT = Path(self.tmp.name)
        rc.datalake.read = lambda fuente, desde=None, hasta=None: FILAS if fuente == "radlab" else []

    def tearDown(self):
        self.tmp.cleanup()

    def test_idempotente_y_manifiesto(self):
        esc = {"nombre": "t", "ventanas": [V]}
        a, b = rc.construir(esc), rc.construir(esc)
        self.assertEqual(a["sha256"], b["sha256"])
        manifiesto = json.loads((rc.datalake.ROOT / "gold" / "manifest.json").read_text())
        self.assertEqual(list(manifiesto), ["t"])
        gold = json.loads((rc.datalake.ROOT / "gold" / "t.json").read_text())
        self.assertEqual((len(gold["serie5min"]), len(gold["diario"])), (2, 1))

    def test_sin_datos_no_escribe(self):
        with self.assertRaisesRegex(ValueError, "no hay datos"):
            rc.construir({"nombre": "t", "ventanas": [{**V, "fuente": "goes"}]})
        self.assertFalse((rc.datalake.ROOT / "gold").exists())

    def test_ventana_sin_datos_se_omite_y_se_avisa(self):
        # la ventana GOES de un escenario no se puede volver a descargar: el resto del gold sigue saliendo
        goes = {**V, "fuente": "goes"}
        entrada = rc.construir({"nombre": "t", "ventanas": [V, goes]})
        gold = json.loads((rc.datalake.ROOT / "gold" / "t.json").read_text())
        self.assertEqual(gold["faltan"], [goes])
        self.assertEqual(entrada["faltan"], 1)
        self.assertEqual(len(gold["serie5min"]), 2)


if __name__ == "__main__":
    unittest.main()
