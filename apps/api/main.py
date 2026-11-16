"""API de solo lectura sobre la zona gold del ETL (pipelines/reanclaje).

No importa el pipeline: lee los JSON que este publica en <DATALAKE_DIR>/gold (regla 3 de la
arquitectura) y comprueba su SHA-256 contra gold/manifest.json antes de servirlos.

  uvicorn main:app --port 8000      (desde apps/api)
"""
import asyncio
import json
import os
import sys
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "packages" / "i18n"))  # monorepo sin instalar

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

import puente_reloj  # noqa: E402
from almacen import conectar, migrar  # noqa: E402
from almacen.cola import avanzar_cola  # noqa: E402
from almacen.reintentos import ConflictoOperacion  # noqa: E402
from gold import DATALAKE_DEFECTO  # noqa: E402, F401
from gold import carpeta as _gold  # noqa: E402, F401
from gold import leer_verificado as _leer_gold_verificado  # noqa: E402
from gold import manifiesto as _manifiesto  # noqa: E402
from i18n import t  # noqa: E402
from rutas_ciencia import router as rutas_ciencia  # noqa: E402
from rutas_dashboard import router as rutas_dashboard  # noqa: E402
from rutas_estudios import router as rutas_estudios  # noqa: E402
from rutas_registro import router as rutas_registro  # noqa: E402
from rutas_seguimiento import router as rutas_seguimiento  # noqa: E402
from seguridad import router as rutas_identidad  # noqa: E402
from transporte import entregar_pendientes, recoger_respuestas  # noqa: E402

DESCRIPCION = (
    "Datos reanclados a la línea de tiempo de misión (informe §3.4), solo lectura. Guía para agentes: AGENTES.md. "
    "`t_mision` = `D022T00:05:00` (día de misión 22, 00:05); `t_real` = hora UTC real del dato; todo dato lleva "
    "`naturaleza: Real`. 404: el ETL no publicó ese nombre; 500: el archivo gold fue alterado (su SHA-256 no "
    "coincide con el manifiesto).")
ERRORES = {404: {"description": "El nombre no existe como este tipo (escenario o panel) en el manifiesto del gold."},
           500: {"description": "El archivo gold no coincide con el SHA-256 del manifiesto. No usar sus datos."}}
RAIZ = Path(__file__).resolve().parents[2]


def cargar_env(ruta=None):
    """Carga el `.env` de la raíz del repo (plantilla: `.env.example`) en `os.environ` con la biblioteca estándar:
    líneas `CLAVE=VALOR` (comillas opcionales, `#` comenta, `export` se tolera). No pisa variables ya definidas ni
    define las vacías. Devuelve `{clave: valor}` de lo que definió, para poder deshacerlo al apagar."""
    definidas = {}
    try:
        lineas = Path(RAIZ / ".env" if ruta is None else ruta).read_text(encoding="utf-8").splitlines()
    except OSError:
        return definidas
    for linea in lineas:
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, _, valor = linea.partition("=")
        clave, valor = clave.removeprefix("export ").strip(), valor.strip()
        if len(valor) >= 2 and valor[0] == valor[-1] and valor[0] in "\"'":
            valor = valor[1:-1]
        if clave and valor and clave not in os.environ:
            os.environ[clave] = definidas[clave] = valor
    return definidas


def _tic():
    """Entrega los reportes cuyo retardo ya pasó (hora real del servidor)."""
    conn = conectar()
    try:
        migrar(conn)
        ahora = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        if os.environ.get("VIGIA_IDENTIDAD_ENSAYO") == "1":
            avanzar_cola(conn, ahora)
        else:
            entregar_pendientes(conn, ahora)
            recoger_respuestas(conn)
    finally:
        conn.close()


async def _reloj(segundos):
    while True:
        await asyncio.sleep(segundos)
        with suppress(Exception):  # shortcut: un fallo suelto no mata el reloj; sin registro de errores todavía
            await asyncio.to_thread(_tic)


@asynccontextmanager
async def ciclo_de_vida(_app):
    """Carga el `.env` de la raíz (sin pisar el entorno) y arranca el reloj de la cola de reportes: cada
    `VIGIA_RELOJ_SEG` s (por defecto 5; 0 lo apaga). Salvo con `SMART_DESACTIVADO=1`, además el puente con el
    servidor del Galaxy Watch (puente_reloj.py; `SMART_URL`, por defecto `ws://127.0.0.1:8765/live`)."""
    cargadas = cargar_env()
    print(_resumen_gold(), file=sys.stderr)
    segundos = float(os.environ.get("VIGIA_RELOJ_SEG", "5"))
    tareas = [asyncio.create_task(_reloj(segundos))] if segundos > 0 else []
    puente_reloj.PUENTE = puente_reloj.crear_puente()
    if puente_reloj.PUENTE:
        tareas.append(asyncio.create_task(puente_reloj.PUENTE.correr()))
    yield
    for tarea in tareas:
        tarea.cancel()
        with suppress(asyncio.CancelledError):
            await tarea
    puente_reloj.PUENTE = None
    for clave in cargadas:  # lo que vino del .env se deshace al apagar (los tests arrancan la app varias veces)
        os.environ.pop(clave, None)


app = FastAPI(lifespan=ciclo_de_vida, title="VIGÍA: API del ETL", description=DESCRIPCION, openapi_tags=[
    {"name": "escenarios", "description": "Gold completo de un escenario: serie de 5 min, resumen diario y eventos."},
    {"name": "paneles", "description": "Panel de entorno ya resumido para la pantalla: dosis, protones, cabina y eventos."},
    {"name": "registro", "description": "Registro de la tripulación en el almacén SQLite: lecturas, alertas y cola."},
    {"name": "reloj", "description": "Galaxy Watch4 en vivo, a través del servidor smart-monitor (SMART_URL)."},
    {"name": "sistema", "description": "Estado del servicio."}])
# shortcut: cualquier origen, sin cookies ni autenticación real (X-Tripulante); acotar `allow_origins` al desplegar
app.add_middleware(CORSMiddleware, allow_origins=[v.strip() for v in os.environ.get("VIGIA_ORIGENES", "").split(",") if v.strip()],
                   allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Content-Type", "X-Vigia-CSRF", "X-Tripulante"], allow_credentials=True)


@app.middleware("http")
async def evitar_cache_privada(request, call_next):
    respuesta = await call_next(request)
    if request.url.path.startswith(("/tripulantes", "/tripulacion", "/reportes", "/sesion", "/escalamientos", "/reloj")):
        respuesta.headers["Cache-Control"] = "no-store"
        respuesta.headers["Vary"] = "Cookie"
    return respuesta
app.include_router(rutas_registro)
app.include_router(rutas_identidad)
app.include_router(rutas_seguimiento)
app.include_router(rutas_estudios)
app.include_router(rutas_dashboard)
app.include_router(rutas_ciencia)
app.include_router(puente_reloj.router)


@app.exception_handler(ValueError)
def dato_invalido(_, e):
    return JSONResponse({"detail": t("api.error.dato_invalido", detalle=str(e))}, status_code=422)


@app.exception_handler(ConflictoOperacion)
def conflicto_operacion(_, e):
    return JSONResponse({"detail": t("api.error.dato_invalido", detalle=str(e))}, status_code=409)
_PERFILES = Path(__file__).resolve().parents[2] / "packages" / "schemas" / "perfiles.json"


def _nombres(es_panel):
    # el manifiesto distingue por su resumen: un escenario cuenta `serie5min`; un panel, `dosis`; la simulación lleva `tipo`
    if es_panel:
        return sorted(c.removeprefix("panel-") for c, e in _manifiesto().items() if "dosis" in e)
    return sorted(c for c, e in _manifiesto().items() if "serie5min" in e)


def _resumen_gold():
    """Lo que se imprime al arrancar: qué gold hay cargado o, si no hay, cómo restaurarlo."""
    paneles, escenarios = _nombres(es_panel=True), _nombres(es_panel=False)
    if not paneles and not escenarios:
        return f"gold: vacío en {_gold()}; la pantalla de entorno saldrá sin datos (restaurar: docs/SETUP.md)"
    return f"gold en {_gold()} | paneles: {', '.join(paneles) or '-'} | escenarios: {', '.join(escenarios) or '-'}"


def _cargar(nombre, es_panel):
    clave = f"panel-{nombre}" if es_panel else nombre  # el prefijo es del ETL, no de la API
    campo = "dosis" if es_panel else "serie5min"
    return _leer_gold_verificado(clave, lambda e: campo in e, nombre_error=nombre)


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


@app.get("/perfiles", tags=["referencia"], summary="Perfiles de misión y presiones de cabina")
def leer_perfiles():
    """Catálogo oficial de los 5 perfiles de misión (§3.3): presión de cabina en mmHg, latencia unidireccional y gravedad.
    Compartido desde `packages/schemas/perfiles.json`."""
    if not _PERFILES.exists():
        raise HTTPException(404, t("api.error.gold_no_existe", nombre="perfiles"))
    return json.loads(_PERFILES.read_text(encoding="utf-8"))


@app.get("/simulacion/caso-referencia", tags=["simulacion"], responses=ERRORES, summary="Caso de referencia del simulador")
def leer_caso_referencia():
    """Caso determinista (semilla 2026) con 14 días pre-vuelo, 30 de vuelo, 4 tripulantes (A1, A2, A3 y control) y
    alertas esperadas para verificar paridad 1:1 del motor híbrido (§5.5). Verificado con SHA-256."""
    return _leer_gold_verificado("caso_referencia", lambda e: e.get("tipo") == "simulacion")


@app.get("/simulacion/kpi", tags=["simulacion"], responses=ERRORES, summary="KPI del simulador reproducible")
def leer_kpi_simulacion():
    """Métricas agregadas del protocolo de 500 misiones con anomalía + 500 de control + semilla 2027 (§5.5).
    Verificado con SHA-256 en el manifiesto Gold."""
    return _leer_gold_verificado("kpi", lambda e: e.get("tipo") == "simulacion")
