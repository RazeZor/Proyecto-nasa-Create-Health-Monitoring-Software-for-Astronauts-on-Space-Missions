"""Copias SQLite coherentes, con WAL y verificación, sin reemplazar ninguna base existente."""
import hashlib
import json
import os
import sqlite3
import uuid
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path


def verificar(ruta):
    with closing(sqlite3.connect(Path(ruta).resolve().as_uri() + "?mode=ro", uri=True)) as conn:
        integridad = conn.execute("PRAGMA integrity_check").fetchall()
        relaciones = conn.execute("PRAGMA foreign_key_check").fetchall()
        if integridad != [("ok",)] or relaciones:
            raise ValueError("base dañada o relaciones inválidas")
        tablas = [f[0] for f in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
        # Los nombres vienen del esquema, nunca se interpolan nombres de columnas del usuario.
        conteos = {t: conn.execute('SELECT COUNT(*) FROM "' + t.replace('"', '""') + '"').fetchone()[0] for t in tablas}
        return {"version": conn.execute("PRAGMA user_version").fetchone()[0], "filas": conteos}


def respaldar(origen, destino):
    origen, destino = Path(origen).resolve(), Path(destino).resolve()
    if origen == destino or destino.exists():
        raise ValueError("el destino debe ser una copia nueva; nunca se sobrescribe una base")
    verificar(origen)
    destino.parent.mkdir(parents=True, exist_ok=True)
    temporal = destino.with_name(destino.name + "." + uuid.uuid4().hex + ".tmp")
    try:
        with closing(sqlite3.connect(origen.as_uri() + "?mode=ro", uri=True)) as fuente, closing(sqlite3.connect(temporal)) as copia:
            fuente.backup(copia)
        estado = verificar(temporal)
        # Publicación exclusiva también si otro proceso creó el destino durante la copia.
        os.link(temporal, destino)
        resultado = {"t_real": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), **estado,
                     "sha256": hashlib.sha256(destino.read_bytes()).hexdigest()}
        with destino.with_suffix(destino.suffix + ".manifest.json").open("x", encoding="utf-8") as archivo:
            json.dump(resultado, archivo, ensure_ascii=False, indent=2)
        return resultado
    finally:
        temporal.unlink(missing_ok=True)


def restaurar_en_copia(origen, manifiesto, destino):
    esperado = json.loads(Path(manifiesto).read_text(encoding="utf-8"))
    if hashlib.sha256(Path(origen).read_bytes()).hexdigest() != esperado["sha256"]:
        raise ValueError("el respaldo no coincide con su hash")
    estado = verificar(origen)
    if estado["version"] != esperado["version"] or estado["filas"] != esperado["filas"]:
        raise ValueError("esquema o filas diferentes del manifiesto")
    return respaldar(origen, destino)
