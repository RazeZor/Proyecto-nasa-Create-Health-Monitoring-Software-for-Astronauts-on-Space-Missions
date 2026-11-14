"""ETL de reanclaje (informe §3.4): zona curated del datalake -> zona gold.

Cada ventana real continua se coloca en un día de la línea de tiempo de misión con un único
corrimiento (los valores no se escalan ni se suavizan), se agrega a una rejilla de 5 minutos y se
resume por día. Cada punto conserva su hora real (`t_real`) junto a la de misión (`t_mision`).

Salida: <DATALAKE_DIR>/gold/<escenario>.json y gold/manifest.json (SHA-256 por escenario).
Es determinista: el mismo escenario sobre el mismo curated da el mismo archivo.
"""
import hashlib
import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

# API pública de otro módulo: solo read(). shortcut: sin paquete instalable, se enlaza por ruta.
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "datalake"))
import datalake  # noqa: E402

FUENTES = {"goes", "donki", "radlab", "eda"}
BASE = datetime(2000, 1, 1, tzinfo=timezone.utc)  # origen sintético: 00:00 del día de misión 1
PASO = timedelta(minutes=5)
TASAS_DE_DOSIS = ("absorbed_dose_rate", "dose_equivalent_rate")  # µGy/h y µSv/h
FORMATO = "%Y-%m-%dT%H:%M:%SZ"


def _dt(s):
    return datetime.strptime(s, FORMATO).replace(tzinfo=timezone.utc)


def _mision(d):
    return f"D{(d - BASE).days + 1:03d}T{d:%H:%M:%S}"


def medidas(fuente, fila):
    """(serie, variable, valor) de una fila curada de una fuente con series temporales."""
    if fuente == "goes":
        yield f"G{fila['satellite']} {fila['energy']}", "flux", fila["flux"]
    elif fuente == "radlab":
        for v in TASAS_DE_DOSIS:
            if fila.get(v) is not None:
                yield fila["instrument_id"], v, fila[v]
    elif fuente == "eda":
        for v, x in fila.items():
            if v not in ("t_real", "mision") and isinstance(x, (int, float)):
                yield fila["mision"], v, x


def _agregar(variable, valores):
    # los picos son lo que importa en flujo y CO2; el resto, el promedio del paso
    return max(valores) if variable == "flux" or variable.startswith("co2") else sum(valores) / len(valores)


def corrimiento(ventana):
    """Un único corrimiento por ventana: `desde` cae en 00:00 del día de misión. Así las fuentes
    que comparten `desde` y día mantienen entre sí la relación real (informe §3.4, regla 5)."""
    return BASE + timedelta(days=ventana["dia_mision"] - 1) - _dt(ventana["desde"])


def rejilla(fuente, filas, corrimiento):
    """Series a 5 minutos sobre la hora de misión."""
    celdas = defaultdict(list)
    for f in filas:
        t_mision = _dt(f["t_real"]) + corrimiento
        paso = BASE + (t_mision - BASE) // PASO * PASO
        for serie, variable, valor in medidas(fuente, f):
            celdas[(serie, variable, paso)].append(valor)
    return [{"t_mision": _mision(paso), "t_real": (paso - corrimiento).strftime(FORMATO),
             "fuente": fuente, "serie": serie, "variable": variable,
             "valor": _agregar(variable, valores), "n": len(valores), "naturaleza": "Real"}
            for (serie, variable, paso), valores in sorted(celdas.items(), key=lambda c: (c[0][2], c[0][0], c[0][1]))]


def diario(puntos):
    """Resumen por día de misión: máximo, dosis del día (tasas de dosis) y máximo del promedio
    horario (CO2). `bins` dice cuántos pasos de 5 min hubo: con huecos la dosis queda por debajo."""
    grupos = defaultdict(list)
    for p in puntos:
        grupos[(p["fuente"], p["serie"], p["variable"], p["t_mision"][:4])].append(p)
    filas = []
    for (fuente, serie, variable, dia), ps in sorted(grupos.items()):
        fila = {"dia_mision": int(dia[1:]), "fuente": fuente, "serie": serie, "variable": variable,
                "max": max(p["valor"] for p in ps), "bins": len(ps)}
        if variable in TASAS_DE_DOSIS:
            fila["dosis"] = sum(p["valor"] for p in ps) * PASO.total_seconds() / 3600  # tasa/h x horas
        if variable.startswith("co2"):
            horas = defaultdict(list)
            for p in ps:
                horas[p["t_mision"][:7]].append(p["valor"])
            fila["max_prom_horario"] = max(sum(v) / len(v) for v in horas.values())
        filas.append(fila)
    return filas


def eventos(filas, corrimiento):
    return [{"t_mision": _mision(_dt(f["t_real"]) + corrimiento), "t_real": f["t_real"], "fuente": "donki",
             "sepID": f["sepID"], "instrumentos": f["instrumentos"], "actividades": f["actividades"],
             "link": f["link"], "naturaleza": "Real"} for f in filas]


def validar(escenario):
    if not escenario.get("nombre") or not escenario.get("ventanas"):
        raise ValueError("el escenario necesita `nombre` y `ventanas`")
    for v in escenario["ventanas"]:
        if v.get("fuente") not in FUENTES or not isinstance(v.get("dia_mision"), int) or v["dia_mision"] < 1:
            raise ValueError(f"ventana inválida (fuente y dia_mision >= 1): {v}")
        if _dt(v["desde"]) >= _dt(v["hasta"]):
            raise ValueError(f"`desde` debe ser anterior a `hasta`: {v}")


def construir(escenario):
    """Genera y guarda el gold del escenario. Si falta curated en una ventana no escribe nada."""
    validar(escenario)
    gold = {"escenario": escenario["nombre"], "ventanas": escenario["ventanas"],
            "serie5min": [], "diario": [], "eventos": []}
    for v in escenario["ventanas"]:
        filas = datalake.read(v["fuente"], v["desde"], v["hasta"])
        if not filas:
            raise ValueError(f"no hay datos curated de {v['fuente']} en la ventana {v['desde']}..{v['hasta']}")
        desp = corrimiento(v)
        if v["fuente"] == "donki":
            gold["eventos"] += eventos(filas, desp)
        else:
            gold["serie5min"] += rejilla(v["fuente"], filas, desp)
    gold["diario"] = diario(gold["serie5min"])
    entrada = guardar(escenario["nombre"], gold, serie5min=len(gold["serie5min"]),
                      diario=len(gold["diario"]), eventos=len(gold["eventos"]))
    return entrada


def guardar(clave, datos, destino=None, **resumen):
    """Escribe `datos` en gold/<clave>.json (o en `destino`) y lo registra con su SHA-256 en
    gold/manifest.json. Idempotente: una entrada por clave."""
    contenido = json.dumps(datos, indent=1, ensure_ascii=False).encode()
    carpeta = datalake.ROOT / "gold"
    carpeta.mkdir(parents=True, exist_ok=True)
    archivo = Path(destino) if destino else carpeta / f"{clave}.json"
    archivo.parent.mkdir(parents=True, exist_ok=True)
    archivo.write_bytes(contenido)
    entrada = {"sha256": hashlib.sha256(contenido).hexdigest(), **resumen,
               "generado": datetime.now(timezone.utc).strftime(FORMATO)}
    ruta = carpeta / "manifest.json"
    manifiesto = json.loads(ruta.read_text()) if ruta.exists() else {}
    manifiesto[clave] = entrada
    ruta.write_text(json.dumps(manifiesto, indent=2, ensure_ascii=False))
    return entrada
