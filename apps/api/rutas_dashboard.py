"""Lo que el tablero necesita además del gold y del registro: fichas, referencia de entorno y, por tripulante,
historial, recordatorios y mensajes. La app no guarda datos de ejemplo: los que aún no salen de una fuente real
viven aquí (apps/api/demo/ y el caso de referencia del simulador) y se rotulan `Simulado`.
"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal

import gold
from fastapi import APIRouter, Depends, HTTPException

from almacen import cola, lecturas, tripulacion
from i18n import t
from rutas_registro import ERRORES, actor, conexion, propio

router = APIRouter(tags=["tablero"])
_RAIZ = Path(__file__).resolve().parents[2]
_FICHAS = _RAIZ / "packages" / "schemas" / "fichas"
_FICHAS_EN = _RAIZ / "packages" / "schemas" / "fichas_en"
_CASO = _RAIZ / "packages" / "engine" / "fixtures" / "caso-referencia.json"
_DEMO = Path(__file__).resolve().parent / "demo"
DIA_ACTUAL_DEMO = 27  # día de misión fijo del modo demo: el último de la deriva A1, con sus alertas ya visibles
DIAS_VUELO_MINIMO = 30  # eje de las gráficas en modo real mientras la misión es más corta
ESCENARIO_ENTORNO = {"real": "mision-real", "demo": "mision-vigia"}  # paneles gold de pipelines/reanclaje/escenarios
CO2_LIMITE_MMHG = 3.0
PROTONES_TORMENTA_PFU = 10.0
CAMPO_DE_INDICADOR = {
    "frecuencia_cardiaca_reposo": "fc_reposo_lpm", "presion_arterial_sistolica": "pas_mmHg",
    "presion_arterial_diastolica": "pad_mmHg", "spo2": "spo2_pct", "temperatura_central": "temp_central_c",
    "sueno": "sueno_h", "estado_animo": "animo_1_10", "glucosa": "glucosa_mg_dl", "masa_corporal": "masa_kg",
}


def _json(ruta):
    return json.loads(ruta.read_text(encoding="utf-8"))


def _ids_fichas():
    return _json(_FICHAS / "index.json")


def _ficha(id, lang):
    """La ficha en español o, con `lang=en`, con los textos de `packages/schemas/fichas_en` encima (si existen:
    el inglés es secundario y una ficha sin traducir se sirve en español)."""
    ficha = _json(_FICHAS / f"{id}.json")
    traduccion = _FICHAS_EN / f"{id}.json"
    if lang != "en" or not traduccion.exists():
        return ficha
    en = _json(traduccion)
    titulos = en.pop("fuentes", [])
    ficha.update({k: v for k, v in en.items() if k in ficha})
    for fuente, titulo in zip(ficha["fuentes"], titulos, strict=False):
        fuente["titulo"] = titulo
    return ficha


@router.get("/fichas", summary="Fichas de los indicadores")
def listar_fichas(lang: Literal["es", "en"] = "es"):
    """Todas las fichas validadas (`packages/schemas/fichas`, esquema `ficha.schema.json`), en el orden del índice.
    `lang=en` devuelve los textos en inglés donde hay traducción."""
    return [_ficha(i, lang) for i in _ids_fichas()]


@router.get("/fichas/{id}", responses={404: {"description": "No hay ficha con ese id."}}, summary="Una ficha")
def leer_ficha(id: str, lang: Literal["es", "en"] = "es"):
    """Una ficha (`que_es`, `como_se_mide_en_vuelo` por perfil, `por_que`, `cuando_avisar`, `fuentes`...).
    `lang=en` la devuelve en inglés si hay traducción."""
    if id not in _ids_fichas():  # el id sale del índice: no hay rutas arbitrarias
        raise HTTPException(404, t("api.error.gold_no_existe", nombre=id))
    return _ficha(id, lang)


@router.get("/entorno/referencia", summary="Límites, fuentes y dosis previa de carrera")
def referencia_entorno():
    """Límites de radiación y CO2, umbral de tormenta y fuentes del panel. `dosis_previa_carrera_msv` es simulada."""
    return _json(_DEMO / "entorno_referencia.json")


def _fecha_real(ventanas, fuente, dia):
    """Fecha real (UTC) del dato de `fuente` que el escenario colocó en el día de misión `dia`."""
    for v in ventanas:
        if v["fuente"] == fuente:
            desde = datetime.strptime(v["desde"], tripulacion.FORMATO)
            return (desde + timedelta(days=dia - v["dia_mision"])).strftime("%Y-%m-%d")
    return None


def _entorno_real(panel):
    """Entorno medido por día de misión, del panel gold: CO2 de cabina en ppm (EDA), flujo de protones de
    >=10 MeV (GOES) y eventos SEP (DONKI). Cada dato lleva su fuente y su fecha real (§3.4, doble marca)."""
    dias = {}

    def dia(d):
        return dias.setdefault(d, {"dia_mision": d, "co2_ppm_max_horario": None, "co2_mmhg_max_horario": None,
                                   "co2_origen": None, "flujo_protones_10mev_pfu": None, "flujo_origen": None,
                                   "eventos_sep": [], "modo_tormenta": False})

    ventanas = panel["ventanas"]
    for c in panel["cabina"]:
        if c.get("co2_ppm_promedio_horario_max") is not None:
            e = dia(c["dia_mision"])
            e["co2_ppm_max_horario"] = c["co2_ppm_promedio_horario_max"]
            e["co2_origen"] = {"naturaleza": "Real", "fuente": f"EDA {c['mision']} (NASA OSDR)",
                               "fecha_real": _fecha_real(ventanas, "eda", c["dia_mision"])}
    for p in panel["protones"]:
        if p["serie"].endswith(">=10 MeV"):
            e = dia(p["dia_mision"])
            if e["flujo_protones_10mev_pfu"] is None or p["max_pfu"] > e["flujo_protones_10mev_pfu"]:
                e["flujo_protones_10mev_pfu"] = p["max_pfu"]
                e["flujo_origen"] = {"naturaleza": "Real", "fuente": f"GOES {p['serie']} (NOAA SWPC)",
                                     "fecha_real": _fecha_real(ventanas, "goes", p["dia_mision"])}
    for ev in panel["eventos"]:
        e = dia(int(ev["t_mision"][1:4]))
        e["eventos_sep"].append({"sepID": ev["sepID"], "t_real": ev["t_real"], "link": ev.get("link"),
                                 "fuente": "DONKI (NASA CCMC)"})
        e["modo_tormenta"] = True  # DONKI fija el inicio real del modo tormenta (§3.1)
    return dias


def _entorno_demo(caso, reales):
    """Escenario de demostración: el entorno simulado del caso de referencia, con las mediciones reales del gold
    donde el escenario las trae. Las anomalías inyectadas (pico de CO2 y tormenta, §5.5) mandan y van `Simulado`."""
    salida = []
    for sim in caso["entorno_diario"]:
        d = sim["dia_mision"]
        real = reales.get(d, {})
        e = {"dia_mision": d, "co2_ppm_max_horario": None, "co2_mmhg_max_horario": sim["co2_mmhg_max_horario"],
             "co2_origen": {"naturaleza": "Simulado", "fuente": "Escenario de demostración", "fecha_real": None},
             "flujo_protones_10mev_pfu": sim["flujo_protones_10mev_pfu"],
             "flujo_origen": {"naturaleza": "Simulado", "fuente": "Escenario de demostración", "fecha_real": None},
             "eventos_sep": real.get("eventos_sep", []), "modo_tormenta": bool(real.get("eventos_sep"))}
        if real.get("co2_origen") and sim["co2_mmhg_max_horario"] <= CO2_LIMITE_MMHG:
            e.update(co2_ppm_max_horario=real["co2_ppm_max_horario"], co2_mmhg_max_horario=None, co2_origen=real["co2_origen"])
        if real.get("flujo_origen") and sim["flujo_protones_10mev_pfu"] < PROTONES_TORMENTA_PFU:
            e.update(flujo_protones_10mev_pfu=real["flujo_protones_10mev_pfu"], flujo_origen=real["flujo_origen"])
        salida.append(e)
    return salida


def _lecturas_reales(conn, id):
    """Lo que el tripulante registró de verdad (`naturaleza: Real`), una fila por día de misión con el último
    valor de cada indicador. Un indicador sin medida ese día queda en null; los días <= 0 son prevuelo."""
    dia1 = tripulacion._dia1(conn, id)

    def dia_de(t_real):
        return (tripulacion._utc(t_real) - dia1).days + 1

    dias = {}

    def fila(d):
        return dias.setdefault(d, {"dia_mision": d, **{campo: None for campo in CAMPO_DE_INDICADOR.values()},
                                   "fc_instrumento": None, "t_real": None, "sintomas": [], "durante_tormenta": False})

    for r in lecturas.leer_lecturas(conn, id):
        if r["naturaleza"] != "Real" or r["indicador"] not in CAMPO_DE_INDICADOR:
            continue
        f = fila(dia_de(r["t_real"]))
        f[CAMPO_DE_INDICADOR[r["indicador"]]] = r["valor"]  # vienen por t_real: la última del día manda
        f["t_real"] = r["t_real"]  # hora de la última medida del día: la del aviso si esa lectura escala
        if r["indicador"] == "frecuencia_cardiaca_reposo":
            f["fc_instrumento"] = r["metodo"] or "manual"
    reales = {dia_de(r["t_real"]) for r in lecturas.leer_lecturas(conn, id) if r["naturaleza"] == "Real"}
    for s in lecturas.leer_sintomas(conn, id):
        d = dia_de(s["t_real"])
        if d in reales and s["codigo"] not in fila(d)["sintomas"]:  # solo síntomas de días con registro real
            fila(d)["sintomas"].append(s["codigo"])
    return [dias[d] for d in sorted(dias)]


@router.get("/tripulantes/{id}/historial", responses=ERRORES, summary="Historial fisiológico y entorno del tripulante")
def historial(id: int = Depends(propio), modo: Literal["real", "demo"] = "real", conn=Depends(conexion)):
    """Lo que evalúa el motor: `lecturas` por día de misión (días <= 0 = prevuelo) y `entorno_diario`.

    - `modo=real` (por defecto): las lecturas que el tripulante ingresó (`naturaleza: Real`) y el entorno medido
      del panel gold `mision-real`. Sin simulación: un día sin registro no tiene lecturas.
    - `modo=demo`: el tripulante simulado del caso de referencia (§5.5, `naturaleza: Simulado`) con las anomalías
      inyectadas, más las mediciones reales del panel gold `mision-vigia` donde el escenario las trae.

    En `entorno_diario`, el CO2 real viene en ppm (`co2_ppm_max_horario`: la app lo convierte con la presión del
    perfil) y el simulado ya en mmHg. `co2_origen` y `flujo_origen` dicen si es Real o Simulado, la fuente y la fecha
    real. `eventos_sep` son eventos DONKI reales reanclados; con alguno, `modo_tormenta` es true."""
    panel = gold.panel(ESCENARIO_ENTORNO[modo])
    reales = _entorno_real(panel) if panel else {}
    comun = {"modo": modo, "escenario_entorno": panel["escenario"] if panel else None,
             "aviso_entorno": panel["aviso"] if panel else None}
    if modo == "demo":
        caso = _json(_CASO)
        # shortcut: cada tripulante recibe un tripulante simulado por turno; asignar uno propio al sembrar la misión
        simulado = caso["tripulantes"][(id - 1) % len(caso["tripulantes"])]
        return {**comun, "naturaleza": caso["naturaleza"], "dias_prevuelo": caso["dias_prevuelo"],
                "dias_vuelo": caso["dias_vuelo"], "dia_actual": DIA_ACTUAL_DEMO,
                "entorno_diario": _entorno_demo(caso, reales), "lecturas": simulado["lecturas"]}
    ahora = datetime.now(timezone.utc).strftime(tripulacion.FORMATO)
    dia_actual = tripulacion.dia_de_vuelo(conn, id, ahora) or 1
    filas = _lecturas_reales(conn, id)
    for f in filas:
        f["durante_tormenta"] = bool(reales.get(f["dia_mision"], {}).get("modo_tormenta"))
    return {**comun, "naturaleza": "Real", "dias_prevuelo": sum(f["dia_mision"] <= 0 for f in filas),
            "dias_vuelo": max(DIAS_VUELO_MINIMO, dia_actual), "dia_actual": dia_actual,
            "entorno_diario": [reales[d] for d in sorted(reales)], "lecturas": filas}


@router.get("/tripulacion", responses={401: ERRORES[401]}, summary="Tripulación de tu misión")
def tripulacion_de_la_mision(quien: int = Depends(actor), conn=Depends(conexion)):
    """`{id, alias, rol}` de cada tripulante de la misión de quien pregunta (para saber quién es el oficial médico)."""
    return [dict(f) for f in conn.execute(
        "SELECT id, alias, rol FROM tripulante WHERE mision_id = (SELECT mision_id FROM tripulante WHERE id = ?) "
        "ORDER BY id", (quien,))]


@router.get("/tripulantes/{id}/recordatorios", responses=ERRORES, summary="Recordatorios del día")
def recordatorios(id: int = Depends(propio), lang: Literal["es", "en"] = "es"):
    """Lista de textos (`lang=en` en inglés). Simulado: aún no hay plan de actividades a bordo."""
    return _json(_DEMO / ("recordatorios.en.json" if lang == "en" else "recordatorios.json"))


@router.get("/tripulantes/{id}/mensajes", responses=ERRORES, summary="Hilo con tierra")
def mensajes(id: int = Depends(propio), modo: Literal["real", "demo"] = "real", conn=Depends(conexion)):
    """`{id, de: astronaut|surgeon, autor, dia, hora, texto}`: las respuestas reales de tierra a los reportes del
    tripulante; en `modo=demo`, además, el hilo de ejemplo."""
    hilo = _json(_DEMO / "mensajes.json") if modo == "demo" else []
    dia_tope = DIA_ACTUAL_DEMO if modo == "demo" else 10**6
    for r in cola.leer_reportes(conn, id):
        if r["estado"] == "respondido":
            dia = tripulacion.dia_de_vuelo(conn, id, r["llega_t_real"]) or 1
            hilo.append({"id": f"r{r['id']}", "de": "surgeon", "autor": "Cirujano de Vuelo",
                         # en modo demo la UI vive en el día de demo: la respuesta real se ancla a él
                         "dia": min(dia, dia_tope), "hora": r["llega_t_real"][11:16], "texto": r["respuesta"]})
    return hilo
