"""Línea base (mediana y MAD) por tripulante, indicador y origen (tierra o vuelo)."""
from .lecturas import _numero
from .tripulacion import _insertar, _utc


def guardar_linea_base(conn, tripulante_id, indicador, origen, mediana, mad, n, desde, hasta):
    """Reemplaza la fila de la misma clave. El peso w(d) de §5.2 se calcula al leer, no se guarda."""
    mediana, mad = _numero(mediana), _numero(mad)
    if mad < 0 or not isinstance(n, int) or n <= 0 or _utc(desde) > _utc(hasta):
        raise ValueError("línea base inválida: mad >= 0, n > 0 y desde <= hasta")
    _insertar(conn, "INSERT OR REPLACE INTO linea_base (tripulante_id, indicador, origen, mediana, mad, n, desde, hasta)"
                    " VALUES (?, ?, ?, ?, ?, ?, ?, ?)", (tripulante_id, indicador, origen, mediana, mad, n, desde, hasta))


def obtener_linea_base(conn, tripulante_id, indicador, origen):
    fila = conn.execute("SELECT * FROM linea_base WHERE tripulante_id = ? AND indicador = ? AND origen = ?",
                        (tripulante_id, indicador, origen)).fetchone()
    return dict(fila) if fila else None
