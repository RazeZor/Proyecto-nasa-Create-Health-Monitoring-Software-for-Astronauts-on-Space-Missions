"""Puente con el servidor del reloj (repositorio smart-monitor, Galaxy Watch4; informe, anexo A).

El servidor del reloj es otra unidad desplegable: la API no importa su código. Se conecta a su WebSocket
`/live` como un panel más (protocolo en smart-monitor/docs/PROTOCOLO.md), guarda en memoria el último estado
de cada tripulante y persiste cada chequeo guiado válido de un reloj **vinculado** como lectura `origen=sensor`,
`naturaleza=Real`. La app sigue conociendo solo esta API: lee `/tripulantes/{id}/reloj` y manda órdenes por la API.

  SMART_URL=ws://127.0.0.1:8765/live      /live de smart-monitor (si falta, se usa este valor por defecto)
  SMART_DESACTIVADO=1                      apaga el puente
  SMART_TRIPULANTES="Sebastián=1,Ana=2"   nombre en el reloj -> id de tripulante (se suma a los vínculos de la base)
  SMART_AUTOREGISTRO=1                     crea un tripulante nuevo por cada nombre desconocido (apagado por defecto)

Un reloj está vinculado si su nombre está en `SMART_TRIPULANTES`, en la tabla `reloj_vinculo` (ruta
`POST /tripulantes/{id}/reloj/vinculo`) o coincide con el alias de un tripulante. Los nombres por defecto
(`Tripulante XXXX`, `Tripulante previo`) y los nombres con más de un reloj conectado nunca se persisten.
"""
import asyncio
import json
import math
import os
import re
import socket
import time
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
METODO = "galaxy_watch4"  # `metodo` de la lectura: `galaxy_watch4:<dispositivo>` (mismo formato que la app al precargar)
MAX_SERIE = 360  # puntos de FC por tripulante: los 6 min que smart-monitor manda como `history`
MAX_CHEQUEOS = 14
MAX_AVISOS = 20
CADUCIDAD_FASE_S = 120  # `chequeo_estado`/`chequeo_progreso` sin novedades: el chequeo ya no está en curso
TIPOS_ORDEN = ("medir_spo2", "iniciar_chequeo")
SMART_URL_DEFECTO = "ws://127.0.0.1:8765/live"
PUERTO_RELOJ_DEFECTO = 8765
PATRON_NOMBRE_DEFECTO = re.compile(r"^Tripulante \w{4}$")  # nombre de fábrica de la app del reloj
NOMBRES_SIN_IDENTIDAD = {"", "sin nombre", "desconocido", "tripulante previo"}


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


def nombre_por_defecto(nombre):
    """True si el nombre no identifica a nadie: vacío, `Sin nombre`, `Tripulante previo` o el `Tripulante XXXX` de fábrica."""
    texto = str(nombre or "").strip()
    return texto.casefold() in NOMBRES_SIN_IDENTIDAD or bool(PATRON_NOMBRE_DEFECTO.match(texto))


def metodo_de(chequeo):
    """`galaxy_watch4:<dispositivo>` (el instrumento, A.6); sin `dispositivo`, `galaxy_watch4` a secas."""
    dispositivo = str(chequeo.get("dispositivo") or "").strip()
    return f"{METODO}:{dispositivo}" if dispositivo else METODO


def _numero(valor):
    return isinstance(valor, (int, float)) and not isinstance(valor, bool) and math.isfinite(valor)


class EstadoReloj:
    """Último estado conocido de cada tripulante según el servidor del reloj. Puro: no hace IO.
    `reloj` es la fuente de tiempo monótona (inyectable en tests) con que se mide la vigencia de lo recibido."""

    def __init__(self, reloj=time.monotonic):
        self._reloj = reloj
        self.conectado = False
        self.ultima_vez = None  # último mensaje recibido (UTC)
        self.error = None
        self.tripulantes = {}
        self.config = None  # {"tolerancia": {...}, "presets": {...}} según el último `config` del servidor
        self.avisos = deque(maxlen=MAX_AVISOS)  # avisos del servidor sin tripulante (p. ej. `set_config` inválido)

    def _de(self, nombre):
        clave = str(nombre or "Sin nombre").casefold()
        if clave not in self.tripulantes:
            self.tripulantes[clave] = {
                "nombre": str(nombre or "Sin nombre"), "conectado": False, "dispositivos": [], "modelo": None,
                "sdk": None, "fc_lpm": None, "ultima_lectura": None, "serie": deque(maxlen=MAX_SERIE),
                "resumen": None, "chequeos": [], "chequeo_estado": None, "chequeo_progreso": None,
                "notas": [], "avisos": deque(maxlen=MAX_AVISOS), "ultima_lectura_t": None,
                "chequeo_hoy": None, "relojes_conectados": 0,
                "_recibido_en": None,  # reloj monótono del servidor al recibir la última `lectura`
                "_fase_en": None}  # ídem para `chequeo_estado`/`chequeo_progreso`
        return self.tripulantes[clave]

    @staticmethod
    def _limpiar_fase(trip):
        trip["chequeo_estado"] = trip["chequeo_progreso"] = trip["_fase_en"] = None

    @staticmethod
    def _fusionar_notas(trip, nuevas):
        """Notas en vivo + `resumen.notas`, sin repetir (clave `t`), en orden cronológico."""
        por_t = {n.get("t"): n for n in trip["notas"]}
        for nota in nuevas:
            if isinstance(nota, dict):
                por_t[nota.get("t")] = {k: nota.get(k) for k in ("t", "tipo", "detalle")}
        trip["notas"] = sorted(por_t.values(), key=lambda n: str(n.get("t") or ""))[-MAX_AVISOS:]

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
                if not trip["conectado"]:
                    self._limpiar_fase(trip)
            for clave, trip in self.tripulantes.items():
                if clave not in presentes:
                    trip["conectado"] = False
                    self._limpiar_fase(trip)
            return []
        if tipo == "config":
            self.config = {"tolerancia": msg.get("tolerancia"),
                           "presets": msg.get("presets", (self.config or {}).get("presets"))}
            return []
        if "tripulante" not in msg:
            if tipo == "aviso":  # p. ej. tolerancia inválida en `set_config`: es del puente, no de un tripulante
                self.avisos.append({"t": msg.get("t") or self.ultima_vez, "tipo": tipo, "detalle": msg.get("detalle")})
            return []  # otros tipos sin tripulante (presets...): no son del tablero
        trip = self._de(msg["tripulante"])
        if tipo == "lectura":
            trip["ultima_lectura"] = {k: v for k, v in msg.items() if k not in ("type", "tripulante")}
            trip["fc_lpm"] = msg.get("fc_lpm")
            trip["_recibido_en"] = self._reloj()
            punto = {"t": msg.get("t"), "fc_lpm": msg.get("fc_lpm")}
            if trip["serie"] and trip["serie"][-1]["t"] == punto["t"]:
                trip["serie"][-1] = punto  # reenvío del mismo segundo (búfer del reloj): no se duplica
            else:
                trip["serie"].append(punto)
        elif tipo == "history":
            puntos = {}  # reemplaza la serie (es la foto completa del servidor) sin repetir `t`
            for item in msg.get("items") or []:
                puntos[item.get("t")] = {"t": item.get("t"), "fc_lpm": item.get("fc_lpm")}
            trip["serie"] = deque(puntos.values(), maxlen=MAX_SERIE)
        elif tipo == "chequeos":
            items = [dict(c, tripulante=msg["tripulante"]) for c in msg.get("items") or []]
            trip["chequeos"] = items[:MAX_CHEQUEOS]
            return items
        elif tipo == "chequeo":
            chequeo = {k: v for k, v in msg.items() if k != "type"}
            trip["chequeos"] = [chequeo, *[c for c in trip["chequeos"] if c.get("t") != chequeo.get("t")]][:MAX_CHEQUEOS]
            self._limpiar_fase(trip)
            return [chequeo]
        elif tipo == "resumen":
            trip["resumen"] = {k: v for k, v in msg.items() if k not in ("type", "tripulante")}
            self._fusionar_notas(trip, msg.get("notas") or [])
        elif tipo == "chequeo_estado":
            trip["chequeo_estado"] = msg.get("detalle")
            trip["_fase_en"] = self._reloj()
        elif tipo == "chequeo_progreso":
            trip["chequeo_progreso"] = {k: msg.get(k) for k in ("quietos", "ventana", "transcurridos", "maximo")}
            trip["_fase_en"] = self._reloj()
        elif tipo == "nota":
            self._fusionar_notas(trip, [msg])
        elif tipo in ("aviso", "spo2_estado", "sdk_estado", "chequeo_aviso"):
            trip["avisos"].append({"t": msg.get("t") or self.ultima_vez, "tipo": tipo, "detalle": msg.get("detalle")})
        return []

    def avisar(self, nombre, codigo, detalle):
        """Aviso del propio puente sobre un tripulante (p. ej. chequeo no guardado por relojes duplicados)."""
        trip = self.tripulantes.get(str(nombre or "").casefold())
        if trip is not None:
            trip["avisos"].append({"t": _ahora(), "tipo": "puente", "codigo": codigo, "detalle": detalle})

    def relojes_de(self, nombre):
        trip = self.tripulantes.get(str(nombre or "").casefold())
        return (trip or {}).get("relojes_conectados") or 0

    def tripulacion(self):
        """Dato mínimo de cada tripulante para quien coordina: conexión y si hizo el chequeo de hoy, sin valores."""
        filas = []
        for trip in self.tripulantes.values():
            hoy = trip["chequeo_hoy"]
            filas.append({"nombre": trip["nombre"], "conectado": bool(trip["conectado"]),
                          "relojes_conectados": trip["relojes_conectados"] or 0,
                          "ultima_lectura": trip["ultima_lectura_t"] or (trip["ultima_lectura"] or {}).get("t"),
                          "chequeo_hoy": None if hoy is None else bool(hoy.get("valido", True)),
                          "nombre_por_defecto": nombre_por_defecto(trip["nombre"])})
        return sorted(filas, key=lambda f: f["nombre"].casefold())

    def de_tripulante(self, nombres):
        """Estado del primer nombre conocido (en orden), listo para JSON; None si el reloj no lo conoce.
        Añade `recibido_hace_s` (segundos desde la última `lectura`, con el reloj de este servidor) y oculta la fase
        del chequeo si lleva más de `CADUCIDAD_FASE_S` sin novedades."""
        for nombre in nombres:
            trip = self.tripulantes.get(str(nombre).casefold())
            if trip:
                return self._salida(trip)
        return None

    def _salida(self, trip):
        ahora = self._reloj()
        salida = {k: list(v) if isinstance(v, deque) else v for k, v in trip.items() if not k.startswith("_")}
        if trip["_fase_en"] is not None and ahora - trip["_fase_en"] > CADUCIDAD_FASE_S:
            salida["chequeo_estado"] = salida["chequeo_progreso"] = None
        recibido = trip["_recibido_en"]
        salida["recibido_hace_s"] = None if recibido is None else max(0.0, round(ahora - recibido, 1))
        return salida


def vinculos_bd(conn):
    """`{nombre en minúsculas: tripulante_id}` de la tabla `reloj_vinculo` (vínculos hechos desde la app)."""
    return {str(n).casefold(): i for n, i in conn.execute("SELECT nombre, tripulante_id FROM reloj_vinculo")}


def mapa_completo(conn, mapa):
    """`SMART_TRIPULANTES` ∪ vínculos de la base (el vínculo explícito, más reciente, manda)."""
    return {**mapa, **vinculos_bd(conn)}


def resolver_id(conn, nombre, mapa, registrar=False):
    """Id de tripulante para un nombre del reloj: `SMART_TRIPULANTES` o vínculo de la base, luego el alias
    exacto (sin distinguir mayúsculas) y, solo con `registrar` (`SMART_AUTOREGISTRO=1`), un tripulante nuevo (rol
    astronauta, primera misión, sin consentimiento de escalamiento: lo da la persona). Un nombre por defecto
    (`Tripulante XXXX`, `Tripulante previo`, `Sin nombre`) nunca resuelve a nadie."""
    texto = str(nombre or "").strip()
    clave = texto.casefold()
    if nombre_por_defecto(texto):
        return None
    mapa = mapa_completo(conn, mapa)
    if clave in mapa:
        return mapa[clave]
    for id_, alias in conn.execute("SELECT id, alias FROM tripulante"):
        if str(alias).casefold() == clave:
            return id_
    if not registrar:
        return None
    mision = conn.execute("SELECT id FROM mision ORDER BY id LIMIT 1").fetchone()
    return tripulacion.crear_tripulante(conn, texto, mision[0], "astronauta") if mision else None


def nombres_de(conn, tripulante_id, mapa):
    """Nombres con que el reloj puede conocer a un tripulante: los del mapa, sus vínculos y su alias."""
    nombres = [n for n, i in mapa_completo(conn, mapa).items() if i == tripulante_id]
    fila = conn.execute("SELECT alias FROM tripulante WHERE id = ?", (tripulante_id,)).fetchone()
    return nombres + ([fila[0]] if fila else [])


def persistir_chequeos(conn, chequeos, mapa, registrar=False):
    """Guarda la FC en reposo y el SpO2 de los chequeos válidos de relojes vinculados (`resolver_id`), con
    `metodo = galaxy_watch4:<dispositivo>`. Idempotente (clave única de `lectura`)."""
    guardadas = 0
    for c in chequeos:
        t_real = t_canonico(c.get("t"))
        id_ = resolver_id(conn, c.get("tripulante"), mapa, registrar) if c.get("valido") and t_real else None
        if id_ is None:
            continue
        for campo, indicador in INDICADORES_CHEQUEO.items():
            if _numero(c.get(campo)):
                with suppress(ValueError):  # tripulante sin misión u otro dato que la base rechaza: se omite
                    lecturas.registrar_lectura(conn, id_, indicador, c[campo], t_real, origen="sensor",
                                               metodo=metodo_de(c), naturaleza="Real")
                    guardadas += 1
    return guardadas


class Puente:
    """Cliente WebSocket del `/live` del reloj, con reconexión (1 s, 2 s, 4 s... hasta 30 s)."""

    def __init__(self, url, estado=None, mapa=None, autoregistro=False):
        self.url = url
        self.estado = estado or EstadoReloj()
        self.mapa = mapa or {}
        self.autoregistro = autoregistro
        self._ws = None

    def procesar(self, texto):
        """Aplica el mensaje al estado en memoria y devuelve los chequeos que toca persistir. Los de un nombre con
        más de un reloj conectado (dos instrumentos mezclados) no se guardan: queda un aviso en el tripulante."""
        try:
            msg = json.loads(texto)
        except (TypeError, ValueError):
            return []
        if not isinstance(msg, dict):
            return []
        chequeos = self.estado.aplicar(msg)
        listos, duplicados = [], set()
        for c in chequeos:
            nombre = c.get("tripulante")
            if self.estado.relojes_de(nombre) > 1:
                duplicados.add(nombre)
            else:
                listos.append(c)
        for nombre in duplicados:
            self.estado.avisar(nombre, "relojes_duplicados", t("api.reloj.aviso_relojes_duplicados", nombre=nombre))
        return listos

    def persistir(self, chequeos):
        """Escribe en SQLite (síncrono: desde el bucle async se llama con `asyncio.to_thread`)."""
        if not chequeos:
            return 0
        conn = conectar()
        try:
            migrar(conn)
            return persistir_chequeos(conn, chequeos, self.mapa, registrar=self.autoregistro)
        finally:
            conn.close()

    def recibir(self, texto):
        """Procesa y persiste en el mismo hilo (para usos síncronos y tests)."""
        return self.persistir(self.procesar(texto))

    async def enviar(self, orden):
        if self._ws is None:
            return False
        await self._ws.send(json.dumps(orden))
        return True

    async def correr(self):
        try:
            import websockets  # solo se necesita con el puente activo; los tests del resto de la API no lo instalan
        except ImportError:
            self.estado.error = "ImportError: websockets no instalado (pip install -r apps/api/requirements.txt)"
            return
        espera = 1
        while True:
            try:
                async with websockets.connect(self.url, open_timeout=10, ping_interval=20) as ws:
                    self._ws, self.estado.conectado, self.estado.error, espera = ws, True, None, 1
                    async for texto in ws:
                        chequeos = self.procesar(texto)
                        if chequeos:
                            await asyncio.to_thread(self.persistir, chequeos)
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


def ip_lan():
    """IP de esta máquina en la red local, sin tocar la red: un socket UDP «conectado» solo elige la interfaz de
    salida y no envía nada. None si no hay red o solo hay loopback."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))
            ip = s.getsockname()[0]
    except OSError:
        return None
    return None if ip.startswith("127.") or ip == "0.0.0.0" else ip


def url_reloj_sugerida(url_live, ip):
    """URL que hay que escribir en el campo «Servidor» del reloj (`/watch` del mismo smart-monitor). Si `SMART_URL`
    apunta a otra máquina se usa ese host; si es local, la IP LAN de esta máquina (None si no se conoce)."""
    partes = urllib.parse.urlsplit(url_live or "")
    if partes.hostname and partes.hostname not in ("127.0.0.1", "localhost", "::1", "0.0.0.0"):
        return urllib.parse.urlunsplit((partes.scheme, partes.netloc, "/watch", "", ""))
    if not ip:
        return None
    return f"ws://{ip}:{partes.port or PUERTO_RELOJ_DEFECTO}/watch"


ESTADO = EstadoReloj()
PUENTE: Puente | None = None


def _activo(variable):
    return os.environ.get(variable, "").strip() == "1"


def crear_puente():
    """El puente configurado por entorno (`SMART_URL` o su valor por defecto), o None con `SMART_DESACTIVADO=1`."""
    if _activo("SMART_DESACTIVADO"):
        return None
    url = os.environ.get("SMART_URL", "").strip() or SMART_URL_DEFECTO
    return Puente(url, ESTADO, mapa_tripulantes(os.environ.get("SMART_TRIPULANTES")), autoregistro=_activo("SMART_AUTOREGISTRO"))


def _mapa():
    return PUENTE.mapa if PUENTE else mapa_tripulantes(os.environ.get("SMART_TRIPULANTES"))


@router.get("/reloj/estado", summary="Estado del puente con el servidor del reloj")
def estado_puente():
    """`{configurado, desactivado, conectado, ultima_vez, error, url_live, ip_lan, url_reloj_sugerida, avisos}`.
    `configurado` es false con `SMART_DESACTIVADO=1`; `error` es el último fallo de conexión (null si conectado);
    `url_reloj_sugerida` es lo que va en el campo «Servidor» del reloj (`ws://<ip_lan>:8765/watch`, null si no se
    conoce la IP); `avisos` son los del servidor sin tripulante (p. ej. tolerancia rechazada). No lleva datos de
    ningún tripulante: esos están en `/tripulantes/{id}/reloj`."""
    url = PUENTE.url if PUENTE else None
    ip = ip_lan()
    return {"configurado": PUENTE is not None, "desactivado": _activo("SMART_DESACTIVADO"), "conectado": ESTADO.conectado,
            "ultima_vez": ESTADO.ultima_vez, "error": ESTADO.error, "url_live": url, "ip_lan": ip,
            "url_reloj_sugerida": url_reloj_sugerida(url, ip) if url else None, "avisos": list(ESTADO.avisos)}


@router.get("/tripulantes/{id}/reloj", responses=ERRORES, summary="Reloj en vivo del tripulante")
def reloj_tripulante(id: int = Depends(propio), conn=Depends(conexion)):
    """`{puente, nombres, vinculado, reloj}`. `nombres` son los nombres de reloj que la API asocia al tripulante
    (`SMART_TRIPULANTES`, vínculos y alias); `vinculado` dice si el servidor del reloj conoce alguno. `reloj` (null si
    no): `nombre`, `conectado`, `dispositivos`, `modelo`, `sdk`, `fc_lpm`, `ultima_lectura`, `recibido_hace_s`
    (segundos desde que el puente recibió la última lectura, con el reloj del servidor), `serie` (últimos 360
    `{t, fc_lpm}`), `resumen` (FC en reposo del día, RMSSD, SpO2, sueño experimental), `chequeos` (últimos 14, el más
    reciente primero), `chequeo_estado` y `chequeo_progreso` (null tras 120 s sin novedades), `notas` (en vivo +
    `resumen.notas`) y `avisos`. Datos de bienestar, `naturaleza: Real`."""
    nombres = nombres_de(conn, id, _mapa())
    reloj = ESTADO.de_tripulante(nombres)
    return {"puente": estado_puente(), "nombres": nombres, "vinculado": reloj is not None, "reloj": reloj}


class VinculoIn(BaseModel):
    nombre: str


@router.post("/tripulantes/{id}/reloj/vinculo", status_code=201,
             responses={**ERRORES, 409: {"description": "Ese nombre de reloj ya está vinculado a otro tripulante."}},
             summary="Vincula un nombre de reloj al tripulante")
def vincular_reloj(cuerpo: VinculoIn, id: int = Depends(propio), conn=Depends(conexion)):
    """`{nombre}` = el campo «Tripulante» configurado en el reloj. Desde entonces sus chequeos válidos se guardan
    como lecturas del tripulante. 422 si es un nombre por defecto (`Tripulante XXXX`, `Tripulante previo`); 409 si
    otro tripulante ya lo tiene (por `SMART_TRIPULANTES` o por vínculo). Repetirlo actualiza la fecha."""
    nombre = cuerpo.nombre.strip()
    if nombre_por_defecto(nombre):
        raise HTTPException(422, t("api.error.reloj_nombre_por_defecto", nombre=nombre))
    actual = mapa_completo(conn, _mapa()).get(nombre.casefold())
    if actual is not None and actual != id:
        raise HTTPException(409, t("api.error.reloj_nombre_ocupado", nombre=nombre))
    t_real = _ahora()
    with conn:
        conn.execute("DELETE FROM reloj_vinculo WHERE lower(nombre) = lower(?)", (nombre,))
        conn.execute("INSERT INTO reloj_vinculo (nombre, tripulante_id, t_real) VALUES (?, ?, ?)", (nombre, id, t_real))
    return {"nombre": nombre, "tripulante_id": id, "t_real": t_real}


@router.delete("/tripulantes/{id}/reloj/vinculo", responses=ERRORES, summary="Deshace el vínculo con el reloj")
def desvincular_reloj(nombre: str | None = None, id: int = Depends(propio), conn=Depends(conexion)):
    """Quita los vínculos del tripulante hechos por la API (`nombre` opcional para quitar solo uno). No toca
    `SMART_TRIPULANTES` ni las lecturas ya guardadas. Devuelve `{eliminados}`."""
    with conn:
        if nombre and nombre.strip():
            cur = conn.execute("DELETE FROM reloj_vinculo WHERE tripulante_id = ? AND lower(nombre) = lower(?)",
                               (id, nombre.strip()))
        else:
            cur = conn.execute("DELETE FROM reloj_vinculo WHERE tripulante_id = ?", (id,))
    return {"eliminados": cur.rowcount}


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
def tripulacion_reloj(_quien: int = Depends(actor), conn=Depends(conexion)):
    """Lista de `{nombre, conectado, relojes_conectados, ultima_lectura, chequeo_hoy, nombre_por_defecto, vinculado,
    tripulante_id}`. Dato mínimo para coordinar (§5.4): si el reloj está conectado y si hubo chequeo hoy (`true`
    válido, `false` fallido, `null` sin hacer), sin ningún valor fisiológico. `vinculado`/`tripulante_id` dicen a qué
    tripulante de la API va cada nombre (null = nadie: sus chequeos no se guardan). `nombre_por_defecto` = el reloj
    aún tiene el nombre de fábrica. `relojes_conectados > 1` = dos relojes con el mismo nombre (mezclan instrumentos)."""
    mapa = _mapa()
    filas = ESTADO.tripulacion()
    for fila in filas:
        fila["tripulante_id"] = resolver_id(conn, fila["nombre"], mapa)
        fila["vinculado"] = fila["tripulante_id"] is not None
    return filas


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
    cuatro valores (reposo <= pico <= sacudida, picos <= 50 %). Si son inválidos, el servidor responde un aviso (sale
    en `avisos` de `GET /reloj/estado`) y mantiene la anterior: confirma con `GET /reloj/config`. Cambiarla seguido
    hace incomparables los chequeos."""
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
