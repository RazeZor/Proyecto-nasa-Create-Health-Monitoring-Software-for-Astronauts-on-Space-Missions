import json
import tempfile
import unittest
from pathlib import Path

import panel as pn

import reanclaje as rc


def d(fuente, serie, variable, dia=22, **kw):
    return {"dia_mision": dia, "fuente": fuente, "serie": serie, "variable": variable, "bins": 12, **kw}


GOLD = {"escenario": "t", "eventos": [], "ventanas": [], "diario": [
    d("radlab", "DosTel1", "absorbed_dose_rate", max=8.0, dosis=4.0),
    d("radlab", "DosTel2", "absorbed_dose_rate", max=7.0, dosis=6.0),
    d("radlab", "DosTel1", "absorbed_dose_rate", dia=23, max=8.0, dosis=10.0),
    d("goes", "G18 >=10 MeV", "flux", max=12.5), d("goes", "G18 >=50 MeV", "flux", max=30.0),
    d("eda", "RR-1", "co2_iss", max=4000.0, bins=288, max_prom_horario=3950.0),
    d("eda", "RR-1", "temperature_iss", max=26.8, bins=288),
]}


class Panel(unittest.TestCase):
    def test_dosis_acumulada_orientativa_y_cobertura(self):
        dosis = pn.construir_panel(GOLD)["dosis"]
        self.assertEqual((dosis["tipo"], dosis["unidad"], dosis["orientativa"]), ("absorbida", "µGy", True))
        self.assertEqual([(x["dosis"], x["acumulada"]) for x in dosis["por_dia"]], [(5.0, 5.0), (10.0, 15.0)])
        self.assertEqual(dosis["por_dia"][0]["cobertura"], round(12 / 288, 3))  # solo 1 h de datos
        self.assertEqual(dosis["porcentaje_limite_carrera"], round(15 / 1000 / 600 * 100, 4))

    def test_prefiere_dosis_equivalente(self):
        gold = {**GOLD, "diario": GOLD["diario"] + [d("radlab", "REM", "dose_equivalent_rate", max=1.0, dosis=2.0)]}
        dosis = pn.construir_panel(gold)["dosis"]
        self.assertEqual((dosis["tipo"], dosis["orientativa"], dosis["series"]), ("equivalente", False, ["REM"]))

    def test_ventanas_que_faltan_llegan_al_panel(self):
        falta = {"fuente": "goes", "desde": "a", "hasta": "b", "dia_mision": 21}
        self.assertEqual(pn.construir_panel({**GOLD, "faltan": [falta]})["faltan"], [falta])
        self.assertEqual(pn.construir_panel(GOLD)["faltan"], [])  # gold anterior a este campo

    def test_modo_tormenta_solo_con_10_mev(self):
        flujos = {p["serie"]: p["modo_tormenta"] for p in pn.construir_panel(GOLD)["protones"]}
        self.assertEqual(flujos, {"G18 >=10 MeV": True, "G18 >=50 MeV": False})

    def test_co2_se_convierte_a_presion_parcial_por_perfil(self):
        (dia,) = pn.construir_panel(GOLD)["cabina"]
        self.assertEqual(dia["co2_mmhg_por_perfil"], {"estacion": 3.002, "transito": 3.002, "superficie": 1.675})
        # mismo ppm: en la ISS pasa el límite de 3 mmHg y a 8,2 psia no (informe §3.3)
        self.assertEqual(dia["co2_sobre_limite_por_perfil"], {"estacion": True, "transito": True, "superficie": False})
        self.assertEqual(dia["temperature_iss_max"], 26.8)

    def test_secciones_sin_datos(self):
        vacio = pn.construir_panel({"escenario": "v", "ventanas": [], "diario": [], "eventos": []})
        self.assertEqual((vacio["dosis"], vacio["protones"], vacio["cabina"]), (None, [], []))


class Publicar(unittest.TestCase):
    def test_guarda_en_destino_y_registra_sha(self):
        with tempfile.TemporaryDirectory() as tmp:
            rc.datalake.ROOT = Path(tmp)
            rc.datalake.read = lambda f, desde=None, hasta=None: [
                {"t_real": "2024-05-10T00:01:00Z", "instrument_id": "DosTel1",
                 "absorbed_dose_rate": 6.0, "dose_equivalent_rate": None}] if f == "radlab" else []
            esc = {"nombre": "t", "ventanas": [{"fuente": "radlab", "desde": "2024-05-10T00:00:00Z",
                                                "hasta": "2024-05-10T01:00:00Z", "dia_mision": 22}]}
            destino = Path(tmp) / "app" / "panel.json"
            entrada = pn.publicar(esc, destino)
            self.assertTrue(entrada["dosis"])
            self.assertEqual(json.loads(destino.read_text())["dosis"]["por_dia"][0]["dia_mision"], 22)
            self.assertIn("panel-t", json.loads((Path(tmp) / "gold" / "manifest.json").read_text()))


if __name__ == "__main__":
    unittest.main()
