"""Valida las fichas de apps/web/public/fichas contra ficha.schema.json (solo biblioteca estándar)."""
import json
import unittest
from pathlib import Path

from validador import validar

RAIZ = Path(__file__).resolve().parents[2]
ESQUEMA = json.loads((Path(__file__).parent / "ficha.schema.json").read_text(encoding="utf-8"))
FICHAS = RAIZ / "apps" / "web" / "public" / "fichas"


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
