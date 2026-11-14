"""Valida las fichas de apps/web/public/fichas contra ficha.schema.json (solo biblioteca estándar).

shortcut: valida solo los términos que usa el esquema (type, enum, required, pattern, minLength,
minItems, uniqueItems, additionalProperties). Si el esquema crece, usar una biblioteca de JSON Schema.
"""
import json
import re
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
ESQUEMA = json.loads((Path(__file__).parent / "ficha.schema.json").read_text(encoding="utf-8"))
FICHAS = RAIZ / "apps" / "web" / "public" / "fichas"
TIPOS = {"string": str, "object": dict, "array": list, "null": type(None)}


def validar(valor, esquema, ruta="ficha"):
    """Lista de errores de `valor` frente a `esquema`; vacía si es válido."""
    errores = []
    if "enum" in esquema and valor not in esquema["enum"]:
        return [f"{ruta}: {valor!r} no está en {esquema['enum']}"]
    tipos = esquema.get("type")
    if tipos:
        tipos = [tipos] if isinstance(tipos, str) else tipos
        if not any(isinstance(valor, TIPOS[t]) for t in tipos):
            return [f"{ruta}: se esperaba {tipos}, llegó {type(valor).__name__}"]
    if isinstance(valor, str):
        if len(valor) < esquema.get("minLength", 0):
            errores.append(f"{ruta}: vacío")
        if "pattern" in esquema and not re.search(esquema["pattern"], valor):
            errores.append(f"{ruta}: {valor!r} no cumple {esquema['pattern']}")
    if isinstance(valor, list):
        if len(valor) < esquema.get("minItems", 0):
            errores.append(f"{ruta}: necesita al menos {esquema['minItems']} elemento(s)")
        if esquema.get("uniqueItems") and len({json.dumps(v, sort_keys=True) for v in valor}) != len(valor):
            errores.append(f"{ruta}: elementos repetidos")
        for i, v in enumerate(valor):
            errores += validar(v, esquema.get("items", {}), f"{ruta}[{i}]")
    if isinstance(valor, dict):
        props = esquema.get("properties", {})
        errores += [f"{ruta}: falta `{k}`" for k in esquema.get("required", []) if k not in valor]
        if esquema.get("additionalProperties") is False:
            errores += [f"{ruta}: campo no permitido `{k}`" for k in valor if k not in props]
        for k, v in valor.items():
            if k in props:
                errores += validar(v, props[k], f"{ruta}.{k}")
    return errores


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
