"""Misión, tripulantes y consentimiento; conversión de t_real a hora de misión."""
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

FORMATO = "%Y-%m-%dT%H:%M:%SZ"
DEMO_DIA1 = "2026-11-14T00:00:00Z"


def _utc(t_real):
    """Único lugar que valida `YYYY-MM-DDTHH:MM:SSZ` y lo convierte a datetime UTC."""
    try:
        t = datetime.strptime(t_real, FORMATO).replace(tzinfo=timezone.utc)
        if t.strftime(FORMATO) != t_real:  # strptime acepta '10:0:0Z' o dígitos Unicode: dos textos para un mismo instante
            raise ValueError
        return t
    except (TypeError, ValueError):
        raise ValueError(f"t_real inválido (se espera YYYY-MM-DDTHH:MM:SSZ): {t_real!r}") from None


def _insertar(conn, sql, valores):
    try:
        with conn:
            return conn.execute(sql, valores).lastrowid
    except sqlite3.IntegrityError as e:  # CHECK de enumerados, unicidad o llave foránea
        raise ValueError(str(e)) from None


def crear_mision(conn, nombre, perfil, dia1_t_real):
    _utc(dia1_t_real)
    return _insertar(conn, "INSERT INTO mision (nombre, perfil, dia1_t_real) VALUES (?, ?, ?)",
                     (nombre, perfil, dia1_t_real))


def crear_tripulante(conn, alias, mision_id, rol):
    return _insertar(conn, "INSERT INTO tripulante (alias, mision_id, rol) VALUES (?, ?, ?)", (alias, mision_id, rol))


def consentir(conn, tripulante_id, regla, t_real):
    _utc(t_real)
    with conn:
        conn.execute("INSERT OR REPLACE INTO consentimiento (tripulante_id, regla, aceptado_t_real) VALUES (?, ?, ?)",
                     (tripulante_id, regla, t_real))


def tiene_consentimiento(conn, tripulante_id, regla):
    return conn.execute("SELECT 1 FROM consentimiento WHERE tripulante_id = ? AND regla = ?",
                        (tripulante_id, regla)).fetchone() is not None


def _dia1(conn, tripulante_id):
    fila = conn.execute("SELECT m.dia1_t_real FROM tripulante t JOIN mision m ON m.id = t.mision_id WHERE t.id = ?",
                        (tripulante_id,)).fetchone()
    if fila is None:
        raise ValueError(f"no existe el tripulante {tripulante_id}")
    return _utc(fila[0])


def dia_de_vuelo(conn, tripulante_id, t_real):
    """Día de vuelo (1 = día 1 de la misión) o None si t_real es anterior al vuelo."""
    t, dia1 = _utc(t_real), _dia1(conn, tripulante_id)
    return (t - dia1).days + 1 if t >= dia1 else None


def t_mision(conn, tripulante_id, t_real):
    """`D022T00:05:00`; None antes del día 1 (línea base de tierra)."""
    dia = dia_de_vuelo(conn, tripulante_id, t_real)
    return None if dia is None else f"D{dia:03d}T{_utc(t_real):%H:%M:%S}"


def sembrar_informes_demo(conn, ids):
    """Informes de ejemplo ya respondidos por tierra (apps/api/demo/informes.json). Idempotente por título."""
    from . import cola  # cola importa de este módulo
    ruta = Path(__file__).resolve().parents[1] / "demo" / "informes.json"
    titulos = {(r["contenido"] or {}).get("titulo") for r in cola.leer_reportes(conn, ids["astronauta"])}
    for informe in json.loads(ruta.read_text(encoding="utf-8")):
        if informe["contenido"]["titulo"] in titulos:
            continue
        rid = cola.encolar_reporte(conn, ids["astronauta"], informe["creado_t_real"], informe["retardo_min"], informe["contenido"])
        llega = conn.execute("SELECT llega_t_real FROM reporte_cola WHERE id = ?", (rid,)).fetchone()[0]
        conn.execute("UPDATE reporte_cola SET estado = 'entregado' WHERE id = ?", (rid,))
        conn.commit()
        cola.responder_reporte(conn, rid, informe["respuesta"], llega)


NOMBRE_RELOJ_FERNANDO = "Galaxy Fernando"


def sembrar_demo(conn):
    """Misión `demo` con astronauta, oficial médico, comandante y los astronautas de prueba Sebastián y Fernando, todos
    con consentimiento. Idempotente."""
    fila = conn.execute("SELECT id FROM mision WHERE nombre = 'demo'").fetchone()
    mision = fila[0] if fila else crear_mision(conn, "demo", "estacion", DEMO_DIA1)
    ids = {}
    for rol in ("astronauta", "oficial_medico", "comandante"):
        fila = conn.execute("SELECT id FROM tripulante WHERE mision_id = ? AND alias = ?", (mision, rol)).fetchone()
        ids[rol] = fila[0] if fila else crear_tripulante(conn, rol, mision, rol)
        consentir(conn, ids[rol], "escalamiento_rojo", DEMO_DIA1)
    # Dos astronautas de prueba, cada uno con su forma de enlazar el reloj (puente_reloj.py, `resolver_id`):
    # Sebastián, por alias (el reloj se llama «Sebastián»: no hace falta configurar nada); Fernando, por un
    # vínculo explícito en `reloj_vinculo` (su reloj se llama «Galaxy Fernando», distinto de su alias).
    for clave, alias in (("sebastian", "Sebastián"), ("fernando", "Fernando")):
        fila = conn.execute("SELECT id FROM tripulante WHERE mision_id = ? AND alias = ?", (mision, alias)).fetchone()
        ids[clave] = fila[0] if fila else crear_tripulante(conn, alias, mision, "astronauta")
        consentir(conn, ids[clave], "escalamiento_rojo", DEMO_DIA1)
    conn.execute("INSERT OR IGNORE INTO reloj_vinculo (nombre, tripulante_id, t_real) VALUES (?, ?, ?)",
                 (NOMBRE_RELOJ_FERNANDO, ids["fernando"], DEMO_DIA1))
    conn.commit()
    return ids
