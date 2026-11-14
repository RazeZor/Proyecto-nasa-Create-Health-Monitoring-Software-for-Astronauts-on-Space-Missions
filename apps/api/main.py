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


@app.get("/gold")
def listar():
    """Manifiesto del gold: una entrada por escenario o panel, con su SHA-256."""
    return _manifiesto()


@app.get("/gold/{clave}")
def leer(clave: str, fuente: str | None = None, variable: str | None = None, dia_mision: int | None = None):
    """JSON de un escenario (`ejemplo`) o de un panel (`panel-demo`). Los filtros recortan
    `serie5min` y `diario`; los paneles no los usan."""
    entrada = _manifiesto().get(clave)  # la clave sale del manifiesto: no hay rutas arbitrarias
    archivo = _gold() / f"{clave}.json"
    if entrada is None or not archivo.exists():
        raise HTTPException(404, t("api.error.gold_no_existe", nombre=clave))
    contenido = archivo.read_bytes()
    if hashlib.sha256(contenido).hexdigest() != entrada["sha256"]:
        raise HTTPException(500, t("api.error.gold_alterado", nombre=clave))
    datos = json.loads(contenido)
    filtros = {"fuente": fuente, "serie": None, "variable": variable, "dia_mision": dia_mision}
    for campo in ("serie5min", "diario"):
        if campo in datos:
            datos[campo] = [f for f in datos[campo] if all(v is None or _coincide(f, k, v) for k, v in filtros.items())]
    return datos


def _coincide(fila, campo, valor):
    # t_mision empieza por "D022": en serie5min el día de misión se deduce de ahí
    actual = fila.get(campo, int(fila["t_mision"][1:4]) if campo == "dia_mision" else None)
    return actual == valor
