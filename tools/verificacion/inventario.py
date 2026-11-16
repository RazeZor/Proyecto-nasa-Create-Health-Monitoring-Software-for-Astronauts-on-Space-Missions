"""Auditar datalake y SQLite sin mostrar datos personales; --migrar crea respaldo antes de actualizar SQLite."""
import argparse
import hashlib
import json
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


def hash_archivo(raiz, relativa):
    archivo = (raiz / relativa).resolve()
    if not archivo.is_relative_to(raiz.resolve()):
        raise ValueError("ruta de manifiesto fuera del datalake")
    return hashlib.sha256(archivo.read_bytes()).hexdigest()


def inventariar(datos, db):
    manifiesto = json.loads((datos / "manifest.json").read_text(encoding="utf-8")) if (datos / "manifest.json").exists() else []
    ruta_gold = datos / "gold/manifest.json"
    gold = json.loads(ruta_gold.read_text(encoding="utf-8")) if ruta_gold.exists() else {}
    raw_correctos = all(hash_archivo(datos, e["raw"]) == e["sha256"] for e in manifiesto)
    gold_correctos = all(hash_archivo(datos / "gold", f"{nombre}.json") == e["sha256"] for nombre, e in gold.items())
    fuentes = {}
    for fuente in ("goes", "donki", "radlab", "eda"):
        filas = set()
        fechas = []
        archivos = list((datos / "curated" / fuente).glob("*/*.json"))
        for archivo in archivos:
            for fila in json.loads(archivo.read_text(encoding="utf-8")):
                filas.add(json.dumps(fila, sort_keys=True))
                if fila.get("t_real"):
                    fechas.append(fila["t_real"])
        fuentes[fuente] = {"archivos": len(archivos), "filas_unicas": len(filas),
                           "desde": min(fechas, default=None), "hasta": max(fechas, default=None)}
    base = {"existe": db.is_file()}
    if db.is_file():
        conn = sqlite3.connect(db.resolve().as_uri() + "?mode=ro", uri=True)
        try:
            tablas = {f[0] for f in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            base.update(version=conn.execute("PRAGMA user_version").fetchone()[0],
                        integridad=conn.execute("PRAGMA quick_check").fetchone()[0],
                        reloj_vinculo="reloj_vinculo" in tablas, cuentas_experimentales="cuenta" in tablas)
        finally:
            conn.close()
    fixture = RAIZ / "packages/engine/fixtures/kpi.json"
    kpi = datos / "gold/kpi.json"
    return {"t_real": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "fuentes": fuentes,
            "raw": {"entradas": len(manifiesto), "hashes_correctos": raw_correctos},
            "gold": {"productos": sorted(gold), "hashes_correctos": gold_correctos}, "sqlite": base,
            "kpi_sha_fixture": hashlib.sha256(fixture.read_bytes()).hexdigest(),
            "kpi_sha_gold": hashlib.sha256(kpi.read_bytes()).hexdigest() if kpi.exists() else None}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--datos", type=Path, default=Path(os.environ.get("DATALAKE_DIR") or RAIZ / "pipelines/datalake/data"))
    parser.add_argument("--db", type=Path, default=Path(os.environ.get("VIGIA_DB") or RAIZ / "apps/api/data/vigia.db"))
    parser.add_argument("--migrar", action="store_true")
    args = parser.parse_args()
    carpeta = Path(__file__).resolve().parent / "data" / ("inventario-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"))
    carpeta.mkdir(parents=True, exist_ok=False)
    resultado = inventariar(args.datos, args.db)
    (carpeta / "antes.json").write_text(json.dumps(resultado, indent=2, ensure_ascii=False), encoding="utf-8")
    if args.migrar:
        if not resultado["sqlite"]["existe"] or resultado["sqlite"]["integridad"] != "ok":
            parser.error("se requiere una base existente e íntegra para respaldar y migrar")
        original = sqlite3.connect(args.db.resolve().as_uri() + "?mode=ro", uri=True)
        respaldo = sqlite3.connect(carpeta / "respaldo.db")
        try:
            original.backup(respaldo)
        finally:
            respaldo.close()
            original.close()
        subprocess.run([sys.executable, "-m", "almacen", "migrar"], cwd=RAIZ / "apps/api",
                       env={**os.environ, "VIGIA_DB": str(args.db.resolve())}, check=True)
        resultado = inventariar(args.datos, args.db)
    (carpeta / "resultado.json").write_text(json.dumps(resultado, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(resultado, indent=2, ensure_ascii=True))
    print(carpeta)
    return int(not resultado["raw"]["hashes_correctos"] or not resultado["gold"]["hashes_correctos"])


if __name__ == "__main__":
    sys.exit(main())
