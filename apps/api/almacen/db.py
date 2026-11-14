"""Conexión y migraciones del almacén SQLite (solo biblioteca estándar)."""
import os
import re
import sqlite3
from pathlib import Path

MIGRACIONES = Path(__file__).resolve().parent / "migraciones"


def ruta_por_defecto():
    """`VIGIA_DB` o apps/api/data/vigia.db (fuera de git)."""
    return Path(os.environ.get("VIGIA_DB") or Path(__file__).resolve().parents[1] / "data" / "vigia.db")


def conectar(ruta=None):
    ruta = ruta_por_defecto() if ruta is None else ruta
    if str(ruta) != ":memory:":
        Path(ruta).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(ruta))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn


def migrar(conn):
    """Aplica en orden las migraciones NNN_*.sql pendientes y devuelve la versión resultante."""
    actual = conn.execute("PRAGMA user_version").fetchone()[0]
    for archivo in sorted(MIGRACIONES.glob("*.sql")):
        version = int(re.match(r"(\d+)_", archivo.name).group(1))
        if version > actual:
            conn.executescript(archivo.read_text())  # los triggers llevan ';' internos: executescript
            conn.execute(f"PRAGMA user_version = {version}")
            conn.commit()
            actual = version
    return actual
