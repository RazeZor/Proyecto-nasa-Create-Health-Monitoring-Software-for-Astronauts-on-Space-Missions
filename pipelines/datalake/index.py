"""CLI del datalake.

  python3 index.py ingest goes|donki|radlab|eda [clave=valor ...]
  python3 index.py read <fuente> [desde] [hasta]
  python3 index.py manifest
"""
import json
import sys

import datalake

USO = __doc__

if __name__ == "__main__":
    cmd, *args = sys.argv[1:] or ["-h"]
    try:
        if cmd == "ingest" and args:
            params = dict(a.split("=", 1) for a in args[1:])
            salida = datalake.ingest(args[0], params or None)
        elif cmd == "read" and args:
            salida = datalake.read(*args[:3])
        elif cmd == "manifest":
            salida = datalake.manifest()
        else:
            sys.exit(USO)
    except (ValueError, OSError) as e:  # incluye ESTRUCTURA_INESPERADA y fallos de red
        sys.exit(f"error: {e}")
    print(json.dumps(salida, indent=2, ensure_ascii=False))
