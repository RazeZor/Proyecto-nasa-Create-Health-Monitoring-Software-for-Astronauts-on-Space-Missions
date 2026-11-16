"""CLI del ETL de reanclaje.

  python3 index.py build <escenario.json>   curated -> gold (ver escenarios/ejemplo.json)
  python3 index.py panel <escenario.json> [destino.json]   gold -> panel de entorno para la app
  python3 index.py simular [n_misiones]     genera caso_referencia.json y kpi.json en gold/
  python3 index.py viaje                    regenera packages/engine/fixtures/caso-viaje.json (viaje a Marte)
  python3 index.py barrer [n_misiones]      barrido de k y h del CUSUM en gold/barrido.json
  python3 index.py manifest                 SHA-256 y tamaños de cada escenario generado
  python3 index.py preparar                 reproduce KPI y publica ambos paneles con el curated disponible
"""
import json
import sys
from pathlib import Path

import panel
import preparar
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
        elif cmd == "viaje":
            salida = simulacion.publicar_caso_viaje(Path(__file__).resolve().parents[2] / "packages" / "engine" / "fixtures" / "caso-viaje.json")
        elif cmd == "preparar":
            salida = preparar.preparar_local()
        elif cmd == "barrer":
            salida = simulacion.publicar_barrido(n_misiones=int(args[0]) if args else 200)
        elif cmd == "manifest":
            ruta = datalake.ROOT / "gold" / "manifest.json"
            salida = json.loads(ruta.read_text()) if ruta.exists() else {}
        else:
            sys.exit(__doc__)
    except (ValueError, OSError, KeyError) as e:
        sys.exit(f"error: {e}")
    print(json.dumps(salida, indent=2, ensure_ascii=False))
