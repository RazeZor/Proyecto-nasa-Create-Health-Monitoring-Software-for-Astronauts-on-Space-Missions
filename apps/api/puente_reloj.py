"""Puente con el servidor del reloj (repositorio smart-monitor, Galaxy Watch4; informe, anexo A).

El servidor del reloj es otra unidad desplegable: la API no importa su código. Se conecta a su WebSocket
`/live` como un panel más (protocolo en smart-monitor/docs/PROTOCOLO.md), guarda en memoria el último estado
de cada tripulante y persiste cada chequeo guiado válido como lectura `origen=sensor`, `naturaleza=Real`.
La app sigue conociendo solo esta API: lee `/tripulantes/{id}/reloj` y manda órdenes por la API.

  SMART_URL=ws://127.0.0.1:8765/live      activa el puente (sin la variable, no se conecta)
  SMART_TRIPULANTES="Sebastián=1,Ana=2"   nombre en el reloj -> id de tripulante (si falta, se usa el alias)
"""
import asyncio
import json
import math
import os
import urllib.parse
import urllib.request
from collections import deque
from contextlib import suppress
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from almacen import conectar, lecturas, migrar, tripulacion
from i18n import t
from rutas_registro import ERRORES, actor, conexion, propio

router = APIRouter(tags=["reloj"])

# campo del chequeo del reloj -> indicador de la base (packages/schemas/vocabulario.json)
INDICADORES_CHEQUEO = {"fc_reposo_lpm": "frecuencia_cardiaca_reposo", "spo2_pct": "spo2"}
METODO = "galaxy_watch4"
MAX_SERIE = 360  # puntos de FC por tripulante: los 6 min que smart-monitor manda como `history`
MAX_CHEQUEOS = 14
MAX_AVISOS = 20
TIPOS_ORDEN = ("medir_spo2", "iniciar_chequeo")


def _ahora():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def t_canonico(texto):
    """`t` del reloj (ISO 8601 UTC, quizá con milisegundos) a `YYYY-MM-DDTHH:MM:SSZ`; None si no se entiende."""
    try:
        instante = datetime.fromisoformat(str(texto).replace("Z", "+00:00"))
    except ValueError:
        return None
    if instante.tzinfo is None:
        return None
    return instante.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def mapa_tripulantes(texto):
    """`"Sebastián=1, Ana=2"` -> `{"sebastián": 1, "ana": 2}`. Ignora las entradas mal formadas."""
    mapa = {}
    for parte in (texto or "").split(","):
        nombre, _, id_ = parte.partition("=")
        if nombre.strip() and id_.strip().isdigit():
            mapa[nombre.strip().casefold()] = int(id_.strip())
    return mapa


def _numero(valor):
    return isinstance(valor, (int, float)) and not isinstance(valor, bool) and math.isfinite(valor)


class EstadoReloj:
    """Último estado conocido de cada tripulante según el servidor del reloj. Puro: no hace IO."""

    def __init__(self):
        self.conectado = False
        self.ultima_vez = None  # último mensaje recibido (UTC)
        self.error = None
        self.tripulantes = {}
        self.config = None  # {"tolerancia": {...}, "presets": {...}} según el último `config` del servidor

    def _de(self, nombre):
        clave = str(nombre or "Sin nombre").casefold()
        if clave not in self.tripulantes:
            self.tripulantes[clave] = {
                "nombre": str(nombre or "Sin nombre"), "conectado": False, "dispositivos": [], "modelo": None,
                "sdk": None, "fc_lpm": None, "ultima_lectura": None, "serie": deque(maxlen=MAX_SERIE),
                "resumen": None, "chequeos": [], "chequeo_estado": None, "chequeo_progreso": None,
                "notas": deque(maxlen=MAX_AVISOS), "avisos": deque(maxlen=MAX_AVISOS), "ultima_lectura_t": None,
                "chequeo_hoy": None, "relojes_conectados": 0}
        return self.tripulantes[clave]

    def aplicar(self, msg):
        """Aplica un mensaje de `/live`. Devuelve los chequeos recibidos (para persistir los válidos)."""
        tipo = msg.get("type")
        self.ultima_vez = _ahora()
        if tipo == "tripulacion":
            presentes = set()
            for m in msg.get("miembros") or []:
                trip = self._de(m.get("tripulante"))
                presentes.add(trip["nombre"].casefold())
                for campo in ("conectado", "dispositivos", "modelo", "sdk", "fc_lpm", "ultima_lectura_t",
                              "chequeo_hoy", "relojes_conectados"):
                    if campo == "ultima_lectura_t":
                        trip[campo] = m.get("ultima_lectura")
                        continue
                    if campo in m:
                        trip[campo] = m[campo]
            for clave, trip in self.tripulantes.items():
                if clave not in presentes:
                    trip["conectado"] = False
            return []
        if tipo == "config":
            self.config = {"tolerancia": msg.get("tolerancia"),
                           "presets": msg.get("presets", (self.config or {}).get("presets"))}
            return []
        if "tripulante" not in msg:
            return []  # tipos sin tripulante (config, presets...): no son del tablero
        trip = self._de(msg["tripulante"])
        if tipo == "lectura":
            trip["ultima_lectura"] = {k: v for k, v in msg.items() if k not in ("type", "tripulante")}
            trip["fc_lpm"] = msg.get("fc_lpm")
            trip["serie"].append({"t": msg.get("t"), "fc_lpm": msg.get("fc_lpm")})
        elif tipo == "history":
            for item in msg.get("items") or []:
                trip["serie"].append({"t": item.get("t"), "fc_lpm": item.get("fc_lpm")})
        elif tipo == "chequeos":
            items = [dict(c, tripulante=msg["tripulante"]) for c in msg.get("items") or []]
            trip["chequeos"] = items[:MAX_CHEQUEOS]
            return items
        elif tipo == "chequeo":
            chequeo = {k: v for k, v in msg.items() if k != "type"}
            trip["chequeos"] = [chequeo, *[c for c in trip["chequeos"] if c.get("t") != chequeo.get("t")]][:MAX_CHEQUEOS]
            trip["chequeo_estado"] = trip["chequeo_progreso"] = None
            return [chequeo]
        elif tipo == "resumen":
            trip["resumen"] = {k: v for k, v in msg.items() if k not in ("type", "tripulante")}
        elif tipo == "chequeo_estado":
            trip["chequeo_estado"] = msg.get("detalle")
        elif tipo == "chequeo_progreso":
            trip["chequeo_progreso"] = {k: msg.get(k) for k in ("quietos", "ventana", "transcurridos", "maximo")}
        elif tipo == "nota":
            trip["notas"].append({k: msg.get(k) for k in ("t", "tipo", "detalle")})
        elif tipo in ("aviso", "spo2_estado", "sdk_estado", "chequeo_aviso"):
            trip["avisos"].append({"t": msg.get("t") or self.ultima_vez, "tipo": tipo, "detalle": msg.get("detalle")})
        return []

    def tripulacion(self):
        """Dato mínimo de cada tripulante para quien coordina: conexión y si hizo el chequeo de hoy, sin valores."""
        filas = []
        for trip in self.tripulantes.values():
            hoy = trip["chequeo_hoy"]
            filas.append({"nombre": trip["nombre"], "conectado": bool(trip["conectado"]),
                          "relojes_conectados": trip["relojes_conectados"] or 0,
                          "ultima_lectura": trip["ultima_lectura_t"] or (trip["ultima_lectura"] or {}).get("t"),
                          "chequeo_hoy": None if hoy is None else bool(hoy.get("valido", True))})
        return sorted(filas, key=lambda f: f["nombre"].casefold())

    def de_tripulante(self, nombres):
        """Estado del primer nombre conocido (en orden), listo para JSON; None si el reloj no lo conoce."""
        for nombre in nombres:
            trip = self.tripulantes.get(str(nombre).casefold())
            if trip:
                return {k: list(v) if isinstance(v, deque) else v for k, v in trip.items()}
        return None


NOMBRES_SIN_IDENTIDAD = {"", "sin nombre", "desconocido"}


def resolver_id(conn, nombre, mapa, registrar=False):
    """Id de tripulante para un nombre del reloj: `SMART_TRIPULANTES`, luego el alias en la base y, con
    `registrar`, un tripulante nuevo (rol astronauta, primera misión, sin consentimiento de escalamiento: lo da
    la persona). Así cada reloj queda con su id sin configurar nada."""
    clave = str(nombre or "").strip().casefold()
    if clave in mapa:
        return mapa[clave]
    for id_, alias in conn.execute("SELECT id, alias FROM tripulante"):
        if str(alias).casefold() == clave:
            return id_
    if not registrar or clave in NOMBRES_SIN_IDENTIDAD:
        return None
    mision = conn.execute("SELECT id FROM mision ORDER BY id LIMIT 1").fetchone()
    return tripulacion.crear_tripulante(conn, str(nombre).strip(), mision[0], "astronauta") if mision else None


def nombres_de(conn, tripulante_id, mapa):
    """Nombres con que el reloj puede conocer a un tripulante: los del mapa y su alias."""
    nombres = [n for n, i in mapa.items() if i == tripulante_id]
    fila = conn.execute("SELECT alias FROM tripulante WHERE id = ?", (tripulante_id,)).fetchone()
    return nombres + ([fila[0]] if fila else [])


def persistir_chequeos(conn, chequeos, mapa):
    """Guarda la FC en reposo y el SpO2 de los chequeos válidos. Idempotente (clave única de `lectura`)."""
    guardadas = 0
    for c in chequeos:
        t_real = t_canonico(c.get("t"))
        id_ = resolver_id(conn, c.get("tripulante"), mapa, registrar=True) if c.get("valido") and t_real else None
        if id_ is None:
            continue
        for campo, indicador in INDICADORES_CHEQUEO.items():
            if _numero(c.get(campo)):
                with suppress(ValueError):  # tripulante sin misión u otro dato que la base rechaza: se omite
                    lecturas.registrar_lectura(conn, id_, indicador, c[campo], t_real, origen="sensor",
                                               metodo=METODO, naturaleza="Real")
                    guardadas += 1
    return guardadas


class Puente:
    """Cliente WebSocket del `/live` del reloj, con reconexión (1 s, 2 s, 4 s... hasta 30 s)."""

    def __init__(self, url, estado=None, mapa=None):
        self.url = url
        self.estado = estado or EstadoReloj()
        self.mapa = mapa or {}
        self._ws = None

    def recibir(self, texto):
        try:
            msg = json.loads(texto)
        except (TypeError, ValueError):
            return
        if not isinstance(msg, dict):
            return
        chequeos = self.estado.aplicar(msg)
        if chequeos:
            conn = conectar()
            try:
                migrar(conn)
                persistir_chequeos(conn, chequeos, self.mapa)
            finally:
                conn.close()

    async def enviar(self, orden):
        if self._ws is None:
            return False
        await self._ws.send(json.dumps(orden))
        return True

    async def correr(self):
        import websockets  # solo se necesita con SMART_URL; los tests del resto de la API no lo instalan

        espera = 1
        while True:
            try:
                async with websockets.connect(self.url, open_timeout=10, ping_interval=20) as ws:
                    self._ws, self.estado.conectado, self.estado.error, espera = ws, True, None, 1
                    async for texto in ws:
                        self.recibir(texto)
            except asyncio.CancelledError:
                raise
            except Exception as e:  # red caída, servidor apagado, URL mala: se reintenta
                self.estado.error = f"{type(e).__name__}: {e}"
            finally:
                self._ws, self.estado.conectado = None, False
            await asyncio.sleep(espera)
            espera = min(30, espera * 2)


def url_http(url_ws, ruta):
    """`ws://h:8765/live` -> `http://h:8765/<ruta>` (y wss -> https): el HTTP del mismo servidor del reloj."""
    partes = urllib.parse.urlsplit(url_ws)
    esquema = {"ws": "http", "wss": "https"}.get(partes.scheme, partes.scheme)
    return urllib.parse.urlunsplit((esquema, partes.netloc, "/" + ruta.lstrip("/"), "", ""))


ESTADO = EstadoReloj()
PUENTE: Puente | None = None


def crear_puente():
    """El puente configurado por entorno, o None si falta `SMART_URL`."""
    url = os.environ.get("SMART_URL", "").strip()
    return Puente(url, ESTADO, mapa_tripulantes(os.environ.get("SMART_TRIPULANTES"))) if url else None


def _mapa():
    return PUENTE.mapa if PUENTE else mapa_tripulantes(os.environ.get("SMART_TRIPULANTES"))


@router.get("/reloj/estado", summary="Estado del puente con el servidor del reloj")
def estado_puente():
    """`{configurado, conectado, ultima_vez, error}`. `configurado` es false sin `SMART_URL`. No lleva datos de
    ningún tripulante: esos están en `/tripulantes/{id}/reloj`."""
    return {"configurado": PUENTE is not None, "conectado": ESTADO.conectado, "ultima_vez": ESTADO.ultima_vez,
            "error": ESTADO.error}


@router.get("/tripulantes/{id}/reloj", responses=ERRORES, summary="Reloj en vivo del tripulante")
def reloj_tripulante(id: int = Depends(propio), conn=Depends(conexion)):
    """`{puente, vinculado, reloj}`. `reloj` (null si el servidor del reloj no conoce al tripulante): `nombre`,
    `conectado`, `dispositivos`, `modelo`, `sdk`, `fc_lpm`, `ultima_lectura`, `serie` (últimos 120 `{t, fc_lpm}`),
    `resumen` (FC en reposo del día, RMSSD, SpO2, sueño experimental), `chequeos` (últimos 14, el más reciente
    primero), `chequeo_estado`, `chequeo_progreso`, `notas` y `avisos`. Datos de bienestar, `naturaleza: Real`."""
    reloj = ESTADO.de_tripulante(nombres_de(conn, id, _mapa()))
    return {"puente": estado_puente(), "vinculado": reloj is not None, "reloj": reloj}


class OrdenIn(BaseModel):
    tipo: Literal[TIPOS_ORDEN]


@router.post("/tripulantes/{id}/reloj/ordenes", status_code=202,
             responses={**ERRORES, 503: {"description": "El puente no está conectado al servidor del reloj."}},
             summary="Envía una orden al reloj del tripulante")
async def orden_reloj(orden: OrdenIn, id: int = Depends(propio), conn=Depends(conexion)):
    """`{tipo: medir_spo2 | iniciar_chequeo}`. Se reenvía al servidor del reloj con el nombre del tripulante. 202 =
    enviada; si el reloj no está conectado, el aviso llega luego en `avisos` de `/tripulantes/{id}/reloj`."""
    nombres = nombres_de(conn, id, _mapa())
    reloj = ESTADO.de_tripulante(nombres)
    nombre = reloj["nombre"] if reloj else (nombres[0] if nombres else None)
    if nombre is None:
        raise HTTPException(422, t("api.error.reloj_sin_tripulante"))
    if PUENTE is None or not await PUENTE.enviar({"type": orden.tipo, "tripulante": nombre}):
        raise HTTPException(503, t("api.error.reloj_sin_conexion"))
    return {"enviada": orden.tipo, "tripulante": nombre}


@router.get("/reloj/tripulacion", responses={401: ERRORES[401]}, summary="Estado de los relojes de la tripulación")
def tripulacion_reloj(_quien: int = Depends(actor)):
    """Lista de `{nombre, conectado, relojes_conectados, ultima_lectura, chequeo_hoy}`. Dato mínimo para coordinar
    (§5.4): si el reloj está conectado y si hubo chequeo hoy (`true` válido, `false` fallido, `null` sin hacer), sin
    ningún valor fisiológico. `relojes_conectados > 1` = dos relojes con el mismo nombre (mezclan instrumentos)."""
    return ESTADO.tripulacion()


@router.get("/reloj/config", summary="Tolerancia al movimiento del chequeo")
def config_reloj():
    """`{tolerancia, presets}` según el servidor del reloj: `preset` (estricta, normal, flexible, personalizada),
    `mov_quieto`, `mov_inquieto`, `mov_sacudida` (g) y `max_inquietos_pct`. null hasta que el puente la reciba."""
    return ESTADO.config or {"tolerancia": None, "presets": None}


class ToleranciaIn(BaseModel):
    preset: Literal["estricta", "normal", "flexible", "personalizada"]
    mov_quieto: float | None = None
    mov_inquieto: float | None = None
    mov_sacudida: float | None = None
    max_inquietos_pct: float | None = None


@router.put("/reloj/config", status_code=202, responses={401: ERRORES[401], 503: {"description": "Puente sin conexión."}},
            summary="Cambia la tolerancia al movimiento")
async def cambiar_config_reloj(tolerancia: ToleranciaIn, _quien: int = Depends(actor)):
    """Reenvía `set_config` al servidor del reloj, que la aplica a todos los relojes. Con `personalizada` van los
    cuatro valores (reposo <= pico <= sacudida, picos <= 50 %). Si son inválidos, el servidor responde un aviso y
    mantiene la anterior: confirma con `GET /reloj/config`. Cambiarla seguido hace incomparables los chequeos."""
    cuerpo = tolerancia.model_dump(exclude_none=True)
    if PUENTE is None or not await PUENTE.enviar({"type": "set_config", "tolerancia": cuerpo}):
        raise HTTPException(503, t("api.error.reloj_sin_conexion"))
    return {"enviada": cuerpo}


def _descargar(url):
    # la URL sale de SMART_URL, no del cliente. User-Agent propio: Cloudflare rechaza el de urllib con 403
    pedido = urllib.request.Request(url, headers={"User-Agent": "vigia-api/1"})
    with urllib.request.urlopen(pedido, timeout=15) as r:
        return r.read()


@router.get("/tripulantes/{id}/reloj/export.csv", responses={**ERRORES, 503: {"description": "Puente sin conexión."}},
            summary="Exporta en CSV las lecturas del reloj")
async def exportar_reloj(id: int = Depends(propio), conn=Depends(conexion), desde: str | None = None):
    """CSV de smart-monitor (`/export.csv`) filtrado por el nombre del tripulante: una fila por segundo con
    `tripulante`, `dispositivo`, `t`, `fc_lpm`, `ibi_ms`, `spo2_pct`, `en_muneca`, `calidad`, `mov_g` y `fuente_fc`.
    `desde` = YYYY-MM-DD en la zona horaria del servidor del reloj (opcional)."""
    nombres = nombres_de(conn, id, _mapa())
    reloj = ESTADO.de_tripulante(nombres)
    if PUENTE is None:
        raise HTTPException(503, t("api.error.reloj_sin_conexion"))
    if not reloj:
        raise HTTPException(422, t("api.error.reloj_sin_tripulante"))
    consulta = {"tripulante": reloj["nombre"]}
    if desde:
        datetime.strptime(desde, "%Y-%m-%d")  # ValueError -> 422 (manejador de main)
        consulta["desde"] = desde
    url = url_http(PUENTE.url, "export.csv") + "?" + urllib.parse.urlencode(consulta)
    try:
        datos = await asyncio.to_thread(_descargar, url)
    except OSError as e:
        raise HTTPException(503, t("api.error.reloj_sin_conexion")) from e
    return Response(datos, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="reloj-{id}.csv"'})
