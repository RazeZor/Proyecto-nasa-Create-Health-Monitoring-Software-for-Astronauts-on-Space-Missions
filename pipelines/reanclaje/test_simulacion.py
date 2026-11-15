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


def lectura(dia, fc=60.0, pas=118.0, spo2=98.0, temp=36.7, sueno=7.0, animo=8, sintomas=()):
    return {"dia_mision": dia, "fc_reposo_lpm": fc, "pas_mmHg": pas, "pad_mmHg": 74.0, "spo2_pct": spo2,
            "temp_central_c": temp, "sueno_h": sueno, "animo_1_10": animo, "glucosa_mg_dl": None, "masa_kg": None,
            "sintomas": list(sintomas), "durante_tormenta": False}


def tripulante(cambios=None):
    """44 días estables; `cambios` = {dia: campos que cambian ese día}."""
    cambios = cambios or {}
    return {"id": "t", "nombre": "T", "rol": "astronauta",
            "lecturas": [lectura(d, **cambios.get(d, {})) for d in range(-13, 31)]}


def alertas(cambios=None, entorno=None):
    return simulacion.evaluar_tripulante(tripulante(cambios), entorno or {})


class Simulacion(unittest.TestCase):
    def test_determinismo_por_semilla(self):
        c1 = simulacion.generar_caso_referencia(semilla=2026)
        c2 = simulacion.generar_caso_referencia(semilla=2026)
        self.assertEqual(c1, c2)
        self.assertEqual(len(c1["tripulantes"]), 4)
        self.assertEqual(len(c1["entorno_diario"]), 30)

    def test_caso_referencia_cumple_esquema_y_protocolo(self):
        esquema = json.loads((RAIZ_REPO / "packages" / "schemas" / "caso-referencia.schema.json").read_text("utf-8"))
        caso = simulacion.generar_caso_referencia(semilla=2026)
        self.assertEqual(validador.validar(caso, esquema, _raiz=esquema), [])
        esperadas = caso["alertas_esperadas"]
        # A1: deriva de trip-1 detectada por B o C dentro de su ventana (días 18 a 27)
        self.assertTrue(any(a["tripulante_id"] == "trip-1" and a["capa"] in ("B", "C") and 18 <= a["dia_mision"] <= 27
                            for a in esperadas))
        # A2: una alerta de entorno para cada afectado el día 12, y ninguna médica ese día
        dia12 = [a for a in esperadas if a["dia_mision"] == 12]
        self.assertEqual(sorted(a["tripulante_id"] for a in dia12), ["trip-2", "trip-3"])
        self.assertTrue(all(a["capa"] == "contexto" and a["ambito"] == "tripulacion" for a in dia12))
        # A3: modo tormenta el mismo día 22
        self.assertTrue(any(a["indicador"] == "protones" and a["dia_mision"] == 22 for a in esperadas))
        # trip-4 es nominal: solo recibe las alertas de entorno
        self.assertTrue(all(a["ambito"] == "tripulacion" for a in esperadas if a["tripulante_id"] == "trip-4"))

    def test_ejecucion_y_publicacion_en_gold(self):
        with tempfile.TemporaryDirectory() as tmp:
            anterior = reanclaje.datalake.ROOT
            reanclaje.datalake.ROOT = Path(tmp)
            try:
                salida = simulacion.publicar_simulacion(n_misiones=12, semilla=2026)
                manifest = json.loads((Path(tmp) / "gold" / "manifest.json").read_text("utf-8"))
                self.assertEqual(manifest["caso_referencia"]["tipo"], "simulacion")
                self.assertEqual(salida["kpi"]["misiones"], 12)
                res = salida["resumen_kpi"]["anomalias"]
                self.assertGreaterEqual(res["A1_deriva_deteccion_pct"], 80.0)
                self.assertEqual(res["A2_co2_cefalea_deteccion_pct"], 100.0)
                self.assertEqual(res["A3_tormenta_deteccion_pct"], 100.0)
                barrido = simulacion.publicar_barrido(n_misiones=4)
                self.assertEqual(len(barrido["tabla"]), 9)
            finally:
                reanclaje.datalake.ROOT = anterior


class Reglas(unittest.TestCase):
    """Cada regla de §5.1, §5.2 y §5.4 que la auditoría encontró distinta del informe."""

    def test_estable_no_alerta(self):
        self.assertEqual(alertas(), [])

    def test_capa_a_ambar_con_suma_3_o_4(self):
        a = alertas({24: {"spo2": 93.0, "pas": 105.0}})  # 2 + 1 = 3
        self.assertEqual([(x["capa"], x["nivel"], x["valor"], x["escalada_auto"]) for x in a], [("A", "ambar", 3.0, False)])

    def test_capa_a_roja_escala_sin_tormenta(self):
        a = alertas({24: {"spo2": 90.0}})
        self.assertEqual([(x["capa"], x["nivel"], x["escalada_auto"]) for x in a], [("A", "rojo", True)])

    def test_capa_b_en_adaptacion_es_informativa(self):
        a = alertas({9: {"fc": 85.0}, 10: {"fc": 85.0}})
        self.assertEqual([(x["dia_mision"], x["capa"], x["nivel"], x["informativa"]) for x in a], [(10, "B", "ambar", True)])

    def test_capa_b_tras_adaptacion_es_ambar_y_no_escala(self):
        a = alertas({24: {"fc": 110.0}, 25: {"fc": 110.0}})
        b = [x for x in a if x["capa"] == "B"]
        self.assertEqual([(x["dia_mision"], x["nivel"], x["informativa"], x["escalada_auto"]) for x in b], [(25, "ambar", False, False)])

    def test_capa_c_solo_ambar_y_se_reinicia(self):
        deriva = {d: {"sueno": 7.0 - 0.9} for d in range(21, 31)}  # z = -1,5 al día: por debajo del umbral de B
        c = [x for x in alertas(deriva) if x["capa"] == "C"]
        self.assertGreaterEqual(len(c), 1)
        self.assertTrue(all(x["nivel"] == "ambar" and x["indicador"] == "sueno" for x in c))
        self.assertTrue(all(x["valor"] < simulacion.CUSUM_H + 1.5 for x in c))  # tras emitir vuelve a cero

    def test_la_presion_no_tiene_capa_c(self):
        deriva = {d: {"pas": 118.0 - 8.0} for d in range(21, 31)}
        self.assertEqual([x for x in alertas(deriva) if x["capa"] == "C"], [])

    def test_co2_con_cefalea_es_alerta_de_entorno(self):
        entorno = {12: {"co2_mmhg_max_horario": 4.6}}
        a = alertas({12: {"sintomas": ("cefalea",)}}, entorno)
        self.assertEqual([(x["capa"], x["nivel"], x["ambito"], x["escalada_auto"]) for x in a],
                         [("contexto", "ambar", "tripulacion", False)])
        self.assertEqual(alertas({12: {"sintomas": ("cefalea",)}}, {12: {"co2_mmhg_max_horario": 3.0}}), [])  # el límite no lo supera
        self.assertEqual(alertas(None, entorno), [])  # sin síntoma no hay cruce

    def test_tormenta_por_flujo_o_por_evento(self):
        for entorno in ({22: {"flujo_protones_10mev_pfu": 10.0}}, {22: {"modo_tormenta": True}}):
            a = alertas(None, entorno)
            self.assertEqual([(x["dia_mision"], x["indicador"], x["ambito"]) for x in a], [(22, "protones", "tripulacion")])

    def test_linea_base_pasa_de_tierra_a_vuelo(self):
        # un desplazamiento sostenido desde el día 1 (adaptación) deja de ser desviación cuando la referencia es de vuelo
        desplazado = {d: {"sueno": 5.5} for d in range(1, 31)}  # contra tierra: z = -2,5 (sin alerta B, umbral 3,0)
        self.assertEqual([x for x in alertas(desplazado) if not x["informativa"]], [])
        self.assertEqual(simulacion._peso_vuelo(14, 14), 0.0)
        self.assertEqual(simulacion._peso_vuelo(15, 4), 0.0)
        self.assertAlmostEqual(simulacion._peso_vuelo(15, 5), 1 / 7)
        self.assertEqual(simulacion._peso_vuelo(21, 14), 1.0)

    def test_ventana_con_rezago_y_sin_dias_excluidos(self):
        historia = [(d, float(d)) for d in range(1, 25)]
        centro, _ = simulacion._referencia(25, (0.0, 1.0), historia, {20, 21}, 0.1)
        # días 8 a 22 sin 20 ni 21 -> 13 lecturas: 8..19 y 22; mediana = 14
        self.assertEqual(centro, 14.0)


class FixtureDelMotor(unittest.TestCase):
    def test_el_fixture_de_packages_engine_es_el_caso_de_referencia(self):
        # el test de paridad del motor TS (packages/engine) usa este fixture: si el simulador
        # cambia una regla, regenéralo: ver packages/engine/MODULE.md
        ruta = Path(__file__).resolve().parents[2] / "packages" / "engine" / "fixtures" / "caso-referencia.json"
        self.assertEqual(json.loads(ruta.read_text(encoding="utf-8")),
                         json.loads(json.dumps(simulacion.generar_caso_referencia())))


if __name__ == "__main__":
    unittest.main()
