"""Valida las referencias científicas del informe contra Crossref y Europe PMC.

Para cada referencia de `referencias.json` comprueba tres cosas:

1. El DOI existe en Crossref.
2. El título devuelto contiene las palabras esperadas (detecta DOI que apuntan a otro artículo).
3. El resumen de Europe PMC, y si hace falta el texto completo, contiene la cifra que cita el informe.

Uso:
    python tools/validar-referencias/validar_referencias.py [--salida resultado.json] [--solo id1,id2]

Sale con código 1 si algún DOI no existe o apunta a otro artículo. Una cifra que no
aparece en el texto es un aviso (REVISAR_TEXTO), porque muchos textos completos no son
de acceso abierto.
"""
import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from urllib.error import HTTPError

CATALOGO = Path(__file__).with_name("referencias.json")
CROSSREF_URL = "https://api.crossref.org/works/"
EUROPEPMC_URL = "https://www.ebi.ac.uk/europepmc/webservices/rest/"
CABECERAS = {"User-Agent": "vigia-validar-referencias/0.1"}
PAUSA_S = 0.3

OK = "OK"
DOI_NO_EXISTE = "DOI_NO_EXISTE"
REVISAR_TITULO = "REVISAR_TITULO"
REVISAR_TEXTO = "REVISAR_TEXTO"
FUENTE_NO_DISPONIBLE = "FUENTE_NO_DISPONIBLE"
FALLOS = {DOI_NO_EXISTE, REVISAR_TITULO}


class FuenteNoDisponible(OSError):
    """Una consulta fallida no demuestra que un DOI no exista."""


def _get(url, como_json=True):
    """Devuelve None solo ante 404; red, servidor o respuesta ilegible no equivalen a DOI inexistente."""
    for intento in range(3):
        try:
            peticion = urllib.request.Request(url, headers=CABECERAS)
            with urllib.request.urlopen(peticion, timeout=20) as r:
                return json.load(r) if como_json else r.read().decode("utf-8", "replace")
        except HTTPError as error:
            if error.code == 404:
                return None
            time.sleep(1 + intento)
        except (OSError, ValueError):
            time.sleep(1 + intento)
    raise FuenteNoDisponible("consulta no verificable tras tres intentos")


def crossref(doi):
    """Metadatos de Crossref: título, revista, año y primeros autores, o None."""
    d = _get(CROSSREF_URL + urllib.parse.quote(doi))
    if not d or "message" not in d:
        return None
    m = d["message"]
    return {
        "titulo": (m.get("title") or [""])[0],
        "revista": (m.get("container-title") or [""])[0],
        "anio": ((m.get("issued", {}).get("date-parts") or [[None]])[0] or [None])[0],
        "autores": [a.get("family", "") for a in m.get("author", [])][:3],
    }


def europepmc(doi):
    """Resumen y PMCID del artículo en Europe PMC: (resumen, pmcid)."""
    q = urllib.parse.quote(f'DOI:"{doi}"')
    d = _get(f"{EUROPEPMC_URL}search?query={q}&resultType=core&format=json")
    res = ((d or {}).get("resultList") or {}).get("result") or []
    if not res:
        return "", None
    return res[0].get("abstractText") or "", res[0].get("pmcid")


def texto_completo(pmcid):
    """Texto plano del artículo completo (solo acceso abierto), o cadena vacía."""
    if not pmcid:
        return ""
    xml = _get(f"{EUROPEPMC_URL}{pmcid}/fullTextXML", como_json=False) or ""
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", xml))


def faltantes(frases, texto):
    """Frases que no aparecen en el texto, sin distinguir mayúsculas."""
    t = texto.lower()
    return [f for f in frases if f.lower() not in t]


def evaluar(ref, meta, resumen, texto=""):
    """Calcula el estado de una referencia a partir de lo descargado. Sin IO."""
    if meta is None:
        return {"estado": DOI_NO_EXISTE}
    if faltantes(ref.get("titulo_contiene", []), meta["titulo"]):
        return {"estado": REVISAR_TITULO}
    falta = faltantes(ref.get("resumen_contiene", []), meta["titulo"] + " " + resumen)
    falta += faltantes(ref.get("texto_contiene", []), texto)
    return {"estado": REVISAR_TEXTO if falta else OK, "faltan": falta}


def validar(ref):
    """Descarga y evalúa una referencia."""
    meta = None
    try:
        meta = crossref(ref["doi"])
        resumen, pmcid = europepmc(ref["doi"]) if meta else ("", None)
        texto = texto_completo(pmcid) if meta and ref.get("texto_contiene") else ""
    except FuenteNoDisponible:
        return {"id": ref["id"], "doi": ref["doi"], "pmcid": None, "crossref": meta, "estado": FUENTE_NO_DISPONIBLE}
    return {"id": ref["id"], "doi": ref["doi"], "pmcid": pmcid, "crossref": meta,
            **evaluar(ref, meta, resumen, texto)}


def main(argv=None):
    p = argparse.ArgumentParser(description="Valida las referencias del informe.")
    p.add_argument("--catalogo", default=str(CATALOGO))
    p.add_argument("--salida", help="Guarda el resultado completo en JSON")
    p.add_argument("--solo", help="Ids separados por coma")
    args = p.parse_args(argv)
    refs = json.loads(Path(args.catalogo).read_text(encoding="utf-8"))
    if args.solo:
        ids = set(args.solo.split(","))
        refs = [r for r in refs if r["id"] in ids]
    resultados = []
    for ref in refs:
        r = validar(ref)
        resultados.append(r)
        titulo = (r["crossref"] or {}).get("titulo", "")[:70]
        print(f"{r['estado']:15} {r['id']:16} {titulo}", flush=True)
        if r.get("faltan"):
            print(f"{'':15} faltan: {r['faltan']}")
        time.sleep(PAUSA_S)
    if args.salida:
        Path(args.salida).write_text(json.dumps(resultados, ensure_ascii=False, indent=1),
                                     encoding="utf-8")
    fallos = [r["id"] for r in resultados if r["estado"] in FALLOS]
    print(f"{len(resultados)} referencias, {len(fallos)} con DOI erróneo: {', '.join(fallos) or '-'}")
    no_verificadas = sum(r["estado"] == FUENTE_NO_DISPONIBLE for r in resultados)
    print(f"{no_verificadas} referencias no verificables por fallo de consulta; OK solo comprueba título y fragmentos, no aval profesional.")
    return 1 if fallos else 2 if no_verificadas else 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
