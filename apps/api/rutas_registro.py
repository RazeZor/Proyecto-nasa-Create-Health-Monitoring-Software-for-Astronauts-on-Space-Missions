"""Endpoints de registro de la tripulación sobre el almacén SQLite (ver almacen/ y AGENTES.md).

shortcut: el tripulante se declara en la cabecera X-Tripulante sin autenticación real; reemplazar por
sesión firmada antes de uso fuera de localhost. Los datos personales solo los lee su dueño; las alertas
las ve el dueño y, si son rojas, su destinatario (privacidad §5.4).
"""
import sqlite3

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, StrictFloat, StrictInt

from almacen import alertas, base, cola, conectar, lecturas, migrar
from i18n import t

Numero = StrictInt | StrictFloat  # sin coerción: "97" y true no son números
router = APIRouter(tags=["registro"])
ERRORES = {401: {"description": "Falta la cabecera X-Tripulante o no es un tripulante conocido."},
           403: {"description": "El recurso pertenece a otro tripulante."},
           422: {"description": "Dato inválido (formato de t_real, indicador, rango, etc.)."}}


def conexion():
    conn = conectar()
    migrar(conn)
    try:
        yield conn
    finally:
        conn.close()


def actor(x_tripulante: str | None = Header(None), conn=Depends(conexion)) -> int:
    existe = x_tripulante and x_tripulante.isdigit() and conn.execute(
        "SELECT 1 FROM tripulante WHERE id = ?", (int(x_tripulante),)).fetchone()
    if not existe:
        raise HTTPException(401, t("api.error.actor_desconocido"))
    return int(x_tripulante)


def propio(id: int, quien: int = Depends(actor)) -> int:
    if id != quien:
        raise HTTPException(403, t("api.error.sin_permiso"))
    return id


class LecturaIn(BaseModel):
    indicador: str
    valor: Numero
    t_real: str
    origen: str = "manual"
    metodo: str | None = None
    naturaleza: str = "Simulado"


class SintomaIn(BaseModel):
    codigo: str
    gravedad: StrictInt
    t_real: str


class LineaBaseIn(BaseModel):
    mediana: Numero
    mad: Numero
    n: StrictInt
    desde: str
    hasta: str


class AlertaIn(BaseModel):
    indicador: str
    capa: str
    nivel: str
    valor: Numero
    t_real: str
    explicacion: str
    regla_version: str
    tramo: str | None = None


class ReporteIn(BaseModel):
    creado_t_real: str
    retardo_min: StrictInt


class ContextoIn(BaseModel):
    texto: str


class RespuestaIn(BaseModel):
    respuesta: str
    t_real: str


class AvanceIn(BaseModel):
    ahora: str


@router.post("/tripulantes/{id}/lecturas", status_code=201, responses=ERRORES, summary="Registra una lectura")
def crear_lectura(cuerpo: LecturaIn, id: int = Depends(propio), conn=Depends(conexion)):
    """Guarda una lectura de un indicador (`spo2`, `sueno`, …). Reenviar la misma (indicador, t_real, origen) devuelve
    el mismo `id`. `t_mision` se calcula; antes del día 1 de la misión queda null (línea base de tierra)."""
    return {"id": lecturas.registrar_lectura(conn, id, **cuerpo.model_dump())}


@router.get("/tripulantes/{id}/lecturas", responses=ERRORES, summary="Lista las lecturas propias")
def listar_lecturas(indicador: str | None = None, desde: str | None = None, hasta: str | None = None,
                    id: int = Depends(propio), conn=Depends(conexion)):
    """Lecturas del tripulante por `t_real`; filtros opcionales `indicador`, `desde` y `hasta` (UTC)."""
    return lecturas.leer_lecturas(conn, id, indicador, desde, hasta)


@router.post("/tripulantes/{id}/sintomas", status_code=201, responses=ERRORES, summary="Registra un síntoma")
def crear_sintoma(cuerpo: SintomaIn, id: int = Depends(propio), conn=Depends(conexion)):
    """Guarda un síntoma con `codigo` y `gravedad` de 1 a 3."""
    return {"id": lecturas.registrar_sintoma(conn, id, **cuerpo.model_dump())}


@router.get("/tripulantes/{id}/sintomas", responses=ERRORES, summary="Lista los síntomas propios")
def listar_sintomas(desde: str | None = None, hasta: str | None = None, id: int = Depends(propio),
                    conn=Depends(conexion)):
    """Síntomas del tripulante por `t_real`; filtros opcionales `desde` y `hasta`."""
    return lecturas.leer_sintomas(conn, id, desde, hasta)


@router.put("/tripulantes/{id}/linea-base/{indicador}/{origen}", responses=ERRORES,
            summary="Guarda la línea base de un indicador")
def guardar_linea_base(indicador: str, origen: str, cuerpo: LineaBaseIn, id: int = Depends(propio),
                       conn=Depends(conexion)):
    """Reemplaza la mediana y el MAD de un indicador para `origen` = tierra o vuelo."""
    base.guardar_linea_base(conn, id, indicador, origen, **cuerpo.model_dump())
    return {"ok": True}


@router.get("/tripulantes/{id}/linea-base/{indicador}/{origen}", responses={**ERRORES, 404: {"description": "No hay línea base."}},
            summary="Lee la línea base de un indicador")
def leer_linea_base(indicador: str, origen: str, id: int = Depends(propio), conn=Depends(conexion)):
    """Devuelve `mediana`, `mad`, `n`, `desde` y `hasta`; 404 si no existe."""
    fila = base.obtener_linea_base(conn, id, indicador, origen)
    if fila is None:
        raise HTTPException(404, t("api.error.linea_base_no_existe"))
    return fila


@router.post("/tripulantes/{id}/alertas", status_code=201, responses=ERRORES, summary="Registra una alerta del motor")
def crear_alerta(cuerpo: AlertaIn, id: int = Depends(propio), conn=Depends(conexion)):
    """Guarda la alerta (solo adición). Una roja de la capa A escala al oficial médico (o al comandante si el afectado
    es el oficial) y devuelve `escalamiento_id`; sin consentimiento o destinatario es null y queda en auditoría."""
    alerta_id = alertas.registrar_alerta(conn, id, **cuerpo.model_dump())
    esc = conn.execute("SELECT id FROM escalamiento WHERE alerta_id = ?", (alerta_id,)).fetchone()
    return {"id": alerta_id, "escalamiento_id": esc[0] if esc else None}


@router.get("/tripulantes/{id}/alertas", responses={401: ERRORES[401]}, summary="Lista las alertas visibles")
def listar_alertas(id: int, quien: int = Depends(actor), conn=Depends(conexion)):
    """Con tu propio id: todas tus alertas. Con el de otro: solo sus alertas rojas escaladas a ti; ese acceso queda
    en auditoría. Verde y ámbar nunca se ven desde otro tripulante."""
    return alertas.alertas_visibles(conn, quien, id)


@router.post("/tripulantes/{id}/reportes", status_code=201, responses=ERRORES, summary="Encola un reporte a tierra")
def crear_reporte(cuerpo: ReporteIn, id: int = Depends(propio), conn=Depends(conexion)):
    """Encola un reporte con `retardo_min` de 3 a 22; `llega_t_real` = `creado_t_real` + retardo."""
    return {"id": cola.encolar_reporte(conn, id, **cuerpo.model_dump())}


@router.get("/tripulantes/{id}/reportes", responses=ERRORES, summary="Lista los reportes propios")
def listar_reportes(id: int = Depends(propio), conn=Depends(conexion)):
    """Reportes del tripulante con `estado` en_cola, entregado o respondido."""
    return cola.leer_reportes(conn, id)


@router.post("/reportes/avanzar", responses={401: ERRORES[401], 422: ERRORES[422]},
             summary="Entrega los reportes que ya llegaron a tierra")
def avanzar(cuerpo: AvanceIn, quien: int = Depends(actor), conn=Depends(conexion)):
    """Pasa a `entregado` los reportes con `llega_t_real` <= `ahora`; devuelve `{"entregados": n}`."""
    return {"entregados": cola.avanzar_cola(conn, cuerpo.ahora)}


@router.post("/reportes/{reporte_id}/respuesta", responses={401: ERRORES[401], 422: ERRORES[422]},
             summary="Responde un reporte entregado")
def responder(reporte_id: int, cuerpo: RespuestaIn, quien: int = Depends(actor), conn=Depends(conexion)):
    """Responde un reporte ya entregado y no antes de su llegada a tierra; si no, 422.
    shortcut: cualquier tripulante conocido puede responder (el médico de vuelo en tierra no está modelado)."""
    cola.responder_reporte(conn, reporte_id, cuerpo.respuesta, cuerpo.t_real)
    return {"ok": True}


@router.get("/escalamientos", responses={401: ERRORES[401]}, summary="Lista los escalamientos que recibiste")
def escalamientos_recibidos(quien: int = Depends(actor), conn=Depends(conexion)):
    """Avisos rojos escalados a ti: `{id, alerta_id, tripulante_id, contenido: {indicador, valor, t_real, tramo},
    contexto_astronauta}`. Es tu bandeja: no deja registro `lectura_ajena`."""
    return alertas.listar_escalamientos(conn, destinatario_id=quien)


@router.get("/tripulantes/{id}/escalamientos", responses=ERRORES, summary="Lista lo que se envió sobre ti")
def escalamientos_propios(id: int = Depends(propio), conn=Depends(conexion)):
    """Transparencia (§5.4): qué avisos salieron sobre ti, a quién y con qué contenido."""
    return alertas.listar_escalamientos(conn, tripulante_id=id)


@router.post("/escalamientos/{escalamiento_id}/contexto", responses={**ERRORES, 404: {"description": "No existe."}},
             summary="Añade contexto a un escalamiento propio")
def agregar_contexto(escalamiento_id: int, cuerpo: ContextoIn, quien: int = Depends(actor), conn=Depends(conexion)):
    """Solo el afectado puede añadir contexto, una sola vez (no puede cancelar el aviso); otro tripulante recibe 403
    y un segundo intento, 422."""
    dueno = [e for e in alertas.listar_escalamientos(conn, tripulante_id=quien) if e["id"] == escalamiento_id]
    if not dueno:
        existe = conn.execute("SELECT 1 FROM escalamiento WHERE id = ?", (escalamiento_id,)).fetchone()
        raise HTTPException(403 if existe else 404, t("api.error.sin_permiso") if existe else t("api.error.dato_invalido", detalle=escalamiento_id))
    try:
        alertas.agregar_contexto(conn, escalamiento_id, cuerpo.texto)
    except sqlite3.IntegrityError as e:  # el trigger de solo adición: ya tenía contexto
        raise ValueError(str(e)) from None
    return {"ok": True}
