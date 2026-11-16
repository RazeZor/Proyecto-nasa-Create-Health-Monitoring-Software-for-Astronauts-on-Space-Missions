"""Afirmaciones trazables y auditoría exploratoria; no acredita validación clínica."""
import hashlib
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from gold import leer_verificado, manifiesto

RAIZ = Path(__file__).resolve().parents[2]
ARCHIVOS = (
    "packages/engine/engine.ts", "packages/engine/evidencia.ts", "tools/validacion/generador.ts",
    "tools/validacion/metricas.ts", "tools/validacion/banco.ts", "tools/validacion/ejecutar.ts",
    "tools/validacion/protocolo.json",
)
router = APIRouter(tags=["ciencia"])


def verificar_vigencia(informe):
    """Comparar todos los componentes del banco con el código local; las rutas no proceden del JSON."""
    try:
        if informe["version"] != "evidencia-v1" or informe["conclusion"] != "exploratoria_sin_validacion_clinica":
            raise ValueError("versión no soportada")
        congelacion = informe["congelacion"]
        if congelacion["datos_humanos"] is not False or congelacion["conjunto_independiente"] is not False:
            raise ValueError("naturaleza incompatible")
        hashes = {**congelacion["archivos"], "tools/validacion/protocolo.json": congelacion["protocolo_sha256"]}
        # Un componente ausente no se interpreta como coincidencia.
        if any(not isinstance(hashes.get(a), str) or len(hashes[a]) != 64 for a in ARCHIVOS):
            raise ValueError("hashes incompletos")
        return "vigente" if all((RAIZ / a).is_file() and hashlib.sha256((RAIZ / a).read_bytes()).hexdigest() == hashes[a]
                                for a in ARCHIVOS) else "desactualizado"
    except (KeyError, TypeError, ValueError) as error:
        raise HTTPException(500, "evidencia_incompatible") from error


@router.get("/ciencia/evidencia", summary="Estado de las afirmaciones científicas y auditoría del motor")
def evidencia():
    """Catálogo trazable y reporte sintético verificado por SHA-256. Sin reporte: `no_publicado`, sin métricas.
    `desactualizado` conserva el resultado histórico y prohíbe presentarlo como evaluación del código actual.
    Una alteración o naturaleza incompatible falla con 500; nunca se reemplaza por ceros ni por KPI antiguos."""
    catalogo = json.loads((RAIZ / "packages/schemas/evidencia-cientifica.json").read_text(encoding="utf-8"))
    if "validacion" not in manifiesto():
        return {"catalogo": catalogo, "estado": "no_publicado", "informe": None}
    informe = leer_verificado("validacion", lambda entrada: entrada.get("tipo") == "auditoria_sintetica")
    return {"catalogo": catalogo, "estado": verificar_vigencia(informe), "informe": informe}


@router.get("/ciencia/datasets/{id}", summary="Dataset de referencia publicado y verificado")
def dataset_cientifico(id: str):
    """Solo MMASH y el piloto Orion conocidos. Devuelve el producto completo con su procedencia.
    MMASH conserva tiempos relativos sin UTC de toma; Orion es radiación ambiental histórica.
    No mezcla sujetos de referencia con cuentas actuales ni ejecuta evaluación clínica."""
    if id == "mmash":
        datos = leer_verificado("dataset-mmash", lambda e: e.get("tipo") == "dataset_fisiologico")
        if (datos.get("version") != "dataset-fisiologico-v1" or datos.get("id") != "mmash"
                or datos.get("uso") != "referencia" or datos.get("validacion_clinica") is not False):
            raise HTTPException(500, "dataset_incompatible")
        return datos
    if id == "orion":
        return leer_verificado("orion-artemis-i-piloto", lambda e: "serie5min" in e)
    raise HTTPException(404, "dataset_desconocido")


@router.get("/ciencia/datasets", summary="Datasets de referencia realmente disponibles")
def datasets_cientificos():
    """Catálogo de productos presentes en gold con SHA-256 comprobado. Ausentes: lista vacía, sin números ficticios.
    Los fallos de integridad se propagan; una copia corrupta no se presenta como dataset adquirido correctamente."""
    entradas = manifiesto()
    datasets = []
    if "dataset-mmash" in entradas:
        datos = dataset_cientifico("mmash")
        resumen = datos["resumen"]
        datasets.append({"id": "mmash", "nombre": "MMASH", "tipo": "fisiologia_terrestre", "uso": "referencia",
                         "version": datos["version_fuente"], "fuente": datos["fuente"], "licencia": datos["licencia"],
                         "sha256": entradas["dataset-mmash"]["sha256"], "sujetos": resumen["sujetos"],
                         "registros": resumen["intervalos_originales"], "registros_utilizados": resumen["intervalos_utilizados"],
                         "puntos_5min": resumen["puntos_5min"], "periodos_sueno": resumen["periodos_sueno"],
                         "t_real_observacion": None, "evaluacion_motor": False})
    if "orion-artemis-i-piloto" in entradas:
        datos = dataset_cientifico("orion")
        puntos = datos["serie5min"]
        ventanas = datos["ventanas"]
        datasets.append({"id": "orion", "nombre": "Artemis I / Orion", "tipo": "radiacion_ambiental", "uso": "referencia",
                         "version": "piloto-2022-11-17", "fuente": "https://visualization.osdr.nasa.gov/radlab/gui/data-api/",
                         "sha256": entradas["orion-artemis-i-piloto"]["sha256"], "detectores": len({p["serie"] for p in puntos}),
                         "registros": sum(p["n"] for p in puntos), "puntos_5min": len(puntos),
                         "desde": ventanas[0]["desde"], "hasta": ventanas[0]["hasta"], "evaluacion_motor": False})
    return {"version": "catalogo-datasets-v1", "datasets": datasets}
