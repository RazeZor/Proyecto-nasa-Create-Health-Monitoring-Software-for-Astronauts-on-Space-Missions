"""Vocabulario compartido con la interfaz: lee el contrato packages/schemas/vocabulario.json."""
import json
from pathlib import Path

_RUTA = Path(__file__).resolve().parents[3] / "packages" / "schemas" / "vocabulario.json"
VOCABULARIO = json.loads(_RUTA.read_text(encoding="utf-8"))
SINTOMAS = frozenset(VOCABULARIO["sintomas"].values())
