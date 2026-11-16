"""Proceso Tierra independiente. Arranque: uvicorn receptor:app --port 8100."""
import hashlib
import hmac
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "packages" / "i18n"))
from i18n import t  # noqa: E402

app = FastAPI(title="VIGÍA: receptor de ensayo en Tierra")


def autorizado(authorization: str | None = Header(None)):
    clave = os.environ.get("VIGIA_TIERRA_CLAVE", "")
    if len(clave) < 32 or not hmac.compare_digest(authorization or "", f"Bearer {clave}"):
        raise HTTPException(401, t("api.error.sin_permiso"))


def operador(authorization: str | None = Header(None)):
    clave = os.environ.get("VIGIA_TIERRA_OPERADOR_CLAVE", "")
    if len(clave) < 32 or not hmac.compare_digest(authorization or "", f"Bearer {clave}"):
        raise HTTPException(403, t("api.error.sin_permiso"))


def conexion():
    ruta = Path(os.environ.get("VIGIA_TIERRA_DB") or Path(__file__).parent / "data" / "tierra.db")
    ruta.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(ruta, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("CREATE TABLE IF NOT EXISTS mensaje (id TEXT PRIMARY KEY, sha256 TEXT NOT NULL, t_real TEXT NOT NULL, contenido TEXT NOT NULL)")
    conn.execute("CREATE TABLE IF NOT EXISTS respuesta (id TEXT PRIMARY KEY, mensaje_id TEXT NOT NULL UNIQUE REFERENCES mensaje(id), contenido TEXT NOT NULL)")
    try:
        yield conn
    finally:
        conn.close()


class MensajeIn(BaseModel):
    model_config = {"extra": "forbid"}
    version: Literal["mensaje-v1"]
    id: str = Field(min_length=1, max_length=200)
    creado_t_real: str
    contenido: dict


@app.post("/mensajes", dependencies=[Depends(autorizado)], description="Persiste un mensaje antes de devolver su acuse y hash.")
async def recibir(cuerpo: MensajeIn, request: Request, conn=Depends(conexion)):
    original = await request.body()
    if len(original) > 1_000_000:
        raise HTTPException(413, t("api.error.dato_invalido", detalle="mensaje > 1 MB"))
    canonico = json.dumps(cuerpo.model_dump(), ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)
    huella = hashlib.sha256(canonico.encode()).hexdigest()
    ahora = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with conn:
        conn.execute("INSERT INTO mensaje VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING", (cuerpo.id, huella, ahora, canonico))
        previo = conn.execute("SELECT * FROM mensaje WHERE id = ?", (cuerpo.id,)).fetchone()
        if previo["sha256"] != huella:
            raise HTTPException(409, t("api.error.dato_invalido", detalle="id"))
    return {"id": cuerpo.id, "sha256": huella, "t_real": previo["t_real"]}


@app.get("/mensajes/{id}", dependencies=[Depends(autorizado)], description="Consulta una recepción persistida; requiere la credencial del enlace.")
def consultar(id: str, conn=Depends(conexion)):
    fila = conn.execute("SELECT * FROM mensaje WHERE id = ?", (id,)).fetchone()
    if not fila:
        raise HTTPException(404, t("api.error.dato_invalido", detalle=id))
    respuesta = conn.execute("SELECT contenido FROM respuesta WHERE mensaje_id = ?", (id,)).fetchone()
    return {"id": fila["id"], "sha256": fila["sha256"], "t_real": fila["t_real"],
            **({"respuesta": json.loads(respuesta[0])} if respuesta else {})}


class RespuestaIn(BaseModel):
    model_config = {"extra": "forbid"}
    id: str = Field(min_length=1, max_length=200)
    t_real: str
    texto: str = Field(min_length=1, max_length=2000)


@app.post("/mensajes/{id}/respuestas", dependencies=[Depends(operador)], description="Un operador autorizado responde a un mensaje realmente recibido; conserva su vínculo causal.")
def responder(id: str, cuerpo: RespuestaIn, conn=Depends(conexion)):
    datos = {**cuerpo.model_dump(), "en_respuesta_a": id}
    contenido = json.dumps(datos, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    if not conn.execute("SELECT 1 FROM mensaje WHERE id = ?", (id,)).fetchone():
        raise HTTPException(404, t("api.error.dato_invalido", detalle=id))
    with conn:
        conn.execute("INSERT INTO respuesta VALUES (?, ?, ?) ON CONFLICT DO NOTHING", (cuerpo.id, id, contenido))
        anterior = conn.execute("SELECT contenido FROM respuesta WHERE id = ? AND mensaje_id = ?", (cuerpo.id, id)).fetchone()
        if not anterior or anterior[0] != contenido:
            raise HTTPException(409, t("api.error.dato_invalido", detalle="id"))
    return datos
