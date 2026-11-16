"""CLI de importación fisiológica. El idioma se resuelve con el catálogo compartido."""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "packages/i18n"))

from mmash import importar_mmash  # noqa: E402

from i18n import t  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=t("cli.biometria.descripcion"))
    parser.add_argument("fuente", choices=["mmash"])
    parser.add_argument("--desde", type=Path, help=t("cli.biometria.desde"))
    args = parser.parse_args()
    try:
        print(json.dumps(importar_mmash(args.desde), ensure_ascii=False, indent=2))
    except (OSError, ValueError) as error:
        parser.exit(1, t("cli.biometria.error", detalle=str(error)) + "\n")


if __name__ == "__main__":
    main()
