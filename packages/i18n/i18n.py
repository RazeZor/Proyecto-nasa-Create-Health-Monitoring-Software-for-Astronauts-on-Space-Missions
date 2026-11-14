"""Traducciones de VIGÍA: español es el idioma principal e inglés el secundario.

Los catálogos están en locales/<idioma>.json. es.json es la fuente de verdad y el
único obligatorio. en.json es secundario: puede ir atrasado, y una clave que falte
ahí cae al español. Una clave que falte en ambos devuelve la propia clave, para
que se note. El idioma sale del argumento o de VIGIA_LANG. Solo biblioteca estándar.

  python packages/i18n/i18n.py        lista las traducciones al inglés pendientes
"""
import json
import os
from functools import lru_cache
from pathlib import Path

LOCALES = Path(__file__).parent / "locales"
PRINCIPAL = "es"
IDIOMAS = ("es", "en")


def _aplanar(datos, prefijo=""):
    plano = {}
    for clave, valor in datos.items():
        ruta = f"{prefijo}{clave}"
        if isinstance(valor, dict):
            plano.update(_aplanar(valor, ruta + "."))
        else:
            plano[ruta] = valor
    return plano


@lru_cache(maxsize=None)
def catalogo(idioma):
    """{clave.con.puntos: texto} del idioma."""
    return _aplanar(json.loads((LOCALES / f"{idioma}.json").read_text(encoding="utf-8")))


def normalizar(idioma):
    """'en-US', 'EN_us' → 'en'; cualquier idioma no soportado → el principal."""
    base = (idioma or "").replace("_", "-").split("-")[0].lower()
    return base if base in IDIOMAS else PRINCIPAL


def idioma_actual():
    return normalizar(os.environ.get("VIGIA_LANG"))


class _Faltantes(dict):
    def __missing__(self, clave):
        return "{" + clave + "}"  # una variable sin valor queda visible en vez de romper


def t(clave, idioma=None, **variables):
    """Texto traducido de la clave, con {variables} reemplazadas."""
    idioma = normalizar(idioma) if idioma else idioma_actual()
    texto = catalogo(idioma).get(clave) or catalogo(PRINCIPAL).get(clave) or clave
    return texto.format_map(_Faltantes(variables)) if variables else texto


def pendientes(idioma="en"):
    """Claves de es.json que aún no están traducidas en el idioma secundario."""
    return sorted(set(catalogo(PRINCIPAL)) - set(catalogo(idioma)))


if __name__ == "__main__":
    import sys
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    faltan = pendientes()
    print(f"Traducciones al inglés pendientes: {len(faltan)} (no bloquea; se muestra el español)")
    for clave in faltan:
        print(f"  {clave}: {catalogo(PRINCIPAL)[clave]!r}")
