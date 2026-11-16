"""Demo pública por visitante: bases temporales propias, sin cuentas ni datos personales."""
import hashlib
import hmac
import os
import re
import secrets
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.responses import JSONResponse

from almacen import cola, conectar, migrar, tripulacion
from almacen.reintentos import ConflictoOperacion
from i18n import t
from rutas_dashboard import router as tablero
from rutas_estudios import router as estudios
from rutas_registro import RespuestaIn, actor, conexion, listar_reportes, propio
from rutas_registro import router as registro
from rutas_seguimiento import router as seguimiento

_CLAVE = secrets.token_bytes(32)  # Reiniciar el proceso invalida únicamente las sesiones de demo.
_BLOQUEO = threading.Lock()
_DURACION = 8 * 3600
_FORMATO = "%Y-%m-%dT%H:%M:%SZ"


def _carpeta():
    return Path(os.environ.get("VIGIA_DEMO_DIR") or Path(__file__).parent / "data" / "demostraciones").resolve()


def _token(identificador, vence):
    contenido = f"{identificador}.{vence}"
    return contenido + "." + hmac.new(_CLAVE, contenido.encode(), hashlib.sha256).hexdigest()


def _leer_token(valor):
    if not valor or len(valor) > 150:
        raise HTTPException(401, t("api.error.demo_caducada"))
    partes = valor.split(".")
    if len(partes) != 3 or not re.fullmatch(r"[a-f0-9]{32}", partes[0]) or not partes[1].isdigit():
        raise HTTPException(401, t("api.error.demo_caducada"))
    identificador, vence = partes[0], int(partes[1])
    if vence <= time.time() or vence > time.time() + _DURACION + 5 or not hmac.compare_digest(valor, _token(identificador, vence)):
        raise HTTPException(401, t("api.error.demo_caducada"))
    return identificador, vence


def _ruta(identificador):
    if not re.fullmatch(r"[a-f0-9]{32}", identificador):
        raise ValueError("identificador de demostración inválido")
    ruta = _carpeta() / ("demo-" + identificador + ".db")
    if ruta.resolve().parent != _carpeta():
        raise ValueError("base fuera del almacén de demostración")
    return ruta


def _csrf(token):
    return hmac.new(_CLAVE, ("csrf:" + token).encode(), hashlib.sha256).hexdigest()


def _perfil(token):
    identificador, vence = _leer_token(token)
    if not _ruta(identificador).is_file():
        raise HTTPException(401, t("api.error.demo_caducada"))
    return {"tripulante_id": 1, "mision_id": 1, "rol": "astronaut", "demo_publica": True,
            "espacio_demo": identificador, "vence_t_real": datetime.fromtimestamp(vence, timezone.utc).strftime(_FORMATO),
            "csrf": _csrf(token)}


def _conexion_demo(request: Request):
    token = request.cookies.get("vigia_demo")
    identificador, _ = _leer_token(token)
    ruta = _ruta(identificador)
    if not ruta.is_file():
        raise HTTPException(401, t("api.error.demo_caducada"))
    if request.method not in ("GET", "HEAD", "OPTIONS") and not hmac.compare_digest(request.headers.get("X-Vigia-CSRF", ""), _csrf(token)):
        raise HTTPException(403, t("api.error.sin_permiso"))
    conn = conectar(ruta)
    try:
        # Solo este almacén simulado avanza por temporizador. Nunca llama al transporte real.
        cola.avanzar_cola(conn, datetime.now(timezone.utc).strftime(_FORMATO))
        yield conn
    finally:
        conn.close()


def _actor_demo(request: Request, conn=Depends(conexion), x_vigia_demo_rol: str = Header("astronaut")):
    if x_vigia_demo_rol not in ("astronaut", "cmo", "surgeon"):
        raise HTTPException(403, t("api.error.sin_permiso"))
    sujeto = 1 if x_vigia_demo_rol == "astronaut" else 2
    request.state.identidad = {"rol": x_vigia_demo_rol, "tripulante_id": sujeto, "demo_publica": True}
    return sujeto


def _limpiar_caducadas():
    carpeta = _carpeta()
    for archivo in carpeta.glob("demo-*.db"):
        if re.fullmatch(r"demo-[a-f0-9]{32}\.db", archivo.name) and archivo.stat().st_mtime < time.time() - 9 * 3600:
            # Solo archivos de este espacio; jamás carpetas o rutas calculadas fuera de él.
            if archivo.resolve().parent != carpeta:
                raise ValueError("archivo de demostración fuera del almacén")
            try:
                archivo.unlink()
            except OSError:
                pass  # Un lector aún abierto se conserva para el próximo intento.


def _crear_demo():
    with _BLOQUEO:
        carpeta = _carpeta()
        carpeta.mkdir(parents=True, exist_ok=True)
        _limpiar_caducadas()
        if sum(1 for _ in carpeta.glob("demo-*.db")) >= 100:
            raise HTTPException(503, t("api.error.demo_ocupada"))
        identificador = secrets.token_hex(16)
        conn = conectar(_ruta(identificador))
        try:
            migrar(conn)
            ids = tripulacion.sembrar_demo(conn)
            for fila in conn.execute("SELECT id FROM tripulante").fetchall():
                with conn:
                    conn.execute("UPDATE tripulante SET alias = ? WHERE id = ?", (f"Demo {fila[0]}", fila[0]))
                tripulacion.consentir(conn, fila[0], "historial_clinico", datetime.now(timezone.utc).strftime(_FORMATO))
            tripulacion.sembrar_informes_demo(conn, ids)
        finally:
            conn.close()
        return _token(identificador, int(time.time()) + _DURACION)


def crear_aplicacion_demo():
    """La sustitución de dependencias pertenece a esta subaplicación; la API personal no cambia."""
    demo = FastAPI(title="VIGÍA: demostración con datos simulados")
    demo.dependency_overrides[conexion] = _conexion_demo
    demo.dependency_overrides[actor] = _actor_demo

    @demo.middleware("http")
    async def sin_cache(request, call_next):
        respuesta = await call_next(request)
        respuesta.headers["Cache-Control"] = "no-store"
        respuesta.headers["X-Vigia-Demo"] = "simulada"
        return respuesta

    @demo.exception_handler(ValueError)
    async def dato_invalido(request, error):
        return JSONResponse({"detail": t("api.error.dato_invalido", detalle=str(error))}, status_code=422)

    @demo.exception_handler(ConflictoOperacion)
    async def conflicto(request, error):
        return JSONResponse({"detail": t("api.error.dato_invalido", detalle=str(error))}, status_code=409)

    @demo.post("/sesion")
    def entrar(request: Request, response: Response):
        """Abre una demostración aislada sin credenciales personales; repetir conserva la sesión vigente."""
        token = request.cookies.get("vigia_demo")
        try:
            perfil = _perfil(token)
        except HTTPException:
            token = _crear_demo()
            perfil = _perfil(token)
        response.set_cookie("vigia_demo", token, httponly=True, samesite="strict", secure=request.url.scheme == "https" or os.environ.get("VIGIA_COOKIE_SEGURA") == "1", max_age=_DURACION, path="/")
        return perfil

    @demo.get("/sesion")
    def consultar(request: Request):
        """Recupera exclusivamente la sesión de demostración del visitante."""
        return _perfil(request.cookies.get("vigia_demo"))

    @demo.delete("/sesion")
    def salir(request: Request, response: Response):
        """Retira la cookie de demo; no cierra ni modifica sesiones personales."""
        token = request.cookies.get("vigia_demo")
        _leer_token(token)
        if not hmac.compare_digest(request.headers.get("X-Vigia-CSRF", ""), _csrf(token)):
            raise HTTPException(403, t("api.error.sin_permiso"))
        response.delete_cookie("vigia_demo", path="/")
        return {"cerrada": True}

    @demo.get("/tripulantes/{id}/reportes")
    def informes(id: int = Depends(propio), lang: Literal["es", "en"] = "es", conn=Depends(conexion)):
        """Cola simulada propia, sin acuses ni transporte reales."""
        filas = listar_reportes(id, lang, conn)
        for f in filas:
            f.pop("acuse_destino", None)
        return filas

    @demo.get("/reportes/recibidos")
    def recibidos(quien: int = Depends(actor), conn=Depends(conexion)):
        """El rol médico de la demostración ve solo informes ficticios de su espacio."""
        if quien != 2:
            raise HTTPException(403, t("api.error.sin_permiso"))
        filas = [r for r in informes(1, "es", conn) if r["estado"] != "en_cola"]
        return filas

    @demo.post("/reportes/{reporte_id}/respuesta")
    def responder(reporte_id: int, cuerpo: RespuestaIn, quien: int = Depends(actor), conn=Depends(conexion)):
        """Registra una respuesta simulada en esta base; nunca contacta con Tierra."""
        if quien != 2:
            raise HTTPException(403, t("api.error.sin_permiso"))
        cola.responder_reporte(conn, reporte_id, cuerpo.respuesta, cuerpo.t_real)
        return {"ok": True}

    demo.include_router(registro)
    demo.include_router(tablero)
    demo.include_router(seguimiento)
    demo.include_router(estudios)
    # El puente del reloj y el router de identidad personal nunca se montan aquí.
    return demo
