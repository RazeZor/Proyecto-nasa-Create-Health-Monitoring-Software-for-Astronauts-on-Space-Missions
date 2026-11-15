"""Valida las fichas de packages/schemas/fichas contra ficha.schema.json (solo biblioteca estándar)."""
import json
import unittest
from pathlib import Path

from validador import validar

RAIZ = Path(__file__).resolve().parents[2]
ESQUEMA = json.loads((Path(__file__).parent / "ficha.schema.json").read_text(encoding="utf-8"))
FICHAS = RAIZ / "packages" / "schemas" / "fichas"


class Fichas(unittest.TestCase):
    def test_validador_detecta_errores(self):
        malo = {"id": "Mal Id", "peligro": ["marte"], "fuentes": [{"titulo": "x", "url": "http://x"}]}
        errores = "\n".join(validar(malo, ESQUEMA))
        for esperado in ("falta `nombre`", "no cumple", "no está en", "http://x"):
            self.assertIn(esperado, errores)

    def test_cada_ficha_cumple_el_esquema(self):
        archivos = sorted(p for p in FICHAS.glob("*.json") if p.name != "index.json")
        self.assertTrue(archivos, f"no hay fichas en {FICHAS}")
        for p in archivos:
            ficha = json.loads(p.read_text(encoding="utf-8"))
            self.assertEqual(validar(ficha, ESQUEMA), [], p.name)
            self.assertEqual(ficha["id"], p.stem, f"{p.name}: el id debe coincidir con el archivo")

    def test_index_lista_todas_las_fichas(self):
        ids = json.loads((FICHAS / "index.json").read_text(encoding="utf-8"))
        en_disco = sorted(p.stem for p in FICHAS.glob("*.json") if p.name != "index.json")
        self.assertEqual(sorted(ids), en_disco)

    def test_los_diez_indicadores_del_informe(self):
        # informe §3.2: indicadores del registro diario, semanal y de contexto
        ids = set(json.loads((FICHAS / "index.json").read_text(encoding="utf-8")))
        self.assertEqual(ids, {"presion_arterial_sistolica", "spo2", "temperatura_central",
                               "frecuencia_cardiaca_reposo", "sueno", "estado_animo", "glucosa",
                               "masa_corporal", "sintomas", "dosis_radiacion"})


if __name__ == "__main__":
    unittest.main()

    def test_las_traducciones_al_ingles_siguen_a_su_ficha(self):
        # el inglés es secundario: puede faltar una ficha, pero la que esté no inventa campos ni cambia la estructura
        textos = {"id", "nombre", "que_es", "como_se_mide_en_vuelo", "por_que", "referencia_en_vuelo", "cuando_avisar",
                  "prevencion", "fuentes"}
        for p in sorted((RAIZ / "packages" / "schemas" / "fichas_en").glob("*.json")):
            en = json.loads(p.read_text(encoding="utf-8"))
            es = json.loads((FICHAS / p.name).read_text(encoding="utf-8"))
            self.assertEqual(en["id"], p.stem, p.name)
            self.assertLessEqual(set(en), textos, p.name)
            self.assertEqual(set(en["como_se_mide_en_vuelo"]), set(es["como_se_mide_en_vuelo"]), p.name)
            self.assertEqual(len(en["fuentes"]), len(es["fuentes"]), p.name)
            for campo in ("referencia_en_vuelo", "prevencion"):
                self.assertEqual(en[campo] is None, es[campo] is None, f"{p.name}: {campo}")

