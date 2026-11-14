"""CLI: python3 -m almacen migrar|sembrar (desde apps/api)."""
import json
import sys

from . import conectar, migrar, tripulacion

if __name__ == "__main__":
    comando = sys.argv[1] if len(sys.argv) > 1 else ""
    if comando not in ("migrar", "sembrar"):
        sys.exit("uso: python3 -m almacen migrar|sembrar")
    conn = conectar()
    version = migrar(conn)
    print(json.dumps({"version": version} if comando == "migrar" else tripulacion.sembrar_demo(conn)))
