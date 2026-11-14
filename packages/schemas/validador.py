"""Validador mínimo de JSON Schema (Draft 2020-12) con solo biblioteca estándar.

Cubre las palabras clave usadas en los contratos de `packages/schemas`:
$ref (local `#/$defs/...`), type, enum, const, minimum, maximum, minLength,
minItems, maxItems, uniqueItems, pattern, required, additionalProperties, properties, items.
"""
import json
import re

TIPOS = {
    "string": str,
    "object": dict,
    "array": list,
    "boolean": bool,
    "integer": int,
    "number": (int, float),
    "null": type(None),
}


def _es_tipo(valor, tipo):
    if tipo == "integer":
        return isinstance(valor, int) and not isinstance(valor, bool)
    if tipo == "number":
        return isinstance(valor, (int, float)) and not isinstance(valor, bool)
    return isinstance(valor, TIPOS[tipo])


def _resolver(esquema, raiz):
    if "$ref" in esquema:
        ruta = esquema["$ref"]
        if not ruta.startswith("#/"):
            raise ValueError(f"$ref externo no soportado en validador stdlib: {ruta}")
        destino = raiz
        for parte in ruta[2:].split("/"):
            destino = destino[parte]
        return {**destino, **{k: v for k, v in esquema.items() if k != "$ref"}}
    return esquema


def validar(valor, esquema, ruta="dato", _raiz=None):
    """Lista de errores de `valor` frente a `esquema`; vacía si es válido."""
    raiz = _raiz or esquema
    esquema = _resolver(esquema, raiz)
    errores = []
    if "const" in esquema and valor != esquema["const"]:
        return [f"{ruta}: se esperaba constante {esquema['const']!r}, llegó {valor!r}"]
    if "enum" in esquema and valor not in esquema["enum"]:
        return [f"{ruta}: {valor!r} no está en {esquema['enum']}"]
    tipos = esquema.get("type")
    if tipos:
        tipos = [tipos] if isinstance(tipos, str) else tipos
        if not any(_es_tipo(valor, t) for t in tipos):
            return [f"{ruta}: se esperaba {tipos}, llegó {type(valor).__name__}"]
    if isinstance(valor, (int, float)) and not isinstance(valor, bool):
        if "minimum" in esquema and valor < esquema["minimum"]:
            errores.append(f"{ruta}: {valor} < mínimo {esquema['minimum']}")
        if "maximum" in esquema and valor > esquema["maximum"]:
            errores.append(f"{ruta}: {valor} > máximo {esquema['maximum']}")
    if isinstance(valor, str):
        if len(valor) < esquema.get("minLength", 0):
            errores.append(f"{ruta}: vacío")
        if "pattern" in esquema and not re.search(esquema["pattern"], valor):
            errores.append(f"{ruta}: {valor!r} no cumple {esquema['pattern']}")
    if isinstance(valor, list):
        if len(valor) < esquema.get("minItems", 0):
            errores.append(f"{ruta}: necesita al menos {esquema['minItems']} elemento(s)")
        if "maxItems" in esquema and len(valor) > esquema["maxItems"]:
            errores.append(f"{ruta}: supera el máximo de {esquema['maxItems']} elemento(s)")
        if esquema.get("uniqueItems") and len({json.dumps(v, sort_keys=True) for v in valor}) != len(valor):
            errores.append(f"{ruta}: elementos repetidos")
        for i, v in enumerate(valor):
            errores += validar(v, esquema.get("items", {}), f"{ruta}[{i}]", raiz)
    if isinstance(valor, dict):
        props = esquema.get("properties", {})
        errores += [f"{ruta}: falta `{k}`" for k in esquema.get("required", []) if k not in valor]
        if esquema.get("additionalProperties") is False:
            errores += [f"{ruta}: campo no permitido `{k}`" for k in valor if k not in props]
        for k, v in valor.items():
            if k in props:
                errores += validar(v, props[k], f"{ruta}.{k}", raiz)
    return errores
