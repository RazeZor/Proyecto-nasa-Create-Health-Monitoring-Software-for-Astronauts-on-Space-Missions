"""Pruebas de contrato para perfiles, lecturas, entorno Gold y caso de referencia."""
import json
import unittest
from pathlib import Path

from validador import validar

HERE = Path(__file__).parent


def _cargar(nombre):
    return json.loads((HERE / nombre).read_text(encoding="utf-8"))


class Contratos(unittest.TestCase):
    def test_perfiles_cumple_su_esquema(self):
        esquema = _cargar("perfiles.schema.json")
        perfiles = _cargar("perfiles.json")
        self.assertEqual(validar(perfiles, esquema), [])
        self.assertEqual(perfiles["estacion"]["presion_cabina_mmHg"], 760)
        self.assertEqual(perfiles["transito_acoplado"]["presion_cabina_mmHg"], 527)
        self.assertEqual(perfiles["superficie_lunar"]["presion_cabina_mmHg"], 424)

    def test_lectura_valida_e_invalida(self):
        esquema = _cargar("lectura.schema.json")
        buena = {
            "id": "lec-24",
            "tripulante_id": "t1",
            "dia_mision": 24,
            "perfil_id": "transito",
            "t_real": "2026-11-14T10:00:00Z",
            "fc_reposo_lpm": 68,
            "spo2_pct": 97,
            "temp_central_c": 36.8,
            "sueno_h": 5.6,
            "animo_1_10": 6,
            "sintomas": [],
            "naturaleza": "Medido",
        }
        self.assertEqual(validar(buena, esquema), [])
        mala = {**buena, "perfil_id": "orbita_baja", "t_real": "hoy", "sintomas": ["dolor"]}
        errores = "\n".join(validar(mala, esquema))
        self.assertIn("orbita_baja", errores)
        self.assertIn("no cumple", errores)

    def test_entorno_gold_valido_e_invalido(self):
        esquema = _cargar("entorno-gold.schema.json")
        gold = {
            "escenario": "panel-demo",
            "ventanas": [{"fuente": "radlab", "desde": "2024-05-10T00:00:00Z", "hasta": "2024-05-10T01:00:00Z", "dia_mision": 22}],
            "serie5min": [{
                "t_mision": "D022T00:00:00",
                "t_real": "2024-05-10T00:00:00Z",
                "fuente": "radlab",
                "serie": "DosTel1",
                "variable": "absorbed_dose_rate",
                "valor": 4.2,
                "n": 5,
                "naturaleza": "Real",
            }],
            "diario": [{
                "dia_mision": 22,
                "fuente": "radlab",
                "serie": "DosTel1",
                "variable": "absorbed_dose_rate",
                "max": 8.1,
                "bins": 12,
                "dosis": 4.45,
            }],
            "eventos": [],
        }
        self.assertEqual(validar(gold, esquema), [])
        roto = {**gold, "serie5min": [{**gold["serie5min"][0], "naturaleza": "Inventado"}]}
        self.assertTrue(validar(roto, esquema))

    def test_caso_referencia_valido(self):
        esquema = _cargar("caso-referencia.schema.json")

        def lectura(d):
            return {
                "dia_mision": d,
                "fc_reposo_lpm": 60,
                "pas_mmHg": 115,
                "pad_mmHg": 72,
                "spo2_pct": 98,
                "temp_central_c": 36.7,
                "sueno_h": 7.2,
                "animo_1_10": 8,
                "sintomas": [],
                "durante_tormenta": False,
            }

        def entorno(d):
            return {
                "dia_mision": d,
                "co2_mmhg_max_horario": 2.1,
                "flujo_protones_10mev_pfu": 0.4,
                "modo_tormenta": False,
            }

        caso = {
            "semilla": 2026,
            "dias_prevuelo": 14,
            "dias_vuelo": 30,
            "naturaleza": "Simulado",
            "supuestos": {
                "fc_desplazamiento_lpm": 3.0,
                "sueno_desplazamiento_h": -0.7,
                "pas_desplazamiento_mmHg": -4.0,
                "tau_adaptacion_dias": 4.0,
                "mad_min": {"fc": 2.0, "pas": 3.0, "glucosa": 4.0, "sueno": 0.35, "animo": 0.5},
            },
            "entorno_diario": [entorno(d) for d in range(1, 31)],
            "tripulantes": [{"id": "t1", "nombre": "Tripulante 1", "rol": "astronauta",
                             "lecturas": [lectura(d) for d in range(-13, 31)]}],
            "alertas_esperadas": [],
        }
        self.assertEqual(validar(caso, esquema), [])


if __name__ == "__main__":
    unittest.main()
