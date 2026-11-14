"""API de solo lectura sobre la zona gold del ETL (pipelines/reanclaje).

No importa el pipeline: lee los JSON que este publica en <DATALAKE_DIR>/gold (regla 3 de la
arquitectura) y comprueba su SHA-256 contra gold/manifest.json antes de servirlos.

  uvicorn main:app --port 8000      (desde apps/api)
"""
import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Literal

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "packages" / "i18n"))  # monorepo sin instalar

from fastapi import FastAPI, HTTPException  # noqa: E402
from i18n import t  # noqa: E402

app = FastAPI(title="VIGÍA: API del ETL")
# shortcut: ruta por defecto al data/ del datalake local; en despliegue fijar DATALAKE_DIR
DATALAKE_DEFECTO = Path(__file__).resolve().parents[2] / "pipelines" / "datalake" / "data"


def _gold():
    return Path(os.environ.get("DATALAKE_DIR", DATALAKE_DEFECTO)) / "gold"


def _manifiesto():
    ruta = _gold() / "manifest.json"
    return json.loads(ruta.read_text()) if ruta.exists() else {}


@app.get("/salud")
def salud():
    return {"estado": "ok"}


def _nombres(es_panel):
    # el manifiesto distingue por su resumen: un escenario cuenta `serie5min`; un panel, `dosis`
    return sorted(c.removeprefix("panel-") if es_panel else c
                  for c, e in _manifiesto().items() if ("serie5min" not in e) == es_panel)


def _cargar(nombre, es_panel):
    clave = f"panel-{nombre}" if es_panel else nombre  # el prefijo es del ETL, no de la API
    entrada = _manifiesto().get(clave)  # la clave sale del manifiesto: no hay rutas arbitrarias
    archivo = _gold() / f"{clave}.json"
    if entrada is None or ("serie5min" not in entrada) != es_panel or not archivo.exists():
        raise HTTPException(404, t("api.error.gold_no_existe", nombre=nombre))
    contenido = archivo.read_bytes()
    if hashlib.sha256(contenido).hexdigest() != entrada["sha256"]:
        raise HTTPException(500, t("api.error.gold_alterado", nombre=nombre))
    return json.loads(contenido)


def _filtrar(filas, fuente, variable, dia_mision):
    return [f for f in filas if all(v is None or _coincide(f, k, v) for k, v in
                                    (("fuente", fuente), ("variable", variable), ("dia_mision", dia_mision)))]


def _coincide(fila, campo, valor):
    # en serie5min no hay dia_mision: se deduce de t_mision ("D022T...")
    return fila.get(campo, int(fila["t_mision"][1:4]) if campo == "dia_mision" else None) == valor


@app.get("/escenarios")
def listar_escenarios():
    return _nombres(es_panel=False)


@app.get("/escenarios/{nombre}")
def leer_escenario(nombre: str, fuente: str | None = None, variable: str | None = None, dia_mision: int | None = None):
    """Gold completo; los filtros recortan `serie5min` y `diario`."""
    datos = _cargar(nombre, es_panel=False)
    for campo in ("serie5min", "diario"):
        datos[campo] = _filtrar(datos[campo], fuente, variable, dia_mision)
    return datos


@app.get("/escenarios/{nombre}/serie")
def leer_serie(nombre: str, fuente: str | None = None, variable: str | None = None, dia_mision: int | None = None):
    return _filtrar(_cargar(nombre, False)["serie5min"], fuente, variable, dia_mision)


@app.get("/escenarios/{nombre}/diario")
def leer_diario(nombre: str, fuente: str | None = None, variable: str | None = None, dia_mision: int | None = None):
    return _filtrar(_cargar(nombre, False)["diario"], fuente, variable, dia_mision)


@app.get("/paneles")
def listar_paneles():
    return _nombres(es_panel=True)


@app.get("/paneles/{nombre}")
def leer_panel(nombre: str):
    return _cargar(nombre, es_panel=True)


@app.get("/paneles/{nombre}/{seccion}")
def leer_seccion(nombre: str, seccion: Literal["dosis", "protones", "cabina", "eventos"]):
    return _cargar(nombre, es_panel=True)[seccion]
