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
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from i18n import t  # noqa: E402
from rutas_registro import router as rutas_registro  # noqa: E402

DESCRIPCION = (
    "Datos reanclados a la línea de tiempo de misión (informe §3.4), solo lectura. Guía para agentes: AGENTES.md. "
    "`t_mision` = `D022T00:05:00` (día de misión 22, 00:05); `t_real` = hora UTC real del dato; todo dato lleva "
    "`naturaleza: Real`. 404: el ETL no publicó ese nombre; 500: el archivo gold fue alterado (su SHA-256 no "
    "coincide con el manifiesto).")
ERRORES = {404: {"description": "El nombre no existe como este tipo (escenario o panel) en el manifiesto del gold."},
           500: {"description": "El archivo gold no coincide con el SHA-256 del manifiesto. No usar sus datos."}}

app = FastAPI(title="VIGÍA: API del ETL", description=DESCRIPCION, openapi_tags=[
    {"name": "escenarios", "description": "Gold completo de un escenario: serie de 5 min, resumen diario y eventos."},
    {"name": "paneles", "description": "Panel de entorno ya resumido para la pantalla: dosis, protones, cabina y eventos."},
    {"name": "registro", "description": "Registro de la tripulación en el almacén SQLite: lecturas, alertas y cola."},
    {"name": "sistema", "description": "Estado del servicio."}])
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])
app.include_router(rutas_registro)


@app.exception_handler(ValueError)
def dato_invalido(_, e):
    return JSONResponse({"detail": t("api.error.dato_invalido", detalle=str(e))}, status_code=422)
# shortcut: ruta por defecto al data/ del datalake local; en despliegue fijar DATALAKE_DIR
DATALAKE_DEFECTO = Path(__file__).resolve().parents[2] / "pipelines" / "datalake" / "data"


def _gold():
    return Path(os.environ.get("DATALAKE_DIR", DATALAKE_DEFECTO)) / "gold"


def _manifiesto():
    ruta = _gold() / "manifest.json"
    return json.loads(ruta.read_text()) if ruta.exists() else {}


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


@app.get("/salud", tags=["sistema"], summary="Estado del servicio")
def salud():
    """Devuelve {"estado": "ok"} si el servicio responde. No toca el gold."""
    return {"estado": "ok"}


@app.get("/escenarios", tags=["escenarios"], summary="Lista los escenarios publicados")
def listar_escenarios():
    """Lista de `nombre` válidos para `/escenarios/{nombre}`. Vacía si el ETL no ha publicado nada."""
    return _nombres(es_panel=False)


@app.get("/escenarios/{nombre}", tags=["escenarios"], responses=ERRORES, summary="Gold completo de un escenario")
def leer_escenario(nombre: str, fuente: str | None = None, variable: str | None = None, dia_mision: int | None = None):
    """Objeto con `escenario`, `ventanas` (fuente y fechas reales de cada serie), `serie5min`, `diario` y `eventos`
    (DONKI). Los filtros recortan `serie5min` y `diario`; `eventos` no se filtra. Puede ser grande (cientos de filas):
    para una sola parte usa `/serie` o `/diario`. Filtros opcionales: `fuente` (goes|radlab|eda), `variable` y `dia_mision` (entero)."""
    datos = _cargar(nombre, es_panel=False)
    for campo in ("serie5min", "diario"):
        datos[campo] = _filtrar(datos[campo], fuente, variable, dia_mision)
    return datos


@app.get("/escenarios/{nombre}/serie", tags=["escenarios"], responses=ERRORES, summary="Serie de 5 minutos")
def leer_serie(nombre: str, fuente: str | None = None, variable: str | None = None, dia_mision: int | None = None):
    """Lista de puntos `{t_mision, t_real, fuente, serie, variable, valor, n, naturaleza}`. `n` = lecturas dentro
    del paso; el valor es el máximo en flujo de protones y CO2, y el promedio en el resto. Filtros opcionales: `fuente` (goes|radlab|eda), `variable` y `dia_mision` (entero)."""
    return _filtrar(_cargar(nombre, False)["serie5min"], fuente, variable, dia_mision)


@app.get("/escenarios/{nombre}/diario", tags=["escenarios"], responses=ERRORES, summary="Resumen por día de misión")
def leer_diario(nombre: str, fuente: str | None = None, variable: str | None = None, dia_mision: int | None = None):
    """Lista de `{dia_mision, fuente, serie, variable, max, bins}` más `dosis` (en las tasas de dosis, µGy o µSv
    del día) y `max_prom_horario` (CO2). `bins` = pasos de 5 min con datos, de 288 posibles: con huecos la dosis es
    parcial. Filtros opcionales: `fuente` (goes|radlab|eda), `variable` y `dia_mision` (entero)."""
    return _filtrar(_cargar(nombre, False)["diario"], fuente, variable, dia_mision)


@app.get("/paneles", tags=["paneles"], summary="Lista los paneles publicados")
def listar_paneles():
    """Lista de `nombre` válidos para `/paneles/{nombre}`; coincide con el escenario del que sale cada panel."""
    return _nombres(es_panel=True)


@app.get("/paneles/{nombre}", tags=["paneles"], responses=ERRORES, summary="Panel de entorno completo")
def leer_panel(nombre: str):
    """Objeto con `limites`, `perfiles_presion_mmhg`, `ventanas`, `aviso`, `dosis` (puede ser null), `protones`,
    `cabina` y `eventos`. Leer `aviso` y `dosis.orientativa` antes de comparar con un límite. Ver AGENTES.md."""
    return _cargar(nombre, es_panel=True)


@app.get("/paneles/{nombre}/{seccion}", tags=["paneles"], responses=ERRORES, summary="Una sección del panel")
def leer_seccion(nombre: str, seccion: Literal["dosis", "protones", "cabina", "eventos"]):
    """Solo `dosis` (objeto o null), `protones`, `cabina` o `eventos` (listas). Otra sección da 422."""
    return _cargar(nombre, es_panel=True)[seccion]
