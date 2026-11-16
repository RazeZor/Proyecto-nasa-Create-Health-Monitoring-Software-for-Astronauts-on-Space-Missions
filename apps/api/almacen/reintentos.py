"""Inserción idempotente por propietario y operación, con detección de contenido distinto."""
import sqlite3


class ConflictoOperacion(ValueError):
    """El cliente reutilizó un identificador para un contenido distinto."""


def insertar(conn, tabla, tripulante_id, operacion_id, campos):
    """Inserta o devuelve el mismo id; índice UNIQUE y comparación dentro de la misma transacción.

    Los nombres de tabla/campos son constantes internas, nunca entrada de HTTP.
    Un cliente anterior sin operacion_id conserva la semántica de inserción original.
    """
    if operacion_id is not None and (not isinstance(operacion_id, str) or not 1 <= len(operacion_id) <= 200):
        raise ValueError("operacion_id debe tener entre 1 y 200 caracteres")
    datos = {"tripulante_id": tripulante_id, "operacion_id": operacion_id, **campos}
    columnas = ", ".join(datos)
    parametros = ", ".join("?" for _ in datos)
    try:
        with conn:
            cursor = conn.execute(f"INSERT INTO {tabla} ({columnas}) VALUES ({parametros}) "
                                  "ON CONFLICT (tripulante_id, operacion_id) DO NOTHING", tuple(datos.values()))
            if operacion_id is None:
                return cursor.lastrowid
            fila = conn.execute(f"SELECT * FROM {tabla} WHERE tripulante_id = ? AND operacion_id = ?",
                                (tripulante_id, operacion_id)).fetchone()
            if any(fila[campo] != valor for campo, valor in campos.items()):
                raise ConflictoOperacion("operación repetida con contenido diferente")
            return fila["id"]
    except sqlite3.IntegrityError as e:
        raise ValueError(str(e)) from None
