"""Datalake local de VIGÍA (informe técnico, secciones 3.3 y 4.2).

data/raw/<fuente>/<fecha>/<hora>-<sha8>.<ext>   respuesta original, nunca se sobrescribe
data/curated/<fuente>/<fecha>/<hora>-<sha8>.json filas limpias, hora real en UTC (t_real)
data/manifest.json                               fuente, URL, hora de consulta, SHA-256, filas

Fuentes: goes, donki, radlab, eda. Solo biblioteca estándar.
"""
import csv
import hashlib
import io
import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).parent
ROOT = Path(os.environ.get("DATALAKE_DIR", HERE / "data"))
EDA_DIR = HERE / "eda_manual"  # CSV exportados a mano desde Data Tables de EDA

GOES_URL = "https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json"
GOES_ENERGIAS = {">=10 MeV", ">=50 MeV", ">=100 MeV"}
# Nueva dirección, anterior y espejo (informe 3.3), en ese orden.
DONKI_URLS = [
    "https://ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP",
    "https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP",
    "https://api.nasa.gov/DONKI/SEP",
]
RADLAB_URL = "https://visualization.osdr.nasa.gov/radlab/api/"
RADLAB_COLUMNAS = {"timestamp", "instrument_id", "absorbed_dose_rate", "dose_equivalent_rate"}


class EstructuraInesperada(ValueError):
    """La fuente devolvió otra estructura: no se guarda nada (informe 3.3)."""

    def __init__(self, detalle):
        super().__init__(f"ESTRUCTURA_INESPERADA: {detalle}")


# ---------- limpieza ----------

def _utc(s):
    d = datetime.fromisoformat(s.strip().replace("Z", "+00:00"))
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _lista_json(raw, claves):
    if not raw.strip():  # DONKI: respuesta vacía = sin eventos
        return []
    try:
        data = json.loads(raw)
    except ValueError:
        data = None
    if not isinstance(data, list) or any(
        not isinstance(x, dict) or not claves <= x.keys() for x in data
    ):
        raise EstructuraInesperada(f"se esperaba una lista de objetos con {sorted(claves)}")
    return data


def _numero(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def clean_goes(raw):
    vistos, filas = set(), []
    for x in _lista_json(raw, {"time_tag", "satellite", "flux", "energy"}):
        if x["energy"] not in GOES_ENERGIAS or not _numero(x["flux"]) or x["flux"] < 0:
            continue  # flujos negativos o de relleno
        fila = {"t_real": _utc(x["time_tag"]), "satellite": x["satellite"],
                "energy": x["energy"], "flux": x["flux"]}
        clave = (fila["t_real"], fila["satellite"], fila["energy"])
        if clave not in vistos:
            vistos.add(clave)
            filas.append(fila)
    return filas


def clean_donki(raw):
    vistos, filas = set(), []
    for x in _lista_json(raw, {"sepID", "eventTime"}):
        if x["sepID"] in vistos:
            continue
        vistos.add(x["sepID"])
        filas.append({
            "sepID": x["sepID"],
            "t_real": _utc(x["eventTime"]),
            "instrumentos": [i["displayName"] for i in x.get("instruments") or []],
            "actividades": [e["activityID"] for e in x.get("linkedEvents") or []],
            "link": x.get("link"),
        })
    return filas


def _csv(raw):
    lector = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
    return lector.fieldnames or [], list(lector)


def clean_radlab(raw):
    columnas, filas = _csv(raw)
    if not RADLAB_COLUMNAS <= set(columnas):
        raise EstructuraInesperada(f"faltan columnas {sorted(RADLAB_COLUMNAS - set(columnas))}")
    salida = []
    for f in filas:
        absorbida, equivalente = (f[k].strip() for k in ("absorbed_dose_rate", "dose_equivalent_rate"))
        if not absorbida and not equivalente:
            continue  # sin dosis
        salida.append({
            "t_real": _utc(f["timestamp"]),
            "instrument_id": f["instrument_id"],
            "absorbed_dose_rate": float(absorbida) if absorbida else None,
            "dose_equivalent_rate": float(equivalente) if equivalente else None,
        })
    return salida


def clean_eda(raw):
    columnas, filas = _csv(raw)
    if not columnas:
        raise EstructuraInesperada("CSV sin encabezado")
    return filas  # sin API documentada: las columnas se conservan tal cual


CLEAN = {"goes": clean_goes, "donki": clean_donki, "radlab": clean_radlab, "eda": clean_eda}


# ---------- obtención ----------

def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "vigia-datalake"})
    with urllib.request.urlopen(req, timeout=30) as r:  # HTTPError si no es 2xx
        return r.read()


def _fuentes(fuente, params):
    """Devuelve [(url, bytes, extensión)] de la fuente."""
    if fuente == "goes":
        return [(GOES_URL, _get(GOES_URL), "json")]
    if fuente == "radlab":
        q = {"instrument_id": "", "absorbed_dose_rate": "", "dose_equivalent_rate": "", **(params or {})}
        url = f"{RADLAB_URL}?{urllib.parse.urlencode(q)}"
        return [(url, _get(url), "csv")]
    if fuente == "donki":
        hoy = datetime.now(timezone.utc).date()
        q = {"startDate": str(hoy - timedelta(days=30)), "endDate": str(hoy), **(params or {})}
        errores = []
        for base in DONKI_URLS:
            # la clave solo viaja al espejo, así no queda escrita en el manifiesto de las otras
            extra = {"api_key": os.environ.get("NASA_API_KEY", "DEMO_KEY")} if "api.nasa.gov" in base else {}
            url = f"{base}?{urllib.parse.urlencode({**q, **extra})}"
            try:
                return [(url, _get(url), "json")]
            except OSError as e:
                errores.append(f"{base}: {e}")
        raise ConnectionError("DONKI no responde en ninguna dirección: " + "; ".join(errores))
    if fuente == "eda":
        archivos = sorted(EDA_DIR.glob("*.csv"))
        if not archivos:
            raise FileNotFoundError(f"no hay CSV en {EDA_DIR}")
        return [(str(a), a.read_bytes(), "csv") for a in archivos]
    raise ValueError(f"fuente desconocida: {fuente} (use {sorted(CLEAN)})")


# ---------- almacenamiento ----------

def _manifest_path():
    return ROOT / "manifest.json"


def manifest():
    p = _manifest_path()
    return json.loads(p.read_text()) if p.exists() else []


def ingest(fuente, params=None):
    """Descarga, limpia y guarda. Si la estructura no es la esperada no escribe nada."""
    nuevas = []
    for url, raw, ext in _fuentes(fuente, params):
        filas = CLEAN[fuente](raw)  # puede lanzar EstructuraInesperada antes de escribir
        ahora = datetime.now(timezone.utc)
        sha = hashlib.sha256(raw).hexdigest()
        rel = f"{fuente}/{ahora:%Y-%m-%d}/{ahora:%H%M%S}-{sha[:8]}"
        for zona, ext_z, contenido in (("raw", ext, raw),
                                       ("curated", "json", json.dumps(filas, ensure_ascii=False).encode())):
            destino = ROOT / zona / f"{rel}.{ext_z}"
            destino.parent.mkdir(parents=True, exist_ok=True)
            destino.write_bytes(contenido)
        nuevas.append({"fuente": fuente, "url": url, "consultado": ahora.strftime("%Y-%m-%dT%H:%M:%SZ"),
                       "raw": f"raw/{rel}.{ext}", "curated": f"curated/{rel}.json",
                       "sha256": sha, "filas": len(filas)})
    # shortcut: un solo proceso escribe el manifiesto; con ingestas concurrentes usar un bloqueo
    ROOT.mkdir(parents=True, exist_ok=True)
    _manifest_path().write_text(json.dumps(manifest() + nuevas, indent=2, ensure_ascii=False))
    return nuevas


def read(fuente, desde=None, hasta=None):
    """Filas limpias de la fuente, sin duplicados; desde/hasta son t_real ISO UTC."""
    if fuente not in CLEAN:
        raise ValueError(f"fuente desconocida: {fuente}")
    vistas, filas = set(), []
    for archivo in sorted((ROOT / "curated" / fuente).glob("*/*.json")):
        for f in json.loads(archivo.read_text()):
            t = f.get("t_real")
            if t and ((desde and t < desde) or (hasta and t > hasta)):
                continue
            clave = json.dumps(f, sort_keys=True)
            if clave not in vistas:
                vistas.add(clave)
                filas.append(f)
    return filas
