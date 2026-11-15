"""Trayectoria de la nave en el tránsito Tierra→Marte (diseño: docs/superpowers/specs/2026-11-15-viaje-a-marte-design.md).

Transferencia de Hohmann con órbitas circulares coplanares: la nave sale de la Tierra (1 UA) y llega a la órbita de
Marte (1,524 UA) tras media elipse, 259 días. Sol en el origen; el día 0 la Tierra está en (1, 0).
shortcut: sin efemérides reales ni inclinaciones; si se necesitan fechas de lanzamiento reales, usar JPL Horizons.
"""
import math

DIAS_TRANSITO = 259
R_TIERRA_UA = 1.0
R_MARTE_UA = 1.524
SEMIEJE_UA = (R_TIERRA_UA + R_MARTE_UA) / 2
EXCENTRICIDAD = (R_MARTE_UA - R_TIERRA_UA) / (R_MARTE_UA + R_TIERRA_UA)
AÑO_TIERRA_DIAS = 365.25
AÑO_MARTE_DIAS = 686.98
SEGUNDOS_LUZ_POR_UA = 499.0


def _kepler(anomalia_media):
    """Anomalía excéntrica E de M = E - e sin E, por Newton."""
    e = EXCENTRICIDAD
    big_e = anomalia_media if e < 0.8 else math.pi
    for _ in range(50):
        paso = (big_e - e * math.sin(big_e) - anomalia_media) / (1 - e * math.cos(big_e))
        big_e -= paso
        if abs(paso) < 1e-12:
            break
    return big_e


def posicion(dia):
    """Dónde están la nave, la Tierra y Marte el día `dia` (0 = salida, 259 = llegada) y qué retardo hay a la Tierra."""
    m = math.pi * dia / DIAS_TRANSITO  # media órbita en DIAS_TRANSITO días
    big_e = _kepler(m)
    nu = 2 * math.atan2(math.sqrt(1 + EXCENTRICIDAD) * math.sin(big_e / 2), math.sqrt(1 - EXCENTRICIDAD) * math.cos(big_e / 2))
    r = SEMIEJE_UA * (1 - EXCENTRICIDAD * math.cos(big_e))
    x, y = r * math.cos(nu), r * math.sin(nu)
    a_tierra = 2 * math.pi * dia / AÑO_TIERRA_DIAS
    a_marte = math.pi + 2 * math.pi * (dia - DIAS_TRANSITO) / AÑO_MARTE_DIAS  # en la llegada, Marte está donde la nave
    tierra = {"x_ua": R_TIERRA_UA * math.cos(a_tierra), "y_ua": R_TIERRA_UA * math.sin(a_tierra)}
    marte = {"x_ua": R_MARTE_UA * math.cos(a_marte), "y_ua": R_MARTE_UA * math.sin(a_marte)}
    dist_tierra = math.hypot(x - tierra["x_ua"], y - tierra["y_ua"])
    return {
        "dia": dia, "x_ua": x, "y_ua": y, "dist_sol_ua": r, "dist_tierra_ua": dist_tierra,
        "retardo_min": dist_tierra * SEGUNDOS_LUZ_POR_UA / 60, "tierra": tierra, "marte": marte,
    }
