"""MMASH: originales verificados y referencia fisiológica; sin fechas UTC de toma inventadas."""
import csv
import hashlib
import io
import json
import math
import os
import re
import statistics
import sys
import urllib.request
import zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

CARPETA = Path(__file__).resolve().parent
RAIZ = CARPETA.parents[1]
BASE = "https://physionet.org/files/mmash/1.0.0/"
PAGINA = "https://physionet.org/content/mmash/1.0.0/"
HASHES = {
    "MMASH.zip": "ef91ee1b36b5849a6366b1918de82686ab278915d33c7f62133f07f741f70726",
    "LICENSE.txt": "bcdfcd4f31c790e30fb645dc36414907172405897adff329ad379eed85d12017",
}
MAX_BYTES = 40_000_000
MAX_DESCOMPRIMIDO = 200_000_000
RR_COLUMNAS = {"ibi_s", "day", "time"}
SUENO_COLUMNAS = {"Out Bed Date", "Out Bed Time", "Total Sleep Time (TST)"}
sys.path.insert(0, str(RAIZ / "packages/schemas"))
from validador import validar  # noqa: E402


class EstructuraInesperada(ValueError):
    """Estructura incompatible: no publicar datos parciales."""


def sha256(contenido):
    return hashlib.sha256(contenido).hexdigest()


def _numero(valor):
    if valor is None or valor.strip().lower() in {"", "na", "nan", "n/a"}:
        return None
    numero = float(valor)
    return numero if math.isfinite(numero) else None


def _tiempo(dia, hora):
    """Segundos relativos al primer día del estudio; no es una hora UTC."""
    try:
        d = int(dia)
        partes = hora.split(":")
        if len(partes) not in (2, 3):
            return None
        h, m = map(int, partes[:2])
        s = float(partes[2]) if len(partes) == 3 else 0
        if d < 1 or not (0 <= h < 24 and 0 <= m < 60 and 0 <= s < 60):
            return None
        return (d - 1) * 86400 + h * 3600 + m * 60 + s
    except (TypeError, ValueError, AttributeError):
        return None


def _filas(archivo, nombre, requeridas):
    with io.TextIOWrapper(archivo.open(nombre), encoding="utf-8-sig") as contenido:
        lector = csv.DictReader(contenido)
        if not requeridas <= set(lector.fieldnames or []):
            raise EstructuraInesperada(f"columnas incompatibles en {nombre}")
        yield from lector


def normalizar(contenido):
    """Normalizar RR/sueño sin extraer rutas ni convertir los tiempos relativos en calendario."""
    sujetos, inventario = [], []
    with zipfile.ZipFile(io.BytesIO(contenido)) as archivo:
        entradas = archivo.infolist()
        nombres = [e.filename for e in entradas]
        if len(nombres) != len(set(nombres)) or sum(e.file_size for e in entradas) > MAX_DESCOMPRIMIDO:
            raise EstructuraInesperada("ZIP duplicado o superior al límite descomprimido")
        for e in entradas:
            ruta = PurePosixPath(e.filename)
            if ruta.is_absolute() or ".." in ruta.parts or "\\" in e.filename or e.flag_bits & 1:
                raise EstructuraInesperada("ruta o cifrado no admitido en ZIP")
            if not e.is_dir():
                inventario.append({"archivo": e.filename, "bytes": e.file_size})
        carpetas = sorted({n.rsplit("/", 1)[0] for n in nombres if re.fullmatch(r"DataPaper/user_\d+/RR\.csv", n)},
                          key=lambda n: int(n.rsplit("_", 1)[-1]))
        if not carpetas:
            raise EstructuraInesperada("no se encontraron sujetos RR")
        for carpeta in carpetas:
            if f"{carpeta}/sleep.csv" not in nombres:
                raise EstructuraInesperada(f"falta sleep.csv para {carpeta}")
            grupos = defaultdict(list)
            dias_no_comparables = defaultdict(int)
            total, invalidos, invalidos_tiempo = 0, 0, 0
            for fila in _filas(archivo, f"{carpeta}/RR.csv", RR_COLUMNAS):
                total += 1
                ibi = _numero(fila["ibi_s"])
                tiempo = _tiempo(fila["day"], fila["time"])
                if ibi is None or ibi <= 0 or not math.isfinite(60 / ibi):
                    invalidos += 1
                    continue
                if tiempo is None:
                    invalidos_tiempo += 1
                    dias_no_comparables[str(fila["day"])] += 1
                    continue
                grupos[int(tiempo // 300)].append(ibi)
            serie = [{"segundos_relativos": paso * 300, "intervalos": len(valores),
                      "ibi_mediana_s": statistics.median(valores),
                      "fc_derivada_mediana_lpm": statistics.median(60 / v for v in valores), "t_real": None}
                     for paso, valores in sorted(grupos.items())]
            sueno = []
            for indice, fila in enumerate(_filas(archivo, f"{carpeta}/sleep.csv", SUENO_COLUMNAS)):
                minutos = _numero(fila["Total Sleep Time (TST)"])
                if minutos is not None and minutos < 0:
                    raise EstructuraInesperada("TST negativo")
                sueno.append({"periodo": indice + 1, "dia_fin_original": fila["Out Bed Date"],
                              "hora_fin_original": fila["Out Bed Time"],
                              "fin_segundos_relativos": _tiempo(fila["Out Bed Date"], fila["Out Bed Time"]),
                              "tst_min_original": minutos, "sueno_h": minutos / 60 if minutos is not None else None,
                              "t_real": None})
            sujetos.append({"id": carpeta.split("/")[-1], "intervalos_originales": total,
                            "intervalos_utilizados": sum(len(v) for v in grupos.values()),
                            "intervalos_no_positivos_o_ausentes": invalidos, "intervalos_tiempo_no_interpretable": invalidos_tiempo,
                            "dias_con_tiempo_no_interpretable": dict(dias_no_comparables),
                            "serie_5min": serie, "periodos_sueno": sueno})
    return {"sujetos": sujetos, "inventario_archivo": inventario}


def verificar_archivos(archivos):
    """Verificar sumas del proveedor y fijación de la versión antes de escribir raw/curated/gold."""
    sumas = {}
    for linea in archivos["SHA256SUMS.txt"].decode("utf-8-sig").splitlines():
        if linea.strip():
            resumen, nombre = linea.split(maxsplit=1)
            sumas[nombre.lstrip("*")] = resumen.lower()
    for nombre, esperado in HASHES.items():
        if sumas.get(nombre) != esperado or sha256(archivos[nombre]) != esperado:
            raise EstructuraInesperada(f"SHA-256 no coincide para {nombre}")
    return sumas


def _obtener(desde):
    salida = {}
    for nombre in ("SHA256SUMS.txt", "LICENSE.txt", "MMASH.zip"):
        if desde is not None:
            ruta = Path(desde) / nombre
            if ruta.stat().st_size > MAX_BYTES:
                raise EstructuraInesperada("archivo superior al límite")
            salida[nombre] = ruta.read_bytes()
        else:
            solicitud = urllib.request.Request(BASE + nombre, headers={"User-Agent": "VIGIA-biometria/1.0"})
            with urllib.request.urlopen(solicitud, timeout=60) as respuesta:
                salida[nombre] = respuesta.read(MAX_BYTES + 1)
            if len(salida[nombre]) > MAX_BYTES:
                raise EstructuraInesperada("descarga superior al límite")
    return salida


def _json_bytes(valor):
    return (json.dumps(valor, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n").encode()


def _atomico(ruta, contenido):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    temporal = ruta.with_suffix(ruta.suffix + ".tmp")
    temporal.write_bytes(contenido)
    temporal.replace(ruta)


def importar_mmash(desde=None, raiz=None, gold=None):
    """Descargar/verificar, normalizar y publicar referencia; solo un escritor por manifiesto."""
    raiz = Path(raiz or CARPETA / "data")
    gold = Path(gold or Path(os.environ.get("DATALAKE_DIR") or RAIZ / "pipelines/datalake/data") / "gold")
    archivos = _obtener(desde)
    verificar_archivos(archivos)
    procesador_sha = sha256(Path(__file__).read_bytes())
    esquema_bytes = (RAIZ / "packages/schemas/mmash-gold.schema.json").read_bytes()
    esquema_sha = sha256(esquema_bytes)
    ruta_manifiesto = raiz / "manifest.json"
    manifiesto = json.loads(ruta_manifiesto.read_text(encoding="utf-8")) if ruta_manifiesto.exists() else {}
    anterior = manifiesto.get("mmash", {})
    publicado = gold / "dataset-mmash.json"
    manifiesto_gold = gold / "manifest.json"
    catalogo = json.loads(manifiesto_gold.read_text(encoding="utf-8")) if manifiesto_gold.exists() else {}
    for nombre, contenido in archivos.items():
        existente = raiz / "raw/mmash-1.0.0" / (sha256(contenido)[:16] + "-" + nombre)
        if existente.exists() and sha256(existente.read_bytes()) != sha256(contenido):
            raise EstructuraInesperada("raw existente alterado; se conserva sin sobrescribir")
    originales_presentes = len(anterior.get("archivos", [])) == 3 and all((raiz / a["raw"]).is_file() for a in anterior.get("archivos", []))
    curado = raiz / anterior.get("curated", "archivo-inexistente")
    if (anterior.get("archivo_sha256") == HASHES["MMASH.zip"] and anterior.get("procesador_sha256") == procesador_sha
            and anterior.get("esquema_sha256") == esquema_sha
            and originales_presentes and curado.is_file() and sha256(curado.read_bytes()) == anterior.get("curated_sha256")
            and publicado.is_file() and sha256(publicado.read_bytes()) == catalogo.get("dataset-mmash", {}).get("sha256")):
        return json.loads(publicado.read_text(encoding="utf-8"))["resumen"]
    limpio = normalizar(archivos["MMASH.zip"])
    ahora = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    origenes = []
    for nombre, contenido in archivos.items():
        relativo = Path("raw/mmash-1.0.0") / (sha256(contenido)[:16] + "-" + nombre)
        destino = raiz / relativo
        destino.parent.mkdir(parents=True, exist_ok=True)
        try:
            with destino.open("xb") as archivo:
                archivo.write(contenido)
        except FileExistsError:
            if sha256(destino.read_bytes()) != sha256(contenido):
                raise EstructuraInesperada("raw existente alterado; se conserva sin sobrescribir") from None
        origenes.append({"url": BASE + nombre, "raw": relativo.as_posix(), "bytes": len(contenido), "sha256": sha256(contenido)})
    resumen = {"sujetos": len(limpio["sujetos"]),
               "intervalos_originales": sum(s["intervalos_originales"] for s in limpio["sujetos"]),
               "intervalos_utilizados": sum(s["intervalos_utilizados"] for s in limpio["sujetos"]),
               "puntos_5min": sum(len(s["serie_5min"]) for s in limpio["sujetos"]),
               "periodos_sueno": sum(len(s["periodos_sueno"]) for s in limpio["sujetos"])}
    producto = {"version": "dataset-fisiologico-v1", "id": "mmash", "nombre": "MMASH", "version_fuente": "1.0.0",
                "importado_t_real": ahora, "t_real_observacion": None, "naturaleza": "Real", "uso": "referencia",
                "dominio": "humano_terrestre", "duracion_nominal_h": 24, "fecha_observacion_conocida": False,
                "licencia": "ODbL-1.0", "fuente": PAGINA, "doi": "10.13026/cerq-fc86",
                "procesador_sha256": procesador_sha, "esquema_sha256": esquema_sha, "archivos": origenes, "resumen": resumen, **limpio,
                "campos_normalizados": ["ibi_s", "day", "time", "Out Bed Date", "Out Bed Time", "Total Sleep Time (TST)"],
                "evaluacion_motor": False, "validacion_clinica": False,
                "limitaciones": ["referencia_24h_no_deriva_semanas", "tiempo_relativo_sin_utc",
                                 "fc_derivada_no_fc_reposo", "sin_filtro_clinico_artefactos", "sin_conversion_panas_a_animo"]}
    errores = validar(producto, json.loads(esquema_bytes))
    if errores:
        raise EstructuraInesperada("; ".join(errores[:3]))
    contenido = _json_bytes(producto)
    ruta_curated = raiz / "curated/mmash-1.0.0" / (HASHES["MMASH.zip"][:16] + ".json")
    _atomico(ruta_curated, contenido)
    _atomico(publicado, contenido)
    catalogo["dataset-mmash"] = {"tipo": "dataset_fisiologico", "sha256": sha256(contenido), "generado": ahora,
                                 "sujetos": resumen["sujetos"], "fuente": PAGINA}
    _atomico(manifiesto_gold, _json_bytes(catalogo))
    manifiesto["mmash"] = {"importado_t_real": ahora, "archivo_sha256": HASHES["MMASH.zip"],
                           "procesador_sha256": procesador_sha, "esquema_sha256": esquema_sha,
                           "curated": ruta_curated.relative_to(raiz).as_posix(),
                           "curated_sha256": sha256(contenido), "archivos": origenes, "resumen": resumen}
    _atomico(ruta_manifiesto, _json_bytes(manifiesto))
    return resumen
