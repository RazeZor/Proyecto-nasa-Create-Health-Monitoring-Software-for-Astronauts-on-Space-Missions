"""Alertas del motor, escalamiento al oficial médico, auditoría y visibilidad (privacidad §5.4)."""
import json
import sqlite3
from datetime import datetime, timezone

from .lecturas import _numero
from .tripulacion import FORMATO, t_mision, tiene_consentimiento

REGLA_ESCALAMIENTO = "escalamiento_rojo"


def _anotar(conn, actor_id, accion, entidad, entidad_id, detalle):
    """Escribe en auditoria sin confirmar la transacción (la confirma quien llama)."""
    return conn.execute(
        "INSERT INTO auditoria (t_real, actor_id, accion, entidad, entidad_id, detalle) VALUES (?, ?, ?, ?, ?, ?)",
        (datetime.now(timezone.utc).strftime(FORMATO), actor_id, accion, entidad, entidad_id,
         json.dumps(detalle, ensure_ascii=False) if detalle is not None else None)).lastrowid


def anotar(conn, actor_id, accion, entidad, entidad_id, detalle=None):
    with conn:
        return _anotar(conn, actor_id, accion, entidad, entidad_id, detalle)


def _escalar(conn, alerta_id):
    a = conn.execute("SELECT a.*, t.mision_id, t.rol FROM alerta a JOIN tripulante t ON t.id = a.tripulante_id "
                     "WHERE a.id = ?", (alerta_id,)).fetchone()
    if a is None:
        raise ValueError(f"no existe la alerta {alerta_id}")
    # si el afectado es el oficial médico, el aviso va al comandante (§5.4, respaldo)
    rol = "comandante" if a["rol"] == "oficial_medico" else "oficial_medico"
    destino = conn.execute("SELECT id FROM tripulante WHERE mision_id = ? AND rol = ? AND id != ? ORDER BY id",
                           (a["mision_id"], rol, a["tripulante_id"])).fetchone()
    if destino is None or not tiene_consentimiento(conn, a["tripulante_id"], REGLA_ESCALAMIENTO):
        motivo = "sin_destinatario" if destino is None else "sin_consentimiento"
        _anotar(conn, a["tripulante_id"], "escalamiento_omitido", "alerta", alerta_id, {"motivo": motivo})
        return None
    contenido = {"indicador": a["indicador"], "valor": a["valor"], "t_real": a["t_real"], "tramo": a["tramo"]}  # dato mínimo
    esc = conn.execute("INSERT INTO escalamiento (alerta_id, destinatario_id, enviado_t_real, contenido) VALUES (?, ?, ?, ?)",
                       (alerta_id, destino[0], a["t_real"], json.dumps(contenido, ensure_ascii=False))).lastrowid
    _anotar(conn, a["tripulante_id"], "escalamiento", "escalamiento", esc, {"destinatario_id": destino[0]})
    return esc


def escalar(conn, alerta_id):
    with conn:
        return _escalar(conn, alerta_id)


def registrar_alerta(conn, tripulante_id, indicador, capa, nivel, valor, t_real, explicacion, regla_version, tramo=None):
    """Guarda la alerta; una roja de la capa A escala en la misma transacción. Reenviar la misma (tripulante,
    indicador, capa, t_real, valor) devuelve el id que ya tenía: la app reintenta sin duplicar avisos."""
    valor = _numero(valor)
    marca = t_mision(conn, tripulante_id, t_real)
    repetida = conn.execute("SELECT id FROM alerta WHERE tripulante_id = ? AND indicador = ? AND capa = ? AND t_real = ? "
                            "AND valor = ? ORDER BY id LIMIT 1", (tripulante_id, indicador, capa, t_real, valor)).fetchone()
    if repetida:
        return repetida[0]
    try:
        with conn:  # una sola transacción: si el escalamiento falla, tampoco queda la alerta
            alerta_id = conn.execute(
                "INSERT INTO alerta (tripulante_id, indicador, capa, nivel, valor, t_real, t_mision, explicacion, tramo, "
                "regla_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (tripulante_id, indicador, capa, nivel, valor, t_real, marca, explicacion, tramo, regla_version)).lastrowid
            if nivel == "rojo" and capa == "A":
                _escalar(conn, alerta_id)
    except sqlite3.IntegrityError as e:
        raise ValueError(str(e)) from None
    return alerta_id


def agregar_contexto(conn, escalamiento_id, texto):
    """El astronauta añade contexto una sola vez; el trigger rechaza cambiarlo o editar lo demás."""
    with conn:
        if conn.execute("UPDATE escalamiento SET contexto_astronauta = ? WHERE id = ?", (texto, escalamiento_id)).rowcount == 0:
            raise ValueError(f"no existe el escalamiento {escalamiento_id}")


def _escalamiento(fila):
    d = dict(fila)
    d["contenido"] = json.loads(d["contenido"])
    return d


def listar_escalamientos(conn, destinatario_id=None, tripulante_id=None):
    """Escalamientos recibidos por `destinatario_id` o enviados por el afectado `tripulante_id`."""
    sql, args = ("SELECT e.*, a.tripulante_id FROM escalamiento e JOIN alerta a ON a.id = e.alerta_id WHERE 1 = 1", [])
    for campo, valor in (("e.destinatario_id", destinatario_id), ("a.tripulante_id", tripulante_id)):
        if valor is not None:
            sql += f" AND {campo} = ?"
            args.append(valor)
    return [_escalamiento(f) for f in conn.execute(sql + " ORDER BY e.id", args)]


def alertas_visibles(conn, actor_id, tripulante_id):
    """El dueño ve todas sus alertas. Otro tripulante recibe solo el dato mínimo de las escaladas a él
    (indicador, valor, hora y tramo: §5.4), nunca la explicación ni las demás alertas. El acceso ajeno se audita."""
    if actor_id == tripulante_id:
        return [dict(f) for f in conn.execute("SELECT * FROM alerta WHERE tripulante_id = ? ORDER BY t_real, id",
                                              (tripulante_id,))]
    resultado = [{"escalamiento_id": e["id"], "alerta_id": e["alerta_id"], "tripulante_id": e["tripulante_id"],
                  **e["contenido"]} for e in listar_escalamientos(conn, destinatario_id=actor_id, tripulante_id=tripulante_id)]
    anotar(conn, actor_id, "lectura_ajena", "alerta", tripulante_id, {"devueltas": len(resultado)})
    return resultado
