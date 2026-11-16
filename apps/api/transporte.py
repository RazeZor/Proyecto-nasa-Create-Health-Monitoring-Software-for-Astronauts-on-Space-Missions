"""Transporte a un proceso destino: el temporizador solo habilita el intento, nunca acredita entrega."""
import hashlib
import json
import os
import sqlite3
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone

from almacen.tripulacion import _utc


class SinRedireccion(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def entregar_pendientes(conn, ahora, enviar=None):
    _utc(ahora)
    url = os.environ.get("VIGIA_TIERRA_URL", "").rstrip("/")
    clave = os.environ.get("VIGIA_TIERRA_CLAVE", "")
    if not url or len(clave) < 32:
        return 0
    partes = urllib.parse.urlsplit(url)
    if partes.username or partes.password or partes.query or partes.fragment or partes.scheme not in ("http", "https"):
        raise ValueError("URL de Tierra inválida")
    if partes.scheme != "https" and partes.hostname not in ("127.0.0.1", "localhost", "::1"):
        raise ValueError("el transporte fuera de loopback requiere HTTPS")
    with conn:
        conn.execute("INSERT INTO transporte_instancia VALUES (1, ?) ON CONFLICT DO NOTHING", (str(uuid.uuid4()),))
    instancia = conn.execute("SELECT identificador FROM transporte_instancia WHERE id = 1").fetchone()[0]
    entregados = 0
    for fila in conn.execute("SELECT * FROM reporte_cola WHERE estado = 'en_cola' AND llega_t_real <= ? ORDER BY id", (ahora,)).fetchall():
        mensaje = {"version": "mensaje-v1", "id": f"{instancia}:{fila['id']}", "creado_t_real": fila["creado_t_real"],
                   "contenido": json.loads(fila["contenido"]) if fila["contenido"] else {}}
        cuerpo = json.dumps(mensaje, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
        huella = hashlib.sha256(cuerpo).hexdigest()
        try:
            if enviar:
                acuse = enviar(mensaje, cuerpo)
            else:
                req = urllib.request.Request(url + "/mensajes", data=cuerpo,
                                             headers={"Authorization": f"Bearer {clave}", "Content-Type": "application/json"}, method="POST")
                with urllib.request.build_opener(SinRedireccion).open(req, timeout=5) as respuesta:
                    acuse = json.loads(respuesta.read(8193))
            if acuse.get("id") != mensaje["id"] or acuse.get("sha256") != huella:
                continue
            _utc(acuse.get("t_real"))
            with conn:
                conn.execute("INSERT INTO transporte_acuse VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
                             (fila["id"], mensaje["id"], huella, acuse["t_real"]))
                conn.execute("UPDATE reporte_cola SET estado = 'entregado' WHERE id = ? AND estado = 'en_cola'", (fila["id"],))
            entregados += 1
        except (OSError, ValueError, TypeError, AttributeError, sqlite3.IntegrityError):
            continue  # Conserva el reporte íntegro para reintentar con el mismo ID.
    return entregados


def ahora_utc():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _peticion_destino(ruta, datos=None, operador=False):
    url = os.environ.get("VIGIA_TIERRA_URL", "").rstrip("/")
    clave = os.environ.get("VIGIA_TIERRA_OPERADOR_CLAVE" if operador else "VIGIA_TIERRA_CLAVE", "")
    p = urllib.parse.urlsplit(url)
    if len(clave) < 32 or p.username or p.password or p.query or p.fragment or p.scheme not in ("http", "https") or (p.scheme == "http" and p.hostname not in ("127.0.0.1", "localhost", "::1")):
        raise ValueError("destino o credencial no configurado")
    req = urllib.request.Request(url + ruta, data=json.dumps(datos, ensure_ascii=False).encode() if datos is not None else None,
                                 headers={"Authorization": f"Bearer {clave}", "Content-Type": "application/json"})
    with urllib.request.build_opener(SinRedireccion).open(req, timeout=5) as res:
        return json.loads(res.read(16385))


def responder_en_destino(conn, reporte_id, texto, t_real):
    _utc(t_real)
    acuse = conn.execute("SELECT mensaje_id FROM transporte_acuse WHERE reporte_id = ?", (reporte_id,)).fetchone()
    if not acuse:
        raise ValueError("el destino no ha confirmado recepción")
    identificador = str(uuid.uuid5(uuid.NAMESPACE_URL, acuse[0] + t_real + texto))
    datos = {"id": identificador, "t_real": t_real, "texto": texto}
    respuesta = _peticion_destino("/mensajes/" + urllib.parse.quote(acuse[0], safe="") + "/respuestas", datos, operador=True)
    if respuesta != {**datos, "en_respuesta_a": acuse[0]}:
        raise ValueError("el destino no confirmó la respuesta solicitada")
    recoger_respuestas(conn)


def recoger_respuestas(conn, consultar=None):
    recogidas = 0
    for f in conn.execute("SELECT a.*, r.estado FROM transporte_acuse a JOIN reporte_cola r ON r.id = a.reporte_id WHERE r.estado = 'entregado'").fetchall():
        try:
            datos = consultar(f["mensaje_id"]) if consultar else _peticion_destino("/mensajes/" + urllib.parse.quote(f["mensaje_id"], safe=""))
            respuesta = datos.get("respuesta")
            if datos.get("id") != f["mensaje_id"] or datos.get("sha256") != f["sha256"] or not respuesta:
                continue
            if respuesta.get("en_respuesta_a") != f["mensaje_id"] or not isinstance(respuesta.get("id"), str) or not isinstance(respuesta.get("texto"), str) or not 1 <= len(respuesta["texto"]) <= 2000:
                continue
            _utc(respuesta.get("t_real"))
            with conn:
                conn.execute("INSERT INTO transporte_respuesta VALUES (?, ?, ?, ?, ?, ?)",
                             (respuesta["id"], f["reporte_id"], f["mensaje_id"], respuesta["t_real"], ahora_utc(), json.dumps(respuesta, sort_keys=True, ensure_ascii=False)))
                conn.execute("UPDATE reporte_cola SET estado = 'respondido', respuesta = ? WHERE id = ? AND estado = 'entregado'",
                             (respuesta["texto"], f["reporte_id"]))
            recogidas += 1
        except (OSError, ValueError, TypeError, AttributeError, sqlite3.IntegrityError):
            continue
    return recogidas
