"""Cola de reportes hacia tierra con el retardo del día de misión (0 a 22 min; informe §4.2)."""
from datetime import timedelta

from .tripulacion import FORMATO, _insertar, _utc


def encolar_reporte(conn, tripulante_id, creado_t_real, retardo_min):
    if isinstance(retardo_min, bool) or not isinstance(retardo_min, int) or not 0 <= retardo_min <= 22:
        raise ValueError(f"retardo_min debe ser un entero de 0 a 22: {retardo_min!r}")
    llega = (_utc(creado_t_real) + timedelta(minutes=retardo_min)).strftime(FORMATO)
    return _insertar(conn, "INSERT INTO reporte_cola (tripulante_id, creado_t_real, retardo_min, llega_t_real) "
                           "VALUES (?, ?, ?, ?)", (tripulante_id, creado_t_real, retardo_min, llega))


def avanzar_cola(conn, ahora):
    """Pasa a `entregado` los reportes que ya llegaron a tierra; devuelve cuántos."""
    _utc(ahora)
    with conn:
        return conn.execute("UPDATE reporte_cola SET estado = 'entregado' WHERE estado = 'en_cola' AND llega_t_real <= ?",
                            (ahora,)).rowcount


def responder_reporte(conn, reporte_id, respuesta, t_real):
    """Solo un reporte `entregado` puede responderse, y no antes de su llegada a tierra."""
    _utc(t_real)
    with conn:
        if conn.execute("UPDATE reporte_cola SET estado = 'respondido', respuesta = ? "
                        "WHERE id = ? AND estado = 'entregado' AND llega_t_real <= ?",
                        (respuesta, reporte_id, t_real)).rowcount == 0:
            raise ValueError(f"el reporte {reporte_id} no puede responderse (no existe, no ha llegado o ya se respondió)")


def leer_reportes(conn, tripulante_id):
    return [dict(f) for f in conn.execute("SELECT * FROM reporte_cola WHERE tripulante_id = ? ORDER BY creado_t_real, id",
                                          (tripulante_id,))]
