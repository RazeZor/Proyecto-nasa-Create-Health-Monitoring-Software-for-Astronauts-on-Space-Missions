"""Sesiones opacas revocables, credenciales locales y CSRF. Nunca confiar en X-Tripulante."""
import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

from almacen import conectar, migrar
from almacen.alertas import anotar
from i18n import t

router = APIRouter(tags=["identidad"])
FORMATO = "%Y-%m-%dT%H:%M:%SZ"


def conexion_identidad():
    conn = conectar()
    try:
        migrar(conn)
        yield conn
    finally:
        conn.close()


def _hash(texto):
    return hashlib.sha256(texto.encode()).hexdigest()


def _derivar(clave, sal):
    return hashlib.scrypt(clave.encode(), salt=bytes.fromhex(sal), n=16384, r=8, p=1).hex()


def crear_invitacion(tripulante_id, rol, horas=72):
    """Firma una invitación de alta ligada a una identidad y un rol existentes."""
    secreto = os.environ.get("VIGIA_CLAVE_INVITACIONES", "")
    if len(secreto) < 32:
        raise ValueError("VIGIA_CLAVE_INVITACIONES requiere al menos 32 caracteres")
    if not 1 <= horas <= 168 or rol not in ("astronaut", "cmo", "surgeon"):
        raise ValueError("caducidad o rol inválidos")
    datos = json.dumps({"tripulante_id": int(tripulante_id), "rol": rol,
                        "vence": int(datetime.now(timezone.utc).timestamp()) + horas * 3600,
                        "nonce": secrets.token_hex(16)}, separators=(",", ":")).encode()
    carga = base64.urlsafe_b64encode(datos).decode().rstrip("=")
    firma = hmac.new(secreto.encode(), carga.encode(), hashlib.sha256).hexdigest()
    return carga + "." + firma


def leer_invitacion(token):
    """Verifica firma, vigencia y forma de una invitación sin revelar su identidad."""
    secreto = os.environ.get("VIGIA_CLAVE_INVITACIONES", "")
    if len(secreto) < 32 or not isinstance(token, str) or len(token) > 2048:
        raise ValueError("invitación inválida")
    try:
        carga, firma = token.split(".", 1)
        esperada = hmac.new(secreto.encode(), carga.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(firma, esperada):
            raise ValueError("invitación inválida")
        datos = json.loads(base64.urlsafe_b64decode(carga + "=" * (-len(carga) % 4)))
        if (set(datos) != {"tripulante_id", "rol", "vence", "nonce"}
                or not isinstance(datos["tripulante_id"], int) or datos["tripulante_id"] < 1
                or datos["rol"] not in ("astronaut", "cmo", "surgeon")
                or not isinstance(datos["vence"], int) or datos["vence"] <= int(datetime.now(timezone.utc).timestamp())
                or not isinstance(datos["nonce"], str) or len(datos["nonce"]) != 32):
            raise ValueError("invitación inválida")
        return datos["tripulante_id"], datos["rol"]
    except (ValueError, TypeError, KeyError, json.JSONDecodeError) as error:
        raise ValueError("invitación inválida o vencida") from error


def crear_cuenta(conn, usuario, clave, tripulante_id, rol):
    usuario = usuario.strip().casefold()
    if not 3 <= len(usuario) <= 100 or not 12 <= len(clave) <= 200:
        raise ValueError("usuario de 3–100 caracteres y clave de 12–200 requeridos")
    sujeto = conn.execute("SELECT rol FROM tripulante WHERE id = ?", (tripulante_id,)).fetchone()
    if not sujeto or rol not in ("astronaut", "cmo", "surgeon"):
        raise ValueError("identidad o rol desconocido")
    if rol in ("cmo", "surgeon") and sujeto[0] != "oficial_medico":
        raise ValueError("un rol médico requiere un tripulante médico de la misión")
    if rol == "astronaut" and sujeto[0] == "oficial_medico":
        raise ValueError("una cuenta de astronauta no puede heredar permisos de un tripulante médico")
    sal = secrets.token_hex(16)
    with conn:
        return conn.execute("INSERT INTO identidad_cuenta (usuario, tripulante_id, rol, sal, clave_hash) VALUES (?, ?, ?, ?, ?)",
                            (usuario, tripulante_id, rol, sal, _derivar(clave, sal))).lastrowid


def sesion_verificada(request, conn):
    if request.headers.get("X-Vigia-Demo-Rol") is not None:
        raise HTTPException(403, t("api.error.sin_permiso"))
    token = request.cookies.get("vigia_sesion")
    if not token:
        raise HTTPException(401, t("api.error.sesion_requerida"))
    ahora = datetime.now(timezone.utc).strftime(FORMATO)
    fila = conn.execute("SELECT s.*, c.tripulante_id, c.rol, t.mision_id FROM identidad_sesion s "
                        "JOIN identidad_cuenta c ON c.id = s.cuenta_id JOIN tripulante t ON t.id = c.tripulante_id "
                        "WHERE s.token_hash = ? AND s.revocada = 0 AND c.activa = 1 AND s.vence_t_real > ?",
                        (_hash(token), ahora)).fetchone()
    if not fila:
        raise HTTPException(401, t("api.error.sesion_requerida"))
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        csrf = request.headers.get("X-Vigia-CSRF", "")
        if not csrf or not hmac.compare_digest(fila["csrf_hash"], _hash(csrf)):
            raise HTTPException(403, t("api.error.sin_permiso"))
    request.state.identidad = dict(fila)
    return fila


class AccesoIn(BaseModel):
    usuario: str = Field(min_length=1, max_length=100)
    clave: str = Field(min_length=1, max_length=200)


class AltaIn(BaseModel):
    invitacion: str = Field(min_length=20, max_length=2048)
    usuario: str = Field(min_length=3, max_length=100)
    clave: str = Field(min_length=12, max_length=200)


def _perfil(fila):
    return {k: fila[k] for k in ("tripulante_id", "mision_id", "rol", "vence_t_real")}


@router.post("/sesion")
def iniciar(cuerpo: AccesoIn, request: Request, response: Response, conn=Depends(conexion_identidad)):
    """Comprueba credenciales y crea una sesión de 8 horas con cookie HttpOnly y CSRF."""
    ahora = datetime.now(timezone.utc)
    usuario = cuerpo.usuario.strip().casefold()
    cliente = request.client.host if request.client else "local"
    limite = _hash(cliente)
    intento = conn.execute("SELECT * FROM identidad_intento WHERE clave = ?", (limite,)).fetchone()
    if intento and intento["fallos"] >= 5 and intento["hasta_t_real"] > ahora.strftime(FORMATO):
        raise HTTPException(429, t("api.error.acceso_limitado"))
    cuenta = conn.execute("SELECT * FROM identidad_cuenta WHERE usuario = ? AND activa = 1", (usuario,)).fetchone()
    # También derivar para usuario inexistente: evitar una diferencia trivial de tiempos.
    calculada = _derivar(cuerpo.clave, cuenta["sal"] if cuenta else "00" * 16)
    if not cuenta or not hmac.compare_digest(cuenta["clave_hash"], calculada):
        fallos = intento["fallos"] + 1 if intento and intento["hasta_t_real"] > ahora.strftime(FORMATO) else 1
        with conn:
            conn.execute("DELETE FROM identidad_intento WHERE hasta_t_real <= ?", (ahora.strftime(FORMATO),))
            conn.execute("INSERT OR REPLACE INTO identidad_intento VALUES (?, ?, ?)",
                         (limite, fallos, (ahora + timedelta(minutes=15)).strftime(FORMATO)))
        raise HTTPException(401, t("api.error.sesion_requerida"))
    token = secrets.token_urlsafe(32)
    csrf = _hash("csrf:" + token)
    vence = (ahora + timedelta(hours=8)).strftime(FORMATO)
    with conn:
        conn.execute("DELETE FROM identidad_intento WHERE clave = ?", (limite,))
        conn.execute("INSERT INTO identidad_sesion (token_hash, cuenta_id, csrf_hash, creada_t_real, vence_t_real) VALUES (?, ?, ?, ?, ?)",
                     (_hash(token), cuenta["id"], _hash(csrf), ahora.strftime(FORMATO), vence))
    anotar(conn, cuenta["tripulante_id"], "iniciar_sesion", "identidad_cuenta", cuenta["id"])
    response.set_cookie("vigia_sesion", token, httponly=True, secure=request.url.scheme == "https" or os.environ.get("VIGIA_COOKIE_SEGURA") == "1", samesite="strict", max_age=28800, path="/")
    response.headers["Cache-Control"] = "no-store"
    mision = conn.execute("SELECT mision_id FROM tripulante WHERE id = ?", (cuenta["tripulante_id"],)).fetchone()[0]
    return {"tripulante_id": cuenta["tripulante_id"], "mision_id": mision, "rol": cuenta["rol"], "vence_t_real": vence, "csrf": csrf}


@router.post("/cuentas/registro", status_code=201)
def registrar(cuerpo: AltaIn, conn=Depends(conexion_identidad)):
    """Crea una sola cuenta para la identidad y el rol incluidos en una invitación firmada."""
    try:
        tripulante_id, rol = leer_invitacion(cuerpo.invitacion)
        conn.execute("BEGIN IMMEDIATE")
        sujeto = conn.execute("SELECT rol FROM tripulante WHERE id = ?", (tripulante_id,)).fetchone()
        existentes = conn.execute("SELECT 1 FROM identidad_cuenta WHERE tripulante_id = ? LIMIT 1", (tripulante_id,)).fetchone()
        if not sujeto or existentes:
            raise ValueError("invitación inválida o ya utilizada")
        if (rol in ("cmo", "surgeon") and sujeto["rol"] != "oficial_medico") or (rol == "astronaut" and sujeto["rol"] == "oficial_medico"):
            raise ValueError("invitación inválida")
        crear_cuenta(conn, cuerpo.usuario, cuerpo.clave, tripulante_id, rol)
        return {"creada": True}
    except ValueError as error:
        if conn.in_transaction:
            conn.rollback()
        raise HTTPException(400, t("api.error.invitacion_invalida")) from error
    except sqlite3.IntegrityError as error:
        if conn.in_transaction:
            conn.rollback()
        raise HTTPException(409, t("api.error.invitacion_invalida")) from error
    except Exception:
        if conn.in_transaction:
            conn.rollback()
        raise


@router.get("/sesion")
def consultar(request: Request, response: Response, conn=Depends(conexion_identidad)):
    """Verifica una sesión vigente y devuelve su ámbito autorizado."""
    response.headers["Cache-Control"] = "no-store"
    if os.environ.get("VIGIA_IDENTIDAD_ENSAYO") == "1":
        return {"ensayo": True}
    return {**_perfil(sesion_verificada(request, conn)), "csrf": _hash("csrf:" + request.cookies["vigia_sesion"])}


@router.delete("/sesion")
def cerrar(request: Request, response: Response, conn=Depends(conexion_identidad)):
    """Revoca la sesión en el servidor y retira su cookie; requiere CSRF."""
    sesion = sesion_verificada(request, conn)
    with conn:
        conn.execute("UPDATE identidad_sesion SET revocada = 1 WHERE token_hash = ?", (sesion["token_hash"],))
    anotar(conn, sesion["tripulante_id"], "cerrar_sesion", "identidad_cuenta", sesion["cuenta_id"])
    response.delete_cookie("vigia_sesion", path="/")
    response.headers["Cache-Control"] = "no-store"
    return {"cerrada": True}
