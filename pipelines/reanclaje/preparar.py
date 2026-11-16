"""Preparar los paneles y el KPI del despliegue desde curated y las fixtures versionadas."""
import hashlib
import json
from pathlib import Path

import panel
import simulacion

import reanclaje

RAIZ = Path(__file__).resolve().parents[2]


def preparar_local():
    """Reproduce el KPI antes de publicarlo; no ajusta reglas ni sobrescribe raw o las fixtures."""
    ruta = RAIZ / "packages/engine/fixtures/kpi.json"
    fixture = json.loads(ruta.read_text(encoding="utf-8"))
    _, reproducido = simulacion.ejecutar_simulacion(n_misiones=fixture["n_misiones_anomalia"], semilla=fixture["semilla_principal"])
    sin_fecha = lambda resultado: {k: v for k, v in resultado.items() if k != "generado"}  # noqa: E731
    if sin_fecha(fixture) != sin_fecha(reproducido):
        raise ValueError("el KPI vigente no reproduce la fixture: revisar reglas y resultados antes de publicar")
    resultado = {}
    for nombre in ("mision-real", "mision-vigia"):
        escenario = json.loads((Path(__file__).parent / "escenarios" / f"{nombre}.json").read_text(encoding="utf-8"))
        resultado[nombre] = panel.publicar(escenario)
    resultado["kpi"] = reanclaje.guardar("kpi", fixture, contenido_original=ruta.read_bytes(), tipo="simulacion", semilla=fixture["semilla_principal"],
                                        misiones=fixture["n_misiones_anomalia"])
    resultado["kpi_fixture_sha256"] = hashlib.sha256(ruta.read_bytes()).hexdigest()
    return resultado
