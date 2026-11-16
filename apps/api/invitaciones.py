"""Emite invitaciones locales de un solo uso para una identidad ya provisionada."""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "packages" / "i18n"))

from almacen import conectar, migrar  # noqa: E402
from seguridad import crear_invitacion  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description="Emitir una invitación de alta ligada a una identidad VIGÍA")
    parser.add_argument("--tripulante", type=int, required=True)
    parser.add_argument("--rol", choices=("astronaut", "cmo", "surgeon"), required=True)
    parser.add_argument("--horas", type=int, default=72, choices=range(1, 169))
    args = parser.parse_args()
    conn = conectar()
    try:
        migrar(conn)
        sujeto = conn.execute("SELECT rol FROM tripulante WHERE id = ?", (args.tripulante,)).fetchone()
        existente = conn.execute("SELECT 1 FROM identidad_cuenta WHERE tripulante_id = ? LIMIT 1", (args.tripulante,)).fetchone()
        if not sujeto or existente:
            parser.error("la identidad no existe o ya tiene una cuenta")
        if (args.rol in ("cmo", "surgeon") and sujeto["rol"] != "oficial_medico") or (args.rol == "astronaut" and sujeto["rol"] == "oficial_medico"):
            parser.error("el rol no corresponde a la identidad")
        print(crear_invitacion(args.tripulante, args.rol, args.horas))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
