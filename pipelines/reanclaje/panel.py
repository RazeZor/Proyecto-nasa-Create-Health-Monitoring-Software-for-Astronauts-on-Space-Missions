"""Panel de entorno (tarjeta del kanban): el gold de un escenario resumido para la app.

Dosis acumulada frente al límite de carrera, flujo de protones con modo tormenta y cabina (CO2 en
mmHg por perfil, temperatura y humedad). No hace cálculos nuevos sobre los datos: toma los
resúmenes diarios de reanclaje.diario() y los convierte a lo que la pantalla necesita.
"""
import json

import reanclaje

LIMITES = {"carrera_msv": 600, "evento_msv": 250, "co2_mmhg_promedio_1h": 3, "protones_tormenta_pfu": 10}
# Presión total de cabina por perfil, en mmHg (informe §3.3, tabla de perfiles). La conversión de
# ppm a presión parcial depende de ella: un umbral fijo en ppm falla fuera de la ISS.
PERFILES = {"estacion": 760, "transito": 760, "superficie": 424}
PASOS_POR_DIA = 288  # 24 h / 5 min
AVISO = ("Cada serie es una medición real reanclada a la línea de tiempo de misión. Que series de fechas "
         "reales distintas coincidan en un día de misión es una decisión del escenario, no un hecho observado "
         "(informe §3.4).")


def _dosis(diario):
    """Dosis por día de misión y acumulada. Prefiere la dosis equivalente; con dosis absorbida la
    comparación con el límite solo es orientativa (informe §3.3) y se rotula así."""
    for variable in ("dose_equivalent_rate", "absorbed_dose_rate"):
        filas = [d for d in diario if d["fuente"] == "radlab" and d["variable"] == variable]
        if filas:
            break
    else:
        return None
    acumulada, por_dia = 0.0, []
    for dia in sorted({d["dia_mision"] for d in filas}):
        del_dia = [d for d in filas if d["dia_mision"] == dia]
        dosis = sum(d["dosis"] for d in del_dia) / len(del_dia)  # detectores redundantes: promedio
        acumulada += dosis
        por_dia.append({"dia_mision": dia, "dosis": round(dosis, 4), "acumulada": round(acumulada, 4),
                        "cobertura": round(max(d["bins"] for d in del_dia) / PASOS_POR_DIA, 3)})
    equivalente = variable == "dose_equivalent_rate"
    return {"tipo": "equivalente" if equivalente else "absorbida", "unidad": "µSv" if equivalente else "µGy",
            "orientativa": not equivalente, "series": sorted({d["serie"] for d in filas}), "por_dia": por_dia,
            # shortcut: 1 µGy se toma como 1 µSv (factor de calidad 1, cota inferior); usar dosis equivalente
            "porcentaje_limite_carrera": round(acumulada / 1000 / LIMITES["carrera_msv"] * 100, 4)}


def _protones(diario):
    return [{"dia_mision": d["dia_mision"], "serie": d["serie"], "max_pfu": round(d["max"], 4),
             "modo_tormenta": d["serie"].endswith(">=10 MeV") and d["max"] >= LIMITES["protones_tormenta_pfu"]}
            for d in diario if d["fuente"] == "goes"]


def _cabina(diario):
    filas = [d for d in diario if d["fuente"] == "eda"]
    dias = {}
    for d in filas:
        dia = dias.setdefault((d["dia_mision"], d["serie"]), {"dia_mision": d["dia_mision"], "mision": d["serie"]})
        if d["variable"] == "co2_iss":
            ppm = d["max_prom_horario"]
            dia["co2_ppm_max"] = d["max"]
            dia["co2_ppm_promedio_horario_max"] = round(ppm, 1)
            dia["co2_mmhg_por_perfil"] = {p: round(ppm * presion / 1e6, 3) for p, presion in PERFILES.items()}
            dia["co2_sobre_limite_por_perfil"] = {p: v > LIMITES["co2_mmhg_promedio_1h"]
                                                 for p, v in dia["co2_mmhg_por_perfil"].items()}
        elif d["variable"] in ("temperature_iss", "humidity_iss"):
            dia[d["variable"] + "_max"] = d["max"]
    return [dias[k] for k in sorted(dias)]


def construir_panel(gold):
    """Panel de un escenario ya reanclado. Una sección sin datos queda en null o lista vacía."""
    return {"escenario": gold["escenario"], "ventanas": gold["ventanas"],  # fuente y fechas reales de cada serie
            "aviso": AVISO, "limites": LIMITES, "perfiles_presion_mmhg": PERFILES,
            "dosis": _dosis(gold["diario"]), "protones": _protones(gold["diario"]),
            "cabina": _cabina(gold["diario"]), "eventos": gold["eventos"]}


def publicar(escenario, destino=None):
    """Reancla el escenario, arma el panel y lo guarda (por defecto en gold/panel-<nombre>.json)."""
    reanclaje.construir(escenario)
    gold = json.loads((reanclaje.datalake.ROOT / "gold" / f"{escenario['nombre']}.json").read_text())
    panel = construir_panel(gold)
    return reanclaje.guardar(f"panel-{escenario['nombre']}", panel, destino,
                             dosis=panel["dosis"] is not None, protones=len(panel["protones"]),
                             cabina=len(panel["cabina"]), eventos=len(panel["eventos"]))
