"""Simulador reproducible y motor híbrido de referencia de VIGÍA (informe §5.1, §5.2 y §5.5).

Protocolo (§5.5): 14 días previos al vuelo + 30 de misión, 4 tripulantes, y tres anomalías conocidas:
- A1: deriva cardiovascular por falta de sueño en trip-1, días 18 a 27 (sueño -0,20 h/día, FC +1 lpm/día,
  ánimo -0,15/día).
- A2: pico de CO2 de 4,6 mmHg el día 12; trip-2 y trip-3 reportan cefalea.
- A3: tormenta solar, 200 pfu en >=10 MeV los días 22 y 23.

Motor (§5.1 y §5.2): capa A (NEWS2), capa B (z modificada contra la línea base vigente, dos días seguidos),
capa C (CUSUM unilateral desde el día 21) y reglas de contexto (CO2 con cefalea, modo tormenta).
La línea base pasa de tierra a vuelo: el detector NO conoce los desplazamientos de `SUPUESTOS`; solo los usa
el generador. `packages/engine/engine.ts` es el port 1:1: si cambias una regla, cámbiala en ambos.
"""
import datetime as dt
import json
import math
import random
from pathlib import Path
from statistics import median

import trayectoria

import reanclaje

SEMILLA_DEFECTO = 2026
SEMILLA_SECUNDARIA = 2027
DIAS_PREVUELO = 14
DIAS_VUELO = 30
TRIPULANTES_POR_MISION = 4

# Supuestos del escenario simulado (solo los usa el generador) y pisos de dispersión del motor.
SUPUESTOS = {
    "fc_desplazamiento_lpm": 3.0,
    "sueno_desplazamiento_h": -0.7,
    "pas_desplazamiento_mmHg": -4.0,
    "tau_adaptacion_dias": 4.0,
    "mad_min": {
        "fc": 2.5,
        "pas": 4.0,
        "glucosa": 6.0,
        "sueno": 0.4,
        "animo": 1.0,
    },
}

ROLES_TRIPULACION = [
    ("trip-1", "Comandante Alpha", "comandante"),
    ("trip-2", "Especialista CMO", "cmo"),
    ("trip-3", "Ingeniero Orbital", "astronauta"),
    ("trip-4", "Especialista Carga", "astronauta"),
]

# Constantes del motor híbrido (§5.1)
Z_UMBRAL_FISIOLOGICO = 3.5
Z_UMBRAL_CONDUCTUAL = 3.0
DIAS_CONSECUTIVOS_B = 2
CUSUM_K = 0.75
CUSUM_H = 5.0
CUSUM_DIA_INICIO = 21
CO2_LIMITE_MMHG = 3.0
PROTONES_TORMENTA_PFU = 10.0
# Línea base de tierra a vuelo (§5.2)
DIA_FIN_ADAPTACION = 14
DIAS_TRANSICION = 7
VENTANA_DIA_INICIO = 8
VENTANA_MAX_LECTURAS = 14
VENTANA_REZAGO_DIAS = 3
VENTANA_MIN_LECTURAS = 5

# Indicadores con capa B: campo de la lectura y umbral de z. Los de capa C llevan además el sentido vigilado.
INDICADORES_B = (
    ("fc", "fc_reposo_lpm", Z_UMBRAL_FISIOLOGICO),
    ("pas", "pas_mmHg", Z_UMBRAL_FISIOLOGICO),
    ("sueno", "sueno_h", Z_UMBRAL_CONDUCTUAL),
    ("animo", "animo_1_10", Z_UMBRAL_CONDUCTUAL),
    ("glucosa", "glucosa_mg_dl", Z_UMBRAL_FISIOLOGICO),
)
# La glucosa es semanal: su persistencia son dos medidas seguidas (no dos días) y un día sin medida no la rompe.
SENTIDO_C = {"fc": 1.0, "sueno": -1.0, "animo": -1.0}  # FC al alza; sueño y ánimo a la baja

# Anomalías del protocolo (§5.5)
A1_DIA_INICIO = 18
A1_DIA_FIN = 27
A2_DIA = 12
A2_CO2_MMHG = 4.6
A2_AFECTADOS = ("trip-2", "trip-3")
A3_DIAS = (22, 23)
A3_FLUJO_PFU = 200.0
# Días de las tres anomalías de cada escenario: el de referencia (§5.5) y el viaje a Marte (docs/superpowers/specs)
ANOMALIAS_REFERENCIA = {"a1": (A1_DIA_INICIO, A1_DIA_FIN), "a2": A2_DIA, "a3": A3_DIAS}
# El viaje parte el 15-sep-2011 (día 1) y llega a la órbita de Marte el día 259 (30-may-2012): el calendario de los datos
# reales (DONKI y RadLab, en el panel gold `mision-vigia`). A3 cae en la tormenta solar real del 23-ene-2012 (día 131).
INICIO_MISION = "2011-09-15"
ANOMALIAS_VIAJE = {"a1": (100, 109), "a2": 60, "a3": (131, 132)}
# Dosis del viaje: radiación galáctica de fondo medida por MSL RAD en el tránsito (~1,8 mSv/día; Zeitlin et al. 2013);
# la tormenta suma una dosis extra por día de evento (supuesto de escenario, detrás del blindaje de la cabina).
DOSIS_FONDO_MSV_DIA = 1.8
DOSIS_TORMENTA_EXTRA_MSV = 3.0
UMBRAL_FIJO_FC_LPM = 91.0  # comparador terrestre: primer tramo de NEWS2 para la frecuencia cardíaca


def _factor_adaptacion(dia_mision, tau=SUPUESTOS["tau_adaptacion_dias"]):
    """Curva del generador: w(d) = 1 - exp(-d / tau) para días de vuelo (d >= 1)."""
    if dia_mision <= 0:
        return 0.0
    return 1.0 - math.exp(-dia_mision / tau)


def _mediana_mad(valores):
    """Mediana y MAD sin el factor 1,4826 y sin piso."""
    med = median(valores)
    return med, median([abs(v - med) for v in valores])


def _mad_bruto(valores, minimo):
    """Mediana y MAD con piso MAD_MIN (§5.1)."""
    med, mad = _mediana_mad(valores)
    return med, max(mad, minimo)


def _peso_vuelo(dia, n_ventana):
    """w(d) de §5.2: 0 en adaptación o con menos de 5 lecturas en vuelo; luego sube hasta 1 en 7 días."""
    if dia <= DIA_FIN_ADAPTACION or n_ventana < VENTANA_MIN_LECTURAS:
        return 0.0
    return min(1.0, (dia - DIA_FIN_ADAPTACION) / DIAS_TRANSICION)


def _referencia(dia, tierra, historia, excluidos, piso):
    """Centro y dispersión vigentes el día `dia` (§5.2): mezcla de la línea base de tierra y la ventana en vuelo.

    La ventana toma hasta 14 lecturas desde el día 8 y termina 3 días antes de `dia`, sin los días excluidos
    (los que superaron el umbral o tuvieron alerta), para que una deriva en curso no se absorba en su referencia.
    """
    ventana = [v for j, v in historia
               if VENTANA_DIA_INICIO <= j <= dia - VENTANA_REZAGO_DIAS and j not in excluidos][-VENTANA_MAX_LECTURAS:]
    if tierra is None:  # sin línea base de tierra: la ventana en vuelo sola, cuando llega a 5 lecturas
        if len(ventana) < VENTANA_MIN_LECTURAS:
            return None
        med_v, mad_v = _mediana_mad(ventana)
        return med_v, max(mad_v, piso)
    w = _peso_vuelo(dia, len(ventana))
    med_t, mad_t = tierra
    if w == 0.0:
        return med_t, max(mad_t, piso)
    med_v, mad_v = _mediana_mad(ventana)
    return (1.0 - w) * med_t + w * med_v, max((1.0 - w) * mad_t + w * mad_v, piso)


def _puntos_news2(fc, pas, spo2, temp):
    """Puntaje NEWS2 de FC, PAS, SpO2 y temperatura (§5.1): (suma, máximo individual)."""
    pts = 0
    max_individual = 0

    def acumular(p):
        nonlocal pts, max_individual
        pts += p
        if p > max_individual:
            max_individual = p

    # Frecuencia cardiaca
    if fc <= 40 or fc >= 131:
        acumular(3)
    elif fc >= 111:
        acumular(2)
    elif fc <= 50 or fc >= 91:
        acumular(1)

    # Presión arterial sistólica
    if pas <= 90 or pas >= 220:
        acumular(3)
    elif pas <= 100:
        acumular(2)
    elif pas <= 110:
        acumular(1)

    # SpO2 (%)
    if spo2 <= 91:
        acumular(3)
    elif spo2 <= 93:
        acumular(2)
    elif spo2 <= 95:
        acumular(1)

    # Temperatura central (°C)
    if temp <= 35.0:
        acumular(3)
    elif temp >= 39.1:
        acumular(2)
    elif temp <= 36.0 or temp >= 38.1:
        acumular(1)

    return pts, max_individual


def _entorno_sintetico_mision(rng, con_co2=False, con_tormenta=False, dias_vuelo=DIAS_VUELO, anomalias=ANOMALIAS_REFERENCIA):
    """Entorno simulado (CO2 y protones) de `dias_vuelo` días, con las anomalías A2 y A3 si se piden."""
    entorno = []
    for dia in range(1, dias_vuelo + 1):
        co2 = round(max(1.2, min(2.95, 2.05 + rng.gauss(0.0, 0.25))), 3)
        flujo = round(max(0.15, 0.35 + rng.gauss(0.0, 0.08)), 3)
        if con_co2 and dia == anomalias["a2"]:
            co2 = A2_CO2_MMHG
        if con_tormenta and dia in anomalias["a3"]:
            flujo = A3_FLUJO_PFU
        entorno.append({
            "dia_mision": dia,
            "co2_mmhg_max_horario": co2,
            "flujo_protones_10mev_pfu": flujo,
            "modo_tormenta": flujo >= PROTONES_TORMENTA_PFU,
        })
    return entorno


def _ruido_fisiologico(rng, sigma):
    """Ruido diario con colas algo pesadas (1,5 % de transitorios benignos)."""
    base = rng.gauss(0.0, sigma)
    if rng.random() < 0.015:
        base += rng.choice((-1.0, 1.0)) * sigma * rng.uniform(1.6, 2.3)
    return base


def _generar_tripulante(rng, tid, nombre, rol, entorno_por_dia, a1=None, cefalea_dias=(), dias_vuelo=DIAS_VUELO,
                        anomalias=ANOMALIAS_REFERENCIA):
    """14 días de prevuelo + `dias_vuelo` de vuelo. `a1` es la intensidad de la deriva A1 (None = sin deriva)."""
    base_fc = 60.0 + rng.uniform(-6.0, 10.0)
    base_pas = 118.0 + rng.uniform(-8.0, 10.0)
    base_pad = 74.0 + rng.uniform(-5.0, 6.0)
    base_spo2 = 98.2 + rng.uniform(-0.5, 0.8)
    base_temp = 36.65 + rng.uniform(-0.15, 0.15)
    base_sueno = 7.3 + rng.uniform(-0.4, 0.6)
    base_animo = 7.8 + rng.uniform(-0.4, 0.5)
    base_glucosa = 92.0 + rng.uniform(-6.0, 8.0)
    base_masa = 72.0 + rng.uniform(-8.0, 12.0)

    lecturas = []
    for dia in range(-DIAS_PREVUELO + 1, dias_vuelo + 1):
        w = _factor_adaptacion(dia)
        delta_fc = SUPUESTOS["fc_desplazamiento_lpm"] * w
        delta_sueno = SUPUESTOS["sueno_desplazamiento_h"] * w
        delta_pas = SUPUESTOS["pas_desplazamiento_mmHg"] * w

        # A1 (§5.5): deriva lineal dentro de la ventana, proporcional a los días transcurridos
        pasos = (dia - anomalias["a1"][0] + 1) * a1 if a1 is not None and anomalias["a1"][0] <= dia <= anomalias["a1"][1] else 0.0
        inj_fc = 1.0 * pasos
        inj_sueno = -0.20 * pasos
        inj_animo = -0.15 * pasos

        fc = round(base_fc + delta_fc + inj_fc + _ruido_fisiologico(rng, 2.2), 1)
        pas = round(base_pas + delta_pas + _ruido_fisiologico(rng, 4.0), 1)
        pad = round(base_pad + delta_pas * 0.5 + _ruido_fisiologico(rng, 2.8), 1)
        spo2 = round(min(100.0, max(94.0, base_spo2 + rng.gauss(0.0, 0.35))), 1)
        temp = round(base_temp + rng.gauss(0.0, 0.12), 2)
        sueno = round(max(1.5, min(11.0, base_sueno + delta_sueno + inj_sueno + _ruido_fisiologico(rng, 0.38))), 2)
        animo = max(1, min(10, int(round(base_animo + inj_animo + rng.gauss(0.0, 0.55)))))

        # Semanales (glucosa y masa corporal cada 7 días)
        es_semanal = (dia % 7 == 0)
        glucosa = round(base_glucosa + rng.gauss(0.0, 4.5), 1) if es_semanal else None
        masa = round(base_masa - (0.03 * max(0, dia)) + rng.gauss(0.0, 0.2), 2) if es_semanal else None

        lecturas.append({
            "dia_mision": dia,
            "fc_reposo_lpm": fc,
            "pas_mmHg": pas,
            "pad_mmHg": pad,
            "spo2_pct": spo2,
            "temp_central_c": temp,
            "sueno_h": sueno,
            "animo_1_10": animo,
            "glucosa_mg_dl": glucosa,
            "masa_kg": masa,
            "sintomas": ["cefalea"] if dia in cefalea_dias else [],
            "durante_tormenta": bool(entorno_por_dia.get(dia, {}).get("modo_tormenta", False)),
        })

    return {"id": tid, "nombre": nombre, "rol": rol, "lecturas": lecturas}


def _alerta(tripulante, dia, capa, nivel, indicador, valor, escalada=False, ambito="personal", informativa=False):
    return {
        "dia_mision": dia,
        "tripulante_id": tripulante["id"],
        "capa": capa,
        "nivel": nivel,
        "indicador": indicador,
        "valor": valor,
        "escalada_auto": escalada,
        "ambito": ambito,
        "informativa": informativa,
    }


def evaluar_tripulante(tripulante, entorno_por_dia, cusum_k=CUSUM_K, cusum_h=CUSUM_H):
    """Motor híbrido de referencia sobre un tripulante: alertas de las capas A, B, C y de contexto.

    - Capa A: rojo (escala siempre) con un parámetro en su tramo extremo o suma >= 5; ámbar con suma 3 o 4.
    - Capa B: z modificada contra la referencia vigente, dos días seguidos (glucosa, semanal: dos medidas seguidas). En adaptación (días 1 a 14) se
      devuelve como `informativa`: se muestra, no alerta. Siempre ámbar.
    - Capa C: CUSUM unilateral desde el día 21 (FC al alza; sueño y ánimo a la baja). Ámbar; al emitir, la suma
      vuelve a cero.
    - Contexto: CO2 sobre el límite con cefalea y modo tormenta. Son de `ambito: tripulacion`: no llevan datos
      personales y no escalan como alerta médica. Un síntoma que el entorno no explica da un ámbar personal
      (`sintoma_<código>`), que tampoco escala.
    """
    lecturas = sorted(tripulante["lecturas"], key=lambda r: r["dia_mision"])
    prevuelo = [r for r in lecturas if r["dia_mision"] <= 0]
    vuelo = [r for r in lecturas if r["dia_mision"] >= 1]
    piso = SUPUESTOS["mad_min"]
    tierra = {}
    for ind, campo, _ in INDICADORES_B:
        medidas = [r[campo] for r in prevuelo if r[campo] is not None]
        tierra[ind] = _mediana_mad(medidas) if medidas else None  # sin prevuelo: solo vale la ventana en vuelo

    alertas = []
    historia = {ind: [] for ind, _, _ in INDICADORES_B}
    excluidos = {ind: set() for ind, _, _ in INDICADORES_B}
    consec_b = {ind: 0 for ind, _, _ in INDICADORES_B}
    cusum = {ind: 0.0 for ind in SENTIDO_C}

    for r in vuelo:
        d = r["dia_mision"]
        env = entorno_por_dia.get(d, {})
        flujo = env.get("flujo_protones_10mev_pfu")
        tormenta = bool(env.get("modo_tormenta")) or (flujo is not None and flujo >= PROTONES_TORMENTA_PFU)

        # Capa A: clínica NEWS2
        news2, max_ind = _puntos_news2(r["fc_reposo_lpm"], r["pas_mmHg"], r["spo2_pct"], r["temp_central_c"])
        if news2 >= 5 or max_ind == 3:
            alertas.append(_alerta(tripulante, d, "A", "rojo", "news2", float(news2), escalada=True))
        elif news2 >= 3:
            alertas.append(_alerta(tripulante, d, "A", "ambar", "news2", float(news2)))

        # Capas B y C: desviación y deriva contra la referencia vigente
        adaptacion = d <= DIA_FIN_ADAPTACION
        for ind, campo, umbral in INDICADORES_B:
            valor = r[campo]
            if valor is None:  # medida semanal que hoy no toca
                continue
            referencia = _referencia(d, tierra[ind], historia[ind], excluidos[ind], piso[ind])
            historia[ind].append((d, valor))
            if referencia is None:  # aún no hay con qué comparar
                continue
            centro, dispersion = referencia
            z = 0.6745 * (valor - centro) / dispersion

            if abs(z) >= umbral:
                consec_b[ind] += 1
                excluidos[ind].add(d)
            else:
                consec_b[ind] = 0
            if consec_b[ind] >= DIAS_CONSECUTIVOS_B:
                alertas.append(_alerta(tripulante, d, "B", "ambar", ind, round(float(valor), 2),
                                       informativa=adaptacion))

            if ind in SENTIDO_C and d >= CUSUM_DIA_INICIO:
                cusum[ind] = max(0.0, cusum[ind] + SENTIDO_C[ind] * z - cusum_k)
                if cusum[ind] >= cusum_h:
                    alertas.append(_alerta(tripulante, d, "C", "ambar", ind, round(cusum[ind], 2)))
                    excluidos[ind].add(d)
                    cusum[ind] = 0.0

        # Contexto: el entorno explica el síntoma o pide refugio. Dato ambiental, no personal.
        co2 = env.get("co2_mmhg_max_horario")
        co2_alto = co2 is not None and co2 > CO2_LIMITE_MMHG
        if co2_alto and "cefalea" in r["sintomas"]:
            alertas.append(_alerta(tripulante, d, "contexto", "ambar", "co2", co2, ambito="tripulacion"))
        if tormenta:
            alertas.append(_alerta(tripulante, d, "contexto", "ambar", "protones", flujo, ambito="tripulacion"))
        # Síntoma reportado que el entorno medido no explica: ámbar personal, para que su zona del cuerpo lo muestre
        for sintoma in r["sintomas"]:
            if not (co2_alto and sintoma == "cefalea"):
                alertas.append(_alerta(tripulante, d, "contexto", "ambar", f"sintoma_{sintoma}", None))

    return alertas


def _orden(a):
    return (a["dia_mision"], a["tripulante_id"], a["capa"], a["indicador"])


def generar_mision(rng, a1=None, a2=False, a3=False, dias_vuelo=DIAS_VUELO, anomalias=ANOMALIAS_REFERENCIA):
    """Genera una misión (entorno y 4 tripulantes x (14 + `dias_vuelo`) días). `a1` = intensidad de la deriva en trip-1."""
    entorno = _entorno_sintetico_mision(rng, con_co2=a2, con_tormenta=a3, dias_vuelo=dias_vuelo, anomalias=anomalias)
    entorno_por_dia = {e["dia_mision"]: e for e in entorno}
    tripulantes = [
        _generar_tripulante(rng, tid, nombre, rol, entorno_por_dia,
                            a1=a1 if tid == "trip-1" else None,
                            cefalea_dias=(anomalias["a2"],) if a2 and tid in A2_AFECTADOS else (),
                            dias_vuelo=dias_vuelo, anomalias=anomalias)
        for tid, nombre, rol in ROLES_TRIPULACION
    ]
    return entorno, tripulantes


def _con_dosis_y_posicion(entorno, semilla):
    """Añade al entorno del viaje la dosis diaria y acumulada (mSv) y la posición de la nave (`trayectoria`)."""
    rng = random.Random(f"dosis-{semilla}")
    acumulada = 0.0
    for e in entorno:
        dia = e["dia_mision"]
        dosis = DOSIS_FONDO_MSV_DIA * (1 + 0.08 * math.sin(2 * math.pi * dia / 120)) + max(-0.1, min(0.1, rng.gauss(0.0, 0.04)))
        if e["modo_tormenta"]:
            dosis += DOSIS_TORMENTA_EXTRA_MSV
        acumulada += dosis
        e["dosis_msv_dia"] = round(dosis, 3)
        e["dosis_acumulada_msv"] = round(acumulada, 3)
    return entorno


def evaluar_mision(entorno, tripulantes, cusum_k=CUSUM_K, cusum_h=CUSUM_H):
    entorno_por_dia = {e["dia_mision"]: e for e in entorno}
    alertas = [a for t in tripulantes for a in evaluar_tripulante(t, entorno_por_dia, cusum_k, cusum_h)]
    return sorted(alertas, key=_orden)


def generar_caso_referencia(semilla=SEMILLA_DEFECTO):
    """Caso de referencia: una misión con A1 (trip-1), A2 (trip-2 y trip-3) y A3; trip-4 es nominal."""
    rng = random.Random(semilla)
    entorno, tripulantes = generar_mision(rng, a1=1.0, a2=True, a3=True)
    return {
        "semilla": semilla,
        "dias_prevuelo": DIAS_PREVUELO,
        "dias_vuelo": DIAS_VUELO,
        "naturaleza": "Simulado",
        "supuestos": SUPUESTOS,
        "entorno_diario": entorno,
        "tripulantes": tripulantes,
        "alertas_esperadas": evaluar_mision(entorno, tripulantes),
    }


def generar_caso_viaje(semilla=SEMILLA_DEFECTO):
    """Caso del viaje a Marte: el tránsito completo (`DIAS_TRANSITO` días) con las tres anomalías en su calendario,
    el entorno con dosis y la posición de la nave cada día (`trayectoria`)."""
    rng = random.Random(semilla)
    entorno, tripulantes = generar_mision(rng, a1=1.0, a2=True, a3=True, dias_vuelo=trayectoria.DIAS_TRANSITO,
                                          anomalias=ANOMALIAS_VIAJE)
    entorno = _con_dosis_y_posicion(entorno, semilla)
    return {
        "semilla": semilla,
        "dias_prevuelo": DIAS_PREVUELO,
        "dias_vuelo": trayectoria.DIAS_TRANSITO,
        "inicio_mision": INICIO_MISION,
        "naturaleza": "Simulado",
        "supuestos": SUPUESTOS,
        "entorno_diario": entorno,
        "tripulantes": tripulantes,
        "alertas_esperadas": evaluar_mision(entorno, tripulantes),
        "trayectoria": [_redondea(trayectoria.posicion(d)) for d in range(1, trayectoria.DIAS_TRANSITO + 1)],
    }


def publicar_caso_viaje(destino):
    """Escribe el caso del viaje compacto (el fixture de la demo y de la paridad del motor)."""
    destino = Path(destino)
    destino.write_text(json.dumps(generar_caso_viaje(), ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return {"escrito": str(destino), "bytes": destino.stat().st_size}


def _redondea(punto):
    """Redondea a 5 decimales los reales de la posición (el fixture queda pequeño y estable)."""
    return {k: _redondea(v) if isinstance(v, dict) else round(v, 5) if isinstance(v, float) else v for k, v in punto.items()}


def _es_medica(a):
    """Alerta personal que cuenta para detección y falsas alarmas (no informativa ni de entorno)."""
    return a["ambito"] == "personal" and not a["informativa"]


def _lote_anomalias(n_misiones, semilla, intensidad=1.0, cusum_k=CUSUM_K, cusum_h=CUSUM_H):
    """Misiones con las tres anomalías: detección de A1, A2 y A3, días hasta la alerta y umbral fijo."""
    rng = random.Random(semilla)
    det_a1 = det_a2 = det_a3 = fijo = 0
    dias = []
    for _ in range(n_misiones):
        entorno, tripulantes = generar_mision(rng, a1=intensidad, a2=True, a3=True)
        alertas = evaluar_mision(entorno, tripulantes, cusum_k, cusum_h)

        deriva = [a["dia_mision"] for a in alertas
                  if a["tripulante_id"] == "trip-1" and a["capa"] in ("B", "C") and _es_medica(a)
                  and A1_DIA_INICIO <= a["dia_mision"] <= A1_DIA_FIN]
        if deriva:
            det_a1 += 1
            dias.append(min(deriva) - A1_DIA_INICIO + 1)

        del_dia = [a for a in alertas if a["dia_mision"] == A2_DIA and a["tripulante_id"] in A2_AFECTADOS]
        con_entorno = {a["tripulante_id"] for a in del_dia if a["indicador"] == "co2"}
        if con_entorno == set(A2_AFECTADOS) and not any(_es_medica(a) for a in del_dia):
            det_a2 += 1

        if any(a["indicador"] == "protones" and a["dia_mision"] == A3_DIAS[0] for a in alertas):
            det_a3 += 1

        if any(r["fc_reposo_lpm"] >= UMBRAL_FIJO_FC_LPM for r in tripulantes[0]["lecturas"]
               if A1_DIA_INICIO <= r["dia_mision"] <= A1_DIA_FIN):
            fijo += 1

    pct = lambda x: round(100.0 * x / n_misiones, 2)  # noqa: E731
    return {
        "misiones": n_misiones,
        "intensidad": intensidad,
        "A1_deriva_deteccion_pct": pct(det_a1),
        "A1_dias_hasta_alerta_mediana": round(float(median(dias)), 2) if dias else None,
        "A2_co2_cefalea_deteccion_pct": pct(det_a2),
        "A3_tormenta_deteccion_pct": pct(det_a3),
        "umbral_fijo_91_lpm_disparado_pct": pct(fijo),
    }


def _lote_control(n_misiones, semilla, cusum_k=CUSUM_K, cusum_h=CUSUM_H):
    """Misiones sin anomalías: falsas alarmas por tripulante y semana, y alerta por azar en la ventana de A1."""
    rng = random.Random(semilla)
    falsas_1_14 = falsas_15_30 = con_falsa = azar = 0
    for _ in range(n_misiones):
        entorno, tripulantes = generar_mision(rng)
        medicas = [a for a in evaluar_mision(entorno, tripulantes, cusum_k, cusum_h) if _es_medica(a)]
        con_falsa += bool(medicas)
        falsas_1_14 += sum(a["dia_mision"] <= DIA_FIN_ADAPTACION for a in medicas)
        falsas_15_30 += sum(a["dia_mision"] > DIA_FIN_ADAPTACION for a in medicas)
        azar += any(a["tripulante_id"] == "trip-1" and a["capa"] in ("B", "C")
                    and A1_DIA_INICIO <= a["dia_mision"] <= A1_DIA_FIN for a in medicas)
    semanas_1_14 = n_misiones * TRIPULANTES_POR_MISION * (DIA_FIN_ADAPTACION / 7.0)
    semanas_15_30 = n_misiones * TRIPULANTES_POR_MISION * ((DIAS_VUELO - DIA_FIN_ADAPTACION) / 7.0)
    return {
        "misiones": n_misiones,
        "misiones_con_falsa_alarma_pct": round(100.0 * con_falsa / n_misiones, 2),
        "alerta_por_azar_en_ventana_A1_pct": round(100.0 * azar / n_misiones, 2),
        "falsas_por_tripulante_semana_dias_1_14": round(falsas_1_14 / semanas_1_14, 4),
        "falsas_por_tripulante_semana_dias_15_30": round(falsas_15_30 / semanas_15_30, 4),
    }


def barrer(n_misiones=200, semilla=SEMILLA_DEFECTO, ks=(0.5, 0.75, 1.0), hs=(4.0, 5.0, 6.0)):
    """Barrido de k y h del CUSUM (§5.1): falsas alarmas en control y detección de A1 por combinación."""
    filas = []
    for k in ks:
        for h in hs:
            control = _lote_control(n_misiones, semilla + 5, k, h)
            anomalia = _lote_anomalias(n_misiones, semilla + 1, 1.0, k, h)
            filas.append({
                "k": k,
                "h": h,
                "falsas_por_tripulante_semana_dias_15_30": control["falsas_por_tripulante_semana_dias_15_30"],
                "alerta_por_azar_en_ventana_A1_pct": control["alerta_por_azar_en_ventana_A1_pct"],
                "A1_deriva_deteccion_pct": anomalia["A1_deriva_deteccion_pct"],
                "A1_dias_hasta_alerta_mediana": anomalia["A1_dias_hasta_alerta_mediana"],
            })
    return {"misiones_por_combinacion": n_misiones, "semilla": semilla, "elegidos": {"k": CUSUM_K, "h": CUSUM_H},
            "barrido": filas}


def ejecutar_simulacion(n_misiones=500, semilla=SEMILLA_DEFECTO):
    """Protocolo completo: n misiones con anomalías y n de control, mitad de intensidad y segunda semilla."""
    caso = generar_caso_referencia(semilla=semilla)
    kpi = {
        "protocolo": "informe-tecnico-5.5",
        "semilla_principal": semilla,
        "semilla_validacion": SEMILLA_SECUNDARIA,
        "n_misiones_anomalia": n_misiones,
        "n_misiones_control": n_misiones,
        "generado": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "supuestos": SUPUESTOS,
        "parametros": {"cusum_k": CUSUM_K, "cusum_h": CUSUM_H, "z_fisiologico": Z_UMBRAL_FISIOLOGICO,
                       "z_conductual": Z_UMBRAL_CONDUCTUAL, "dias_consecutivos_b": DIAS_CONSECUTIVOS_B},
        "resultados": {
            "anomalias": _lote_anomalias(n_misiones, semilla + 1),
            "anomalias_media_intensidad": _lote_anomalias(n_misiones, semilla + 4, intensidad=0.5),
            "control_sin_anomalias": _lote_control(n_misiones, semilla + 5),
            "validacion_independiente_2027": {
                "anomalias": _lote_anomalias(n_misiones, SEMILLA_SECUNDARIA + 1),
                "control_sin_anomalias": _lote_control(n_misiones, SEMILLA_SECUNDARIA + 5),
            },
        },
    }
    return caso, kpi


def publicar_simulacion(n_misiones=500, semilla=SEMILLA_DEFECTO):
    """Genera y persiste `caso_referencia.json` y `kpi.json` en `gold/` con SHA-256."""
    caso, kpi = ejecutar_simulacion(n_misiones=n_misiones, semilla=semilla)
    entrada_caso = reanclaje.guardar(
        "caso_referencia",
        caso,
        tipo="simulacion",
        semilla=semilla,
        alertas=len(caso["alertas_esperadas"]),
    )
    entrada_kpi = reanclaje.guardar(
        "kpi",
        kpi,
        tipo="simulacion",
        semilla=semilla,
        misiones=n_misiones,
    )
    return {"caso_referencia": entrada_caso, "kpi": entrada_kpi, "resumen_kpi": kpi["resultados"]}


def publicar_barrido(n_misiones=200, semilla=SEMILLA_DEFECTO):
    """Persiste el barrido de k y h en `gold/barrido.json`."""
    datos = barrer(n_misiones=n_misiones, semilla=semilla)
    entrada = reanclaje.guardar("barrido", datos, tipo="simulacion", semilla=semilla, misiones=n_misiones)
    return {"barrido": entrada, "tabla": datos["barrido"]}
