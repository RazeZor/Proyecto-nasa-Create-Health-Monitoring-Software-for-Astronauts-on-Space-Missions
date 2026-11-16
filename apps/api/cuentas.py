"""Alta local de una cuenta; la contraseña solo se pide en una terminal privada."""
import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "packages" / "i18n"))

from almacen import conectar, migrar  # noqa: E402
from i18n import t  # noqa: E402
from seguridad import crear_cuenta  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=t("cli.cuentas.descripcion"))
    parser.add_argument("--usuario", required=True)
    parser.add_argument("--tripulante", type=int, required=True)
    parser.add_argument("--rol", choices=("astronaut", "cmo", "surgeon"), required=True)
    args = parser.parse_args()
    clave = getpass.getpass(t("cli.cuentas.clave"))
    if clave != getpass.getpass(t("cli.cuentas.repetir")):
        parser.error(t("cli.cuentas.diferentes"))
    conn = conectar()
    try:
        migrar(conn)
        crear_cuenta(conn, args.usuario, clave, args.tripulante, args.rol)
    finally:
        conn.close()
    print(t("cli.cuentas.creada"))


if __name__ == "__main__":
    main()
