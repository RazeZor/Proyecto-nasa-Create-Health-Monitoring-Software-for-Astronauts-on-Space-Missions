"""Archivo de sesiones experimentales: no equivale a evaluación clínica independiente."""
import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from almacen.reintentos import ConflictoOperacion
from almacen.tripulacion import _utc
from rutas_registro import conexion, propio

router = APIRouter(tags=["investigacion"])


class ArtefactoIn(BaseModel):
    model_config = {"extra": "forbid", "allow_inf_nan": False}
    id: str = Field(min_length=1, max_length=200)
    t_real: str
    tipo: str
    protocolo: str
    datos: dict


@router.post("/tripulantes/{id}/estudios", status_code=201)
def guardar(cuerpo: ArtefactoIn, id: int = Depends(propio), conn=Depends(conexion)):
    """Conserva un diario o práctica experimental propios, con versión de protocolo y acuse idempotente."""
    _utc(cuerpo.t_real)
    if cuerpo.tipo == "sueno_contexto":
        datos = cuerpo.datos
        if cuerpo.protocolo != "diario-sueno-v1" or datos.get("metodo") not in ("diario", "estimado"):
            raise ValueError("método o protocolo no reconocido")
        for campo, maximo in (("horas", 24), ("carga", 10)):
            v = datos.get(campo)
            if v is not None and (type(v) not in (int, float) or not 0 <= v <= maximo):
                raise ValueError("autoinforme fuera del dominio del formulario")
        if not isinstance(datos.get("turno"), str) or len(datos["turno"]) > 100:
            raise ValueError("turno inválido")
    elif cuerpo.tipo == "reaccion":
        datos = cuerpo.datos
        if cuerpo.protocolo != "reaccion-practica-v1" or datos.get("comparable") is not False or datos.get("practica") is not True:
            raise ValueError("la tarea solo se admite como práctica experimental no comparable")
        ensayos = datos.get("ensayos")
        if not isinstance(ensayos, list) or not 0 <= len(ensayos) <= 5 or (not ensayos and datos.get("interrumpida") is not True):
            raise ValueError("número de ensayos inválido")
        for ensayo in ensayos:
            if not isinstance(ensayo, dict) or any(type(ensayo.get(k)) not in (int, float) for k in ("estimulo_ms", "respuesta_ms", "fotograma_ms")):
                raise ValueError("ensayo sin tiempos instrumentados")
    elif cuerpo.tipo == "evaluacion_motor":
        datos = cuerpo.datos
        if cuerpo.protocolo != "motor-ts-v1.2" or datos.get("version") != "evaluacion-v1" or datos.get("origen") != "cliente_reproducible_no_revision_independiente":
            raise ValueError("protocolo de evaluación no reconocido")
        if not isinstance(datos.get("motor_sha256"), str) or len(datos["motor_sha256"]) != 64 or any(c not in "0123456789abcdef" for c in datos["motor_sha256"]):
            raise ValueError("huella de motor inválida")
        if not isinstance(datos.get("entrada"), dict) or not isinstance(datos.get("salida"), dict):
            raise ValueError("traza sin entrada o salida")
    else:
        raise ValueError("tipo de estudio desconocido")
    contenido = json.dumps(cuerpo.model_dump(), ensure_ascii=False, sort_keys=True, allow_nan=False)
    if len(contenido.encode()) > 100000:
        raise ValueError("artefacto demasiado grande")
    with conn:
        conn.execute("INSERT INTO evaluacion VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING", (cuerpo.id, id, cuerpo.t_real, contenido))
        fila = conn.execute("SELECT * FROM evaluacion WHERE id = ?", (cuerpo.id,)).fetchone()
        if fila["tripulante_id"] != id or fila["contenido"] != contenido:
            raise ConflictoOperacion("identificador de artefacto reutilizado")
    return {"id": cuerpo.id}


@router.get("/tripulantes/{id}/estudios")
def listar(id: int = Depends(propio), conn=Depends(conexion)):
    """Lista exclusivamente los artefactos experimentales del propietario autenticado."""
    return [json.loads(f[0]) for f in conn.execute("SELECT contenido FROM evaluacion WHERE tripulante_id = ? ORDER BY t_real, id", (id,))]
