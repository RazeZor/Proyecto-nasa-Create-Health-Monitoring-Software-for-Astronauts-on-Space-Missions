"""CLI del datalake. Mensajes en español por defecto; VIGIA_LANG=en para inglés.

  python3 index.py ingest goes|donki|radlab|eda [clave=valor ...]
      eda: mision=RR-1 start=2014-09-21T00:00:00Z end=2014-09-22T00:00:00Z
      radlab: consulta cruda, ej. spacecraft=ISS "timestamp>=2024-05-10T00:00" absorbed_dose_rate
  python3 index.py read <fuente> [desde] [hasta]
  python3 index.py manifest
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "packages" / "i18n"))  # monorepo sin instalar

import datalake  # noqa: E402
from i18n import t  # noqa: E402

if __name__ == "__main__":
    cmd, *args = sys.argv[1:] or ["-h"]
    try:
        if cmd == "ingest" and args:
            if args[0] == "radlab":  # consulta cruda: claves sueltas y operadores
                params = "&".join(args[1:])
            else:
                params = dict(a.split("=", 1) for a in args[1:])
            salida = datalake.ingest(args[0], params or None)
        elif cmd == "read" and args:
            salida = datalake.read(*args[:3])
        elif cmd == "manifest":
            salida = datalake.manifest()
        else:
            sys.exit(t("cli.datalake.uso"))
    except (ValueError, OSError) as e:  # incluye ESTRUCTURA_INESPERADA y fallos de red
        sys.exit(t("cli.datalake.error", detalle=e))
    print(json.dumps(salida, indent=2, ensure_ascii=False))
