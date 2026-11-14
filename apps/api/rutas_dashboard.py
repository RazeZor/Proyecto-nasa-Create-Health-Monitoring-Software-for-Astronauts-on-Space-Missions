"""Lo que el tablero necesita además del gold y del registro: fichas, referencia de entorno y, por tripulante,
historial, recordatorios y mensajes. La app no guarda datos de ejemplo: los que aún no salen de una fuente real
viven aquí (apps/api/demo/ y el caso de referencia del simulador) y se rotulan `Simulado`.
"""
import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from almacen import cola, tripulacion
from i18n import t
from rutas_registro import ERRORES, conexion, propio

router = APIRouter(tags=["tablero"])
_RAIZ = Path(__file__).resolve().parents[2]
_FICHAS = _RAIZ / "packages" / "schemas" / "fichas"
_CASO = _RAIZ / "packages" / "engine" / "fixtures" / "caso-referencia.json"
_DEMO = Path(__file__).resolve().parent / "demo"
DIA_ACTUAL_DEMO = 24  # shortcut: día de misión fijo de la demo; derivarlo de mision.dia1_t_real cuando la UI use t_real


def _json(ruta):
    return json.loads(ruta.read_text(encoding="utf-8"))


def _ids_fichas():
    return _json(_FICHAS / "index.json")


@router.get("/fichas", summary="Fichas de los indicadores")
def listar_fichas():
    """Todas las fichas validadas (`packages/schemas/fichas`, esquema `ficha.schema.json`), en el orden del índice."""
    return [_json(_FICHAS / f"{i}.json") for i in _ids_fichas()]


@router.get("/fichas/{id}", responses={404: {"description": "No hay ficha con ese id."}}, summary="Una ficha")
def leer_ficha(id: str):
    """Una ficha (`que_es`, `como_se_mide_en_vuelo` por perfil, `por_que`, `cuando_avisar`, `fuentes`...)."""
    if id not in _ids_fichas():  # el id sale del índice: no hay rutas arbitrarias
        raise HTTPException(404, t("api.error.gold_no_existe", nombre=id))
    return _json(_FICHAS / f"{id}.json")


@router.get("/entorno/referencia", summary="Límites, fuentes y dosis previa de carrera")
def referencia_entorno():
    """Límites de radiación y CO2, umbral de tormenta y fuentes del panel. `dosis_previa_carrera_msv` es simulada."""
    return _json(_DEMO / "entorno_referencia.json")


@router.get("/tripulantes/{id}/historial", responses=ERRORES, summary="Historial fisiológico del tripulante")
def historial(id: int = Depends(propio)):
    """Escenario de partida para el motor: `lecturas` de 14 días de prevuelo (días <= 0) y 30 de vuelo, y
    `entorno_diario` (CO2 y tormenta por día). `naturaleza: Simulado`: sale del caso de referencia del simulador
    (§5.5). Los registros reales del tripulante están en `/tripulantes/{id}/lecturas`."""
    caso = _json(_CASO)
    # shortcut: cada tripulante recibe un tripulante simulado por turno; asignar uno propio al sembrar la misión
    simulado = caso["tripulantes"][(id - 1) % len(caso["tripulantes"])]
    return {"naturaleza": caso["naturaleza"], "dias_prevuelo": caso["dias_prevuelo"], "dias_vuelo": caso["dias_vuelo"],
            "dia_actual": DIA_ACTUAL_DEMO, "entorno_diario": caso["entorno_diario"], "lecturas": simulado["lecturas"]}


@router.get("/tripulantes/{id}/recordatorios", responses=ERRORES, summary="Recordatorios del día")
def recordatorios(id: int = Depends(propio)):
    """Lista de textos. Simulado: aún no hay plan de actividades a bordo."""
    return _json(_DEMO / "recordatorios.json")


@router.get("/tripulantes/{id}/mensajes", responses=ERRORES, summary="Hilo con tierra")
def mensajes(id: int = Depends(propio), conn=Depends(conexion)):
    """`{id, de: astronaut|surgeon, autor, dia, hora, texto}`: el hilo de ejemplo más las respuestas reales de tierra
    a los reportes del tripulante."""
    hilo = _json(_DEMO / "mensajes.json")
    for r in cola.leer_reportes(conn, id):
        if r["estado"] == "respondido":
            dia = tripulacion.dia_de_vuelo(conn, id, r["llega_t_real"]) or 1
            hilo.append({"id": f"r{r['id']}", "de": "surgeon", "autor": "Cirujano de Vuelo",
                         # shortcut: la UI vive en el día de demo; la hora real se ancla a él hasta reconciliar días
                         "dia": min(dia, DIA_ACTUAL_DEMO), "hora": r["llega_t_real"][11:16], "texto": r["respuesta"]})
    return hilo
