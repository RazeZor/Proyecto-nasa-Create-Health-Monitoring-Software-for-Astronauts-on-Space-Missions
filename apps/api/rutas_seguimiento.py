"""Contratos HTTP de acciones, nueva medición y revisión de episodios."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, StrictInt

from almacen import episodios
from i18n import t
from rutas_dashboard import propio_o_clinico
from rutas_registro import actor, conexion

router = APIRouter(tags=["seguimiento"])


class EventoIn(BaseModel):
    model_config = {"extra": "forbid"}
    id: str = Field(min_length=1, max_length=200)
    episodio_id: str = Field(min_length=1, max_length=200)
    clave: str = Field(min_length=1, max_length=200)
    indicador: str = Field(min_length=1, max_length=100)
    tipo: Literal["abrir", "accion", "impedimento", "remedicion", "solicitar_revision", "cerrar", "reabrir"]
    nota: str = Field(min_length=1, max_length=2000)
    observaciones: list[str] = Field(default_factory=list, max_length=100)
    t_real: str
    version_previa: StrictInt = Field(ge=0)
    protocolo_version: Literal["episodios-v1"] = "episodios-v1"
    catalogo_version: Literal["acciones-seguimiento-v1"] = "acciones-seguimiento-v1"


@router.post("/tripulantes/{id}/episodios/eventos", status_code=201)
def registrar(cuerpo: EventoIn, id: int = Depends(propio_o_clinico), quien: int = Depends(actor), conn=Depends(conexion)):
    """Registra una transición con versión esperada; el cierre requiere revisión médica de la misma misión."""
    try:
        return episodios.registrar(conn, id, quien, cuerpo.model_dump())
    except PermissionError:
        raise HTTPException(403, t("api.error.sin_permiso")) from None


@router.get("/tripulantes/{id}/episodios")
def listar(id: int = Depends(propio_o_clinico), conn=Depends(conexion)):
    """Devuelve estados e historial de acciones, con permisos y auditoría del historial clínico."""
    return episodios.listar(conn, id)
