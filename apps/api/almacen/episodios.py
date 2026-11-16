"""Bitácora inmutable y proyección de episodios con concurrencia optimista."""
import json
import sqlite3
from datetime import datetime, timezone

from .reintentos import ConflictoOperacion
from .tripulacion import _utc


def _estado(anterior, tipo, revisor):
    if tipo == "abrir" and anterior is None:
        return "abierto"
    if tipo == "reabrir" and anterior == "cerrado":
        return "abierto"
    if anterior in (None, "cerrado") or tipo in ("abrir", "reabrir"):
        raise ValueError("transición no permitida")
    if tipo == "cerrar":
        if anterior != "en_revision" or not revisor:
            raise ValueError("cierre requiere revisión autorizada")
        return "cerrado"
    if tipo == "solicitar_revision":
        return "en_revision"
    if tipo in ("accion", "impedimento", "remedicion"):
        return "en_seguimiento"
    raise ValueError("evento desconocido")


def registrar(conn, propietario, actor, datos):
    _utc(datos["t_real"])
    if not datos["nota"].strip():
        raise ValueError("el evento requiere un motivo")
    if datos["tipo"] == "remedicion" and not datos["observaciones"]:
        raise ValueError("remedición sin observaciones")
    contenido = json.dumps(datos, sort_keys=True, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    try:
        with conn:
            conn.execute("BEGIN IMMEDIATE")
            repetido = conn.execute("SELECT e.*, p.tripulante_id FROM episodio_evento e JOIN episodio p ON p.id = e.episodio_id WHERE e.id = ?",
                                    (datos["id"],)).fetchone()
            if repetido:
                if repetido["tripulante_id"] != propietario or repetido["actor_id"] != actor or repetido["contenido"] != contenido:
                    raise ConflictoOperacion("operación de episodio reutilizada")
                return {"id": datos["id"], "episodio_id": datos["episodio_id"], "version": repetido["version"]}
            medico = conn.execute("SELECT 1 FROM tripulante a JOIN tripulante b ON a.mision_id = b.mision_id "
                                  "WHERE a.id = ? AND b.id = ? AND a.rol = 'oficial_medico'", (actor, propietario)).fetchone()
            if actor != propietario and not medico:
                raise PermissionError("episodio ajeno")
            anterior = conn.execute("SELECT * FROM episodio WHERE id = ?", (datos["episodio_id"],)).fetchone()
            if anterior and anterior["tripulante_id"] != propietario:
                raise PermissionError("episodio ajeno")
            if datos["version_previa"] != (anterior["version"] if anterior else 0):
                raise ConflictoOperacion("la versión del episodio cambió")
            if anterior and (datos["clave"] != anterior["clave"] or datos["indicador"] != anterior["indicador"]):
                raise ConflictoOperacion("la identidad del episodio no se puede cambiar")
            for identificador in datos["observaciones"]:
                toma = conn.execute("SELECT t_real FROM observacion WHERE id = ? AND tripulante_id = ?", (identificador, propietario)).fetchone()
                if not toma:
                    raise ValueError("observación enlazada ausente o ajena; sincronizarla primero")
                if datos["tipo"] == "remedicion":
                    inicio = conn.execute("SELECT t_real FROM episodio_evento WHERE episodio_id = ? AND tipo IN ('abrir','reabrir','accion','impedimento') ORDER BY version DESC LIMIT 1", (datos["episodio_id"],)).fetchone()
                    if not inicio or toma["t_real"] is None or toma["t_real"] <= inicio[0]:
                        raise ValueError("la remedición requiere una toma con hora posterior a la apertura o última acción")
            estado = _estado(anterior["estado"] if anterior else None, datos["tipo"], bool(medico))
            version = datos["version_previa"] + 1
            if anterior:
                conn.execute("UPDATE episodio SET estado = ?, version = ? WHERE id = ?", (estado, version, datos["episodio_id"]))
            else:
                conn.execute("INSERT INTO episodio VALUES (?, ?, ?, ?, ?, ?)",
                             (datos["episodio_id"], propietario, datos["clave"], datos["indicador"], estado, version))
            conn.execute("INSERT INTO episodio_evento VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                         (datos["id"], datos["episodio_id"], actor, datos["tipo"], datos["t_real"],
                          datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), version, contenido))
            return {"id": datos["id"], "episodio_id": datos["episodio_id"], "version": version}
    except sqlite3.IntegrityError as error:
        raise ConflictoOperacion(str(error)) from None


def listar(conn, propietario):
    salida = []
    for f in conn.execute("SELECT * FROM episodio WHERE tripulante_id = ? ORDER BY rowid DESC", (propietario,)):
        episod = dict(f)
        episod["eventos"] = [{**json.loads(e["contenido"]), "actor_id": e["actor_id"], "recibido_t_real": e["recibido_t_real"]}
                             for e in conn.execute("SELECT * FROM episodio_evento WHERE episodio_id = ? ORDER BY version", (f["id"],))]
        salida.append(episod)
    return salida
