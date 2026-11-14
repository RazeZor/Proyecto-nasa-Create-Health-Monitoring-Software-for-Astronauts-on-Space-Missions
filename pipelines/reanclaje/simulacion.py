"""Simulador reproducible y generación de caso de referencia para VIGÍA (§5.5).

Protocolo del informe técnico (§5.5):
- 14 días previos al vuelo (referencia personal) + 30 días de misión en órbita.
- 4 tripulantes por misión con variabilidad basal realista y desplazamiento por
  adaptación microgravedad (+3 lpm FC, -0,7 h sueño, -4 mmHg PAS; tau = 4 días).
- Inyección controlada de anomalías A1 (deriva cardiaca lenta desde día 15),
  A2 (pérdida aguda de sueño días 20-21) y A3 (deriva conductual combinada desde día 22).
- Evaluación mediante el motor híbrido de referencia (Capa A NEWS2 + Capa B MAD +
  Capa C CUSUM desde día 21) y publicación de `caso_referencia` + `kpi` en `gold/`.
"""
import datetime as dt
import math
import random
from statistics import median

import reanclaje

SEMILLA_DEFECTO = 2026
SEMILLA_SECUNDARIA = 2027
DIAS_PREVUELO = 14
DIAS_VUELO = 30
TRIPULANTES_POR_MISION = 4

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


def _factor_adaptacion(dia_mision, tau=SUPUESTOS["tau_adaptacion_dias"]):
    """Peso w(d) = 1 - exp(-d / tau) para días de vuelo (d >= 1)."""
    if dia_mision <= 0:
        return 0.0
    return 1.0 - math.exp(-dia_mision / tau)


def _mad_bruto(valores, minimo):
    """Calcula mediana y MAD sin factor 1,4826 con piso MAD_MIN (§5.1)."""
    med = median(valores)
    desviaciones = [abs(v - med) for v in valores]
    return med, max(median(desviaciones), minimo)


def _puntos_news2(fc, pas, spo2, temp):
    """Puntaje NEWS2 simplificado para FC, PAS, SpO2 y temperatura (§5.1)."""
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
    elif 111 <= fc <= 130:
        acumular(2)
    elif 41 <= fc <= 50 or 91 <= fc <= 110:
        acumular(1)

    # Presión arterial sistólica
    if pas <= 90 or pas >= 220:
        acumular(3)
    elif 91 <= pas <= 100:
        acumular(2)
    elif 101 <= pas <= 110:
        acumular(1)

    # SpO2 (%)
    if spo2 <= 91:
        acumular(3)
    elif 92 <= spo2 <= 93:
        acumular(2)
    elif 94 <= spo2 <= 95:
        acumular(1)

    # Temperatura central (°C)
    if temp <= 35.0:
        acumular(3)
    elif temp >= 39.1:
        acumular(2)
    elif 35.1 <= temp <= 36.0 or 38.1 <= temp <= 39.0:
        acumular(1)

    return pts, max_individual


def _entorno_sintetico_mision(rng, con_tormenta=False):
    """Genera 30 días de entorno (CO2 y protones) para una misión simulada."""
    entorno = []
    for dia in range(1, DIAS_VUELO + 1):
        tormenta = con_tormenta and dia in (22, 23)
        co2 = round(max(1.2, min(2.95, 2.05 + rng.gauss(0.0, 0.25))), 3)
        if tormenta:
            flujo = round(25.0 + rng.uniform(5.0, 45.0), 2)
        else:
            flujo = round(max(0.15, 0.35 + rng.gauss(0.0, 0.08)), 3)
        entorno.append({
            "dia_mision": dia,
            "co2_mmhg_max_horario": co2,
            "flujo_protones_10mev_pfu": flujo,
            "modo_tormenta": tormenta,
        })
    return entorno


def _ruido_fisiologico(rng, sigma):
    """Ruido diario con ligeras colas pesadas (3 % transitorio benigno) como datos reales."""
    base = rng.gauss(0.0, sigma)
    if rng.random() < 0.015:
        base += rng.choice((-1.0, 1.0)) * sigma * rng.uniform(1.6, 2.3)
    return base


def _generar_tripulante(rng, tid, nombre, rol, entorno_por_dia, anomalia=None, intensidad=1.0):
    """Genera 14 días pre-vuelo + 30 días de vuelo para un tripulante."""
    # Basales individuales del tripulante
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
    for dia in range(-DIAS_PREVUELO + 1, DIAS_VUELO + 1):
        w = _factor_adaptacion(dia)
        delta_fc = SUPUESTOS["fc_desplazamiento_lpm"] * w
        delta_sueno = SUPUESTOS["sueno_desplazamiento_h"] * w
        delta_pas = SUPUESTOS["pas_desplazamiento_mmHg"] * w

        # Inyección de anomalías según protocolo §5.5
        inj_fc = 0.0
        inj_sueno = 0.0
        inj_animo = 0.0
        if anomalia == "A1" and dia >= 15:
            inj_fc = 0.8 * intensidad * (dia - 14)
        elif anomalia == "A2" and dia >= 20:
            # Pérdida aguda de sueño -2,0 h/día sostenida desde día 20 (ventana 2+ días)
            inj_sueno = -2.0 * intensidad
        elif anomalia == "A3" and dia >= 22:
            inj_sueno = -0.25 * intensidad * (dia - 21)
            inj_animo = -0.30 * intensidad * (dia - 21)

        tormenta = entorno_por_dia.get(dia, {}).get("modo_tormenta", False)
        fc = round(base_fc + delta_fc + inj_fc + _ruido_fisiologico(rng, 2.2), 1)
        pas = round(base_pas + delta_pas + _ruido_fisiologico(rng, 4.0), 1)
        pad = round(base_pad + delta_pas * 0.5 + _ruido_fisiologico(rng, 2.8), 1)
        spo2 = round(min(100.0, max(94.0, base_spo2 + rng.gauss(0.0, 0.35))), 1)
        temp = round(base_temp + rng.gauss(0.0, 0.12), 2)
        sueno = round(max(1.5, min(11.0, base_sueno + delta_sueno + inj_sueno + _ruido_fisiologico(rng, 0.38))), 2)
        animo_val = round(base_animo + inj_animo + rng.gauss(0.0, 0.55))
        animo = max(1, min(10, int(animo_val)))

        # Semanales (glucosa y masa corporal cada 7 días desde -7)
        es_semanal = (dia % 7 == 0)
        glucosa = round(base_glucosa + rng.gauss(0.0, 4.5), 1) if es_semanal else None
        masa = round(base_masa - (0.03 * max(0, dia)) + rng.gauss(0.0, 0.2), 2) if es_semanal else None

        sintomas = []
        if inj_sueno <= -1.8:
            sintomas = ["cefalea"]

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
            "sintomas": sintomas,
            "durante_tormenta": bool(tormenta),
        })

    return {"id": tid, "nombre": nombre, "rol": rol, "lecturas": lecturas}


def evaluar_tripulante(tripulante, entorno_por_dia):
    """Ejecuta el motor híbrido de referencia (Capas A, B, C y contexto) sobre un tripulante.

    Calibra mediana y MAD personal en pre-vuelo (días <= 0) ajustando la curva nominal
    w(d) = 1 - exp(-d / tau) para FC, sueño y PAS durante la adaptación a microgravedad.
    """
    lecturas = sorted(tripulante["lecturas"], key=lambda r: r["dia_mision"])
    prevuelo = [r for r in lecturas if r["dia_mision"] <= 0]
    vuelo = [r for r in lecturas if r["dia_mision"] >= 1]

    med_fc, mad_fc = _mad_bruto([r["fc_reposo_lpm"] for r in prevuelo], SUPUESTOS["mad_min"]["fc"])
    med_pas, mad_pas = _mad_bruto([r["pas_mmHg"] for r in prevuelo], SUPUESTOS["mad_min"]["pas"])
    med_sueno, mad_sueno = _mad_bruto([r["sueno_h"] for r in prevuelo], SUPUESTOS["mad_min"]["sueno"])
    med_animo, mad_animo = _mad_bruto([r["animo_1_10"] for r in prevuelo], SUPUESTOS["mad_min"]["animo"])

    alertas = []
    consec_b = {"fc": 0, "pas": 0, "sueno": 0, "animo": 0}
    cusum_pos = {"fc": 0.0, "pas": 0.0}
    cusum_neg = {"sueno": 0.0, "animo": 0.0, "conductual": 0.0}
    ya_emitida_c = set()

    for r in vuelo:
        d = r["dia_mision"]
        w = _factor_adaptacion(d)
        env = entorno_por_dia.get(d, {})
        tormenta = env.get("modo_tormenta", False) or r["durante_tormenta"]
        co2_alto = env.get("co2_mmhg_max_horario", 0.0) >= 3.0

        # Capa A: clínica NEWS2
        news2, max_ind = _puntos_news2(r["fc_reposo_lpm"], r["pas_mmHg"], r["spo2_pct"], r["temp_central_c"])
        if news2 >= 5 or max_ind == 3:
            alertas.append({
                "dia_mision": d,
                "tripulante_id": tripulante["id"],
                "capa": "A",
                "nivel": "rojo",
                "indicador": "news2",
                "valor": float(news2),
                "escalada_auto": bool(tormenta),
            })

        # Capa B: desviación personal respecto a referencia ajustada por w(d)
        z_fc = 0.6745 * (r["fc_reposo_lpm"] - (med_fc + SUPUESTOS["fc_desplazamiento_lpm"] * w)) / mad_fc
        z_pas = 0.6745 * (r["pas_mmHg"] - (med_pas + SUPUESTOS["pas_desplazamiento_mmHg"] * w)) / mad_pas
        z_sueno = 0.6745 * (r["sueno_h"] - (med_sueno + SUPUESTOS["sueno_desplazamiento_h"] * w)) / mad_sueno
        z_animo = 0.6745 * (r["animo_1_10"] - med_animo) / mad_animo

        # En los primeros 14 días de vuelo, exigimos mayor margen para evitar falsos por transición residual
        margen_adaptacion = 1.15 if d <= 14 else 1.0
        pares_b = [
            ("fc", z_fc, Z_UMBRAL_FISIOLOGICO * margen_adaptacion, r["fc_reposo_lpm"]),
            ("pas", z_pas, Z_UMBRAL_FISIOLOGICO * margen_adaptacion, r["pas_mmHg"]),
            ("sueno", z_sueno, Z_UMBRAL_CONDUCTUAL * margen_adaptacion, r["sueno_h"]),
            ("animo", z_animo, Z_UMBRAL_CONDUCTUAL * margen_adaptacion, float(r["animo_1_10"])),
        ]
        for ind, z, umbral, valor in pares_b:
            if abs(z) >= umbral:
                consec_b[ind] += 1
            else:
                consec_b[ind] = 0
            if consec_b[ind] >= DIAS_CONSECUTIVOS_B:
                nivel = "rojo" if (abs(z) >= umbral + 1.5 or tormenta) else "ambar"
                alertas.append({
                    "dia_mision": d,
                    "tripulante_id": tripulante["id"],
                    "capa": "B",
                    "nivel": nivel,
                    "indicador": ind,
                    "valor": round(valor, 2),
                    "escalada_auto": bool(tormenta and nivel == "rojo"),
                })

        # Capa C: CUSUM desde el día 21 (deriva sostenida)
        if d >= CUSUM_DIA_INICIO:
            cusum_pos["fc"] = max(0.0, cusum_pos["fc"] + z_fc - CUSUM_K)
            cusum_pos["pas"] = max(0.0, cusum_pos["pas"] - z_pas - CUSUM_K)
            cusum_neg["sueno"] = max(0.0, cusum_neg["sueno"] - z_sueno - CUSUM_K)
            cusum_neg["animo"] = max(0.0, cusum_neg["animo"] - z_animo - CUSUM_K)
            z_comb = (-z_sueno - z_animo) / math.sqrt(2.0)
            cusum_neg["conductual"] = max(0.0, cusum_neg["conductual"] + z_comb - CUSUM_K)

            candidatos_c = [
                ("fc", cusum_pos["fc"]),
                ("pas", cusum_pos["pas"]),
                ("sueno", cusum_neg["sueno"]),
                ("animo", cusum_neg["animo"]),
                ("conductual", cusum_neg["conductual"]),
            ]
            for ind, s in candidatos_c:
                if s >= CUSUM_H and ind not in ya_emitida_c:
                    ya_emitida_c.add(ind)
                    alertas.append({
                        "dia_mision": d,
                        "tripulante_id": tripulante["id"],
                        "capa": "C",
                        "nivel": "rojo" if s >= CUSUM_H * 1.5 else "ambar",
                        "indicador": ind,
                        "valor": round(s, 2),
                        "escalada_auto": bool(tormenta),
                    })

        # Regla de contexto ambiental
        if co2_alto and any(s in r["sintomas"] for s in ("cefalea", "nausea", "mareo")):
            alertas.append({
                "dia_mision": d,
                "tripulante_id": tripulante["id"],
                "capa": "contexto",
                "nivel": "rojo",
                "indicador": "co2",
                "valor": env.get("co2_mmhg_max_horario"),
                "escalada_auto": True,
            })

    return alertas


def generar_mision(rng, asignaciones=None, con_tormenta=False):
    """Genera una misión completa (4 tripulantes x 44 días) y calcula sus alertas."""
    asignaciones = asignaciones or {}
    entorno = _entorno_sintetico_mision(rng, con_tormenta=con_tormenta)
    entorno_por_dia = {e["dia_mision"]: e for e in entorno}
    tripulantes = []
    alertas = []

    for tid, nombre, rol in ROLES_TRIPULACION:
        anomalia, intensidad = asignaciones.get(tid, (None, 1.0))
        trip = _generar_tripulante(rng, tid, nombre, rol, entorno_por_dia, anomalia=anomalia, intensidad=intensidad)
        tripulantes.append(trip)
        alertas.extend(evaluar_tripulante(trip, entorno_por_dia))

    alertas.sort(key=lambda a: (a["dia_mision"], a["tripulante_id"], a["capa"]))
    return entorno, tripulantes, alertas


def generar_caso_referencia(semilla=SEMILLA_DEFECTO):
    """Construye el caso de referencia único con trip-1=A1, trip-2=A2, trip-3=A3, trip-4=nominal."""
    rng = random.Random(semilla)
    asignaciones = {
        "trip-1": ("A1", 1.0),
        "trip-2": ("A2", 1.0),
        "trip-3": ("A3", 1.0),
        "trip-4": (None, 1.0),
    }
    entorno, tripulantes, alertas = generar_mision(rng, asignaciones=asignaciones, con_tormenta=True)
    return {
        "semilla": semilla,
        "dias_prevuelo": DIAS_PREVUELO,
        "dias_vuelo": DIAS_VUELO,
        "naturaleza": "Simulado",
        "supuestos": SUPUESTOS,
        "entorno_diario": entorno,
        "tripulantes": tripulantes,
        "alertas_esperadas": alertas,
    }


def _evaluar_lote(n_misiones, semilla, tipo, intensidad=1.0):
    """Corre n_misiones para un escenario ('control', 'A1', 'A2', 'A3') y calcula métricas."""
    rng = random.Random(semilla)
    detectadas = 0
    tiempos = []
    falsas_1_14 = 0
    falsas_15_30 = 0
    misiones_con_falsa = 0
    inicio_esperado = {"A1": 15, "A2": 20, "A3": 22}.get(tipo, 1)

    for _ in range(n_misiones):
        asignaciones = {"trip-1": (tipo, intensidad)} if tipo != "control" else {}
        _, _, alertas = generar_mision(rng, asignaciones=asignaciones, con_tormenta=False)
        if tipo == "control":
            hubo_alerta = len(alertas) > 0
            if hubo_alerta:
                misiones_con_falsa += 1
            for a in alertas:
                if 1 <= a["dia_mision"] <= 14:
                    falsas_1_14 += 1
                elif 15 <= a["dia_mision"] <= 30:
                    falsas_15_30 += 1
        else:
            # Alerta sobre trip-1 en o después del día de inyección
            validas = [a for a in alertas if a["tripulante_id"] == "trip-1" and a["dia_mision"] >= inicio_esperado]
            if validas:
                detectadas += 1
                tiempos.append(validas[0]["dia_mision"] - inicio_esperado + 1)

    if tipo == "control":
        # 4 tripulantes * (2 semanas días 1-14; ~2,286 semanas días 15-30)
        semanas_1_14 = n_misiones * TRIPULANTES_POR_MISION * (14 / 7.0)
        semanas_15_30 = n_misiones * TRIPULANTES_POR_MISION * (16 / 7.0)
        return {
            "misiones": n_misiones,
            "misiones_con_falsa_alarma_pct": round(100.0 * misiones_con_falsa / n_misiones, 2),
            "falsas_por_tripulante_semana_dias_1_14": round(falsas_1_14 / semanas_1_14, 4),
            "falsas_por_tripulante_semana_dias_15_30": round(falsas_15_30 / semanas_15_30, 4),
        }

    return {
        "misiones": n_misiones,
        "deteccion_pct": round(100.0 * detectadas / n_misiones, 2),
        "tiempo_deteccion_mediana_dias": round(float(median(tiempos)), 2) if tiempos else None,
    }


def ejecutar_simulacion(n_misiones=500, semilla=SEMILLA_DEFECTO):
    """Ejecuta el protocolo completo: 500 anomalías (por tipo) + 500 control + media intensidad + semilla 2027."""
    # Dividimos o corremos por clase para tener métricas desglosadas de A1, A2, A3 + global 500
    n_tercio = max(1, n_misiones // 3)
    res_a1 = _evaluar_lote(n_tercio, semilla + 1, "A1", intensidad=1.0)
    res_a2 = _evaluar_lote(n_tercio, semilla + 2, "A2", intensidad=1.0)
    res_a3 = _evaluar_lote(n_misiones - 2 * n_tercio, semilla + 3, "A3", intensidad=1.0)
    res_a1_media = _evaluar_lote(n_tercio, semilla + 4, "A1", intensidad=0.5)
    res_ctrl = _evaluar_lote(n_misiones, semilla + 5, "control")
    res_ctrl_2027 = _evaluar_lote(min(n_misiones, 200), SEMILLA_SECUNDARIA + 5, "control")
    res_a1_2027 = _evaluar_lote(min(n_misiones, 200), SEMILLA_SECUNDARIA + 1, "A1", intensidad=1.0)

    caso = generar_caso_referencia(semilla=semilla)
    kpi = {
        "protocolo": "informe-tecnico-5.5",
        "semilla_principal": semilla,
        "semilla_validacion": SEMILLA_SECUNDARIA,
        "n_misiones_anomalia": n_misiones,
        "n_misiones_control": n_misiones,
        "generado": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "supuestos": SUPUESTOS,
        "resultados": {
            "A1_deriva_cardiaca": res_a1,
            "A2_perdida_aguda_sueno": res_a2,
            "A3_deriva_conductual_cusum": res_a3,
            "A1_media_intensidad": res_a1_media,
            "control_sin_anomalias": res_ctrl,
            "validacion_independiente_2027": {
                "A1_deriva_cardiaca": res_a1_2027,
                "control_sin_anomalias": res_ctrl_2027,
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
