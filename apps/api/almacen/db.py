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
        # Validar todo el catálogo antes de tocar el esquema, incluso si la versión ya se aplicó.
        archivos = []
        versiones = set()
        for archivo in sorted(MIGRACIONES.glob("*.sql")):
            nombre = re.fullmatch(r"(\d+)_.+\.sql", archivo.name)
            if nombre is None:
                raise ValueError(f"nombre de migración inválido: {archivo.name}")
            version = int(nombre.group(1))
            if version in versiones:
                raise ValueError(f"versión de migración duplicada: {version}")
            versiones.add(version)
            archivos.append((version, archivo))
        actual = conn.execute("PRAGMA user_version").fetchone()[0]
        for version, archivo in sorted(archivos):
            if version > actual:
                try:  # executescript confirma lo pendiente y admite los ';' internos de los triggers
                    conn.executescript(f"BEGIN IMMEDIATE;\n{archivo.read_text(encoding='utf-8')}\nPRAGMA user_version = {version};\nCOMMIT;")
                except Exception:
                    if conn.in_transaction:
                        conn.rollback()
                    raise
                actual = version
        return actual
