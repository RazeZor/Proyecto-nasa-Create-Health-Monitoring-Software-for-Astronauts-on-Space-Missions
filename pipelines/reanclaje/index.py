"""CLI del ETL de reanclaje.

  python3 index.py build <escenario.json>   curated -> gold (ver escenarios/ejemplo.json)
  python3 index.py panel <escenario.json> [destino.json]   gold -> panel de entorno para la app
  python3 index.py simular [n_misiones]     genera caso_referencia.json y kpi.json en gold/
  python3 index.py manifest                 SHA-256 y tamaños de cada escenario generado
"""
import json
import sys

import panel
import simulacion

import reanclaje
from reanclaje import datalake

if __name__ == "__main__":
    cmd, *args = sys.argv[1:] or ["-h"]
    try:
        if cmd == "build" and args:
            with open(args[0], encoding="utf-8") as f:
                salida = reanclaje.construir(json.load(f))
        elif cmd == "panel" and args:
            with open(args[0], encoding="utf-8") as f:
                salida = panel.publicar(json.load(f), *args[1:2])
        elif cmd == "simular":
            n = int(args[0]) if args else 500
            salida = simulacion.publicar_simulacion(n_misiones=n)
        elif cmd == "manifest":
            ruta = datalake.ROOT / "gold" / "manifest.json"
            salida = json.loads(ruta.read_text()) if ruta.exists() else {}
        else:
            sys.exit(__doc__)
    except (ValueError, OSError, KeyError) as e:
        sys.exit(f"error: {e}")
    print(json.dumps(salida, indent=2, ensure_ascii=False))
