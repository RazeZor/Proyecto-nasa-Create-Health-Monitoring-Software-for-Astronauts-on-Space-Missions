"""Tomas inmutables, correcciones enlazadas y acuses idempotentes por sujeto."""
import json
import sqlite3
from datetime import datetime, timezone

from .reintentos import ConflictoOperacion
from .tripulacion import _utc, t_mision

VERSION = "observacion-v1"


def registrar(conn, tripulante_id, datos):
    """No sustituye originales. Una corrección es otra observación del mismo indicador."""
    datos = dict(datos)
    identificador = datos["id"]
    operacion = datos["operacion_id"]
    if not all(isinstance(v, str) and 1 <= len(v) <= 200 for v in (identificador, operacion)):
        raise ValueError("id y operacion_id deben tener entre 1 y 200 caracteres")
    indicador = conn.execute("SELECT unidad FROM indicador WHERE id = ?", (datos["indicador"],)).fetchone()
    if not indicador or datos["unidad"] != indicador[0]:
        raise ValueError("indicador o unidad incompatible; no se convierte una unidad implícitamente")
    from .lecturas import _numero
    datos["valor"] = _numero(datos["valor"])
    fecha = datos.get("t_real")
    if fecha is not None:
        _utc(fecha)
    if (fecha is None) != (datos["precision_tiempo"] == "desconocida"):
        raise ValueError("la precisión temporal debe representar la hora disponible")
    sujeto = conn.execute("SELECT t.mision_id, m.perfil FROM tripulante t JOIN mision m ON m.id = t.mision_id "
                          "WHERE t.id = ?", (tripulante_id,)).fetchone()
    if not sujeto:
        raise ValueError("tripulante desconocido")
    contenido = json.dumps(datos, sort_keys=True, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    try:
        with conn:
            conn.execute("BEGIN IMMEDIATE")
            anterior = conn.execute("SELECT * FROM observacion WHERE id = ? OR (tripulante_id = ? AND operacion_id = ?)",
                                    (identificador, tripulante_id, operacion)).fetchone()
            if anterior:
                if anterior["tripulante_id"] != tripulante_id or anterior["contenido"] != contenido:
                    raise ConflictoOperacion("identificador de observación reutilizado con otro contenido")
                return {"id": anterior["id"], "recibido_t_real": anterior["recibido_t_real"], "repetida": True}
            correccion = datos.get("corrige_id")
            if correccion and not conn.execute("SELECT 1 FROM observacion WHERE id = ? AND tripulante_id = ? AND indicador = ?",
                                               (correccion, tripulante_id, datos["indicador"])).fetchone():
                raise ValueError("la corrección debe enlazar una toma propia del mismo indicador")
            recibida = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            lectura_id = None
            # Compatibilidad: no dar una hora inventada a una toma sin fecha.
            if fecha is not None:
                naturaleza = "Real" if datos["uso"] == "operativo" else "Simulado"
                origen = datos["origen"] if datos["origen"] in ("manual", "sensor") else "simulado"
                conn.execute("INSERT INTO lectura (tripulante_id, indicador, valor, t_real, t_mision, origen, metodo, naturaleza) "
                             "VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING",
                             (tripulante_id, datos["indicador"], datos["valor"], fecha,
                              t_mision(conn, tripulante_id, fecha), origen, datos.get("metodo"), naturaleza))
                lectura_id = conn.execute("SELECT id FROM lectura WHERE tripulante_id = ? AND indicador = ? AND t_real = ? AND origen = ?",
                                          (tripulante_id, datos["indicador"], fecha, origen)).fetchone()[0]
            columnas = {"id": identificador, "tripulante_id": tripulante_id, "mision_id": sujeto[0], "operacion_id": operacion,
                        **{k: datos.get(k) for k in ("indicador", "valor", "unidad", "t_real", "precision_tiempo", "origen", "metodo",
                                                   "instrumento", "sitio", "uso", "comparable", "corrige_id")},
                        "recibido_t_real": recibida, "perfil": sujeto[1], "configuracion_version": datos["configuracion_version"],
                        "lectura_id": lectura_id, "contenido": contenido}
            conn.execute(f"INSERT INTO observacion ({','.join(columnas)}) VALUES ({','.join('?' for _ in columnas)})", tuple(columnas.values()))
            return {"id": identificador, "recibido_t_real": recibida, "repetida": False}
    except sqlite3.IntegrityError as error:
        raise ValueError(str(error)) from None


def listar(conn, tripulante_id):
    """Incluye originales corregidos: el cliente decide su vista sin borrar historia."""
    return [{k: v for k, v in dict(f).items() if k != "contenido"} for f in conn.execute(
        "SELECT * FROM observacion WHERE tripulante_id = ? ORDER BY t_real, recibido_t_real, rowid", (tripulante_id,))]
