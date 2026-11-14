"""Lecturas de indicadores y síntomas de un tripulante."""
import math

from .tripulacion import _insertar, _utc, t_mision


def _numero(valor):
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not math.isfinite(valor):
        raise ValueError(f"valor numérico finito requerido: {valor!r}")
    return float(valor)


def registrar_lectura(conn, tripulante_id, indicador, valor, t_real, origen="manual", metodo=None,
                      naturaleza="Simulado"):
    """Guarda una lectura. Reenviar la misma (tripulante, indicador, t_real, origen) devuelve el mismo id."""
    valor = _numero(valor)
    marca = t_mision(conn, tripulante_id, t_real)  # valida t_real y tripulante
    _insertar(conn, "INSERT INTO lectura (tripulante_id, indicador, valor, t_real, t_mision, origen, metodo, naturaleza)"
                    " VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (tripulante_id, indicador, t_real, origen) DO NOTHING",
              (tripulante_id, indicador, valor, t_real, marca, origen, metodo, naturaleza))
    return conn.execute("SELECT id FROM lectura WHERE tripulante_id = ? AND indicador = ? AND t_real = ? AND origen = ?",
                        (tripulante_id, indicador, t_real, origen)).fetchone()[0]


def _rango(tabla, conn, tripulante_id, desde, hasta, indicador=None):
    sql, args = f"SELECT * FROM {tabla} WHERE tripulante_id = ?", [tripulante_id]
    for campo, valor, op in (("indicador", indicador, "="), ("t_real", desde, ">="), ("t_real", hasta, "<=")):
        if valor is not None:
            if campo == "t_real":
                _utc(valor)
            sql += f" AND {campo} {op} ?"
            args.append(valor)
    return [dict(f) for f in conn.execute(sql + " ORDER BY t_real, id", args)]


def leer_lecturas(conn, tripulante_id, indicador=None, desde=None, hasta=None):
    return _rango("lectura", conn, tripulante_id, desde, hasta, indicador)


def registrar_sintoma(conn, tripulante_id, codigo, gravedad, t_real):
    marca = t_mision(conn, tripulante_id, t_real)
    return _insertar(conn, "INSERT INTO sintoma (tripulante_id, t_real, t_mision, codigo, gravedad) VALUES (?, ?, ?, ?, ?)",
                     (tripulante_id, t_real, marca, codigo, gravedad))


def leer_sintomas(conn, tripulante_id, desde=None, hasta=None):
    return _rango("sintoma", conn, tripulante_id, desde, hasta)
