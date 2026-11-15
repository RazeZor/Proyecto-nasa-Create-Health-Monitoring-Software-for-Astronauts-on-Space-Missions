"""Lectura verificada de la zona gold del ETL (pipelines/reanclaje). No importa el pipeline: lee los JSON que
publica en <DATALAKE_DIR>/gold y comprueba su SHA-256 contra gold/manifest.json antes de entregarlos."""
import hashlib
import json
import os
from pathlib import Path

from fastapi import HTTPException

from i18n import t

# shortcut: ruta por defecto al data/ del datalake local; en despliegue fijar DATALAKE_DIR
DATALAKE_DEFECTO = Path(__file__).resolve().parents[2] / "pipelines" / "datalake" / "data"


def carpeta():
    return Path(os.environ.get("DATALAKE_DIR") or DATALAKE_DEFECTO) / "gold"


def manifiesto():
    ruta = carpeta() / "manifest.json"
    return json.loads(ruta.read_text(encoding="utf-8")) if ruta.exists() else {}


def leer_verificado(clave, predicado, nombre_error=None):
    """El JSON gold `clave` si está en el manifiesto, cumple `predicado` y su SHA-256 coincide; si no, 404 o 500."""
    entrada = manifiesto().get(clave)  # la clave sale del manifiesto: no hay rutas arbitrarias
    archivo = carpeta() / f"{clave}.json"
    if entrada is None or not predicado(entrada) or not archivo.exists():
        raise HTTPException(404, t("api.error.gold_no_existe", nombre=nombre_error or clave))
    contenido = archivo.read_bytes()
    if hashlib.sha256(contenido).hexdigest() != entrada["sha256"]:
        raise HTTPException(500, t("api.error.gold_alterado", nombre=nombre_error or clave))
    return json.loads(contenido)


def panel(nombre):
    """Panel de entorno publicado para un escenario, o None si el ETL no lo publicó o fue alterado."""
    try:
        return leer_verificado(f"panel-{nombre}", lambda e: "dosis" in e)
    except HTTPException:
        return None
