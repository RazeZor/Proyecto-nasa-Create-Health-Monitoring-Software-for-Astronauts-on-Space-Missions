"""Conexión y migraciones del almacén SQLite (solo biblioteca estándar)."""
import os
import re
import sqlite3
import threading
from pathlib import Path

MIGRACIONES = Path(__file__).resolve().parent / "migraciones"
_BLOQUEO = threading.Lock()  # un solo proceso migra a la vez; shortcut: no cubre varios procesos sobre el mismo archivo


def ruta_por_defecto():
    """`VIGIA_DB` o apps/api/data/vigia.db (fuera de git)."""
    return Path(os.environ.get("VIGIA_DB") or Path(__file__).resolve().parents[1] / "data" / "vigia.db")


def conectar(ruta=None):
    ruta = ruta_por_defecto() if ruta is None else ruta
    if str(ruta) != ":memory:":
        Path(ruta).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(ruta), check_same_thread=False)  # una conexión por petición: FastAPI la usa desde varios hilos
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 5000")
    conn.execute("PRAGMA recursive_triggers = ON")  # sin esto, INSERT OR REPLACE elude los triggers de solo adición
    return conn


def migrar(conn):
    """Aplica en orden las migraciones NNN_*.sql pendientes y devuelve la versión resultante.
    Cada migración corre en una transacción con su `user_version`: si falla, no queda esquema parcial."""
    with _BLOQUEO:
        actual = conn.execute("PRAGMA user_version").fetchone()[0]
        for archivo in sorted(MIGRACIONES.glob("*.sql")):
            version = int(re.match(r"(\d+)_", archivo.name).group(1))
            if version > actual:
                try:  # executescript confirma lo pendiente y admite los ';' internos de los triggers
                    conn.executescript(f"BEGIN IMMEDIATE;\n{archivo.read_text()}\nPRAGMA user_version = {version};\nCOMMIT;")
                except Exception:
                    if conn.in_transaction:
                        conn.rollback()
                    raise
                actual = version
        return actual
