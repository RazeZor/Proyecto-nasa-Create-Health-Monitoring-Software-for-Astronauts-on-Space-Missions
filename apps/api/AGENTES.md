# Guía de la API para agentes

API de solo lectura sobre el gold del ETL (`pipelines/reanclaje`). El contrato exacto y siempre al día está en `GET /openapi.json` (y `/docs` para personas); esta guía explica lo que el esquema no dice. Arranque: `uvicorn main:app --port 8000` desde `apps/api`.

## Cómo usarla

1. `GET /escenarios` o `GET /paneles` para saber qué nombres existen. Un nombre desconocido da 404.
2. Para la pantalla de entorno usa el panel; para análisis, el escenario.
3. Pide solo lo que necesitas: `/paneles/{nombre}/dosis` en vez del panel completo, y `/escenarios/{nombre}/serie?variable=flux&dia_mision=22` en vez del escenario entero (la serie tiene cientos de filas).

| Endpoint | Devuelve |
| --- | --- |
| `GET /salud` | `{"estado": "ok"}` |
| `GET /escenarios` | lista de nombres |
| `GET /escenarios/{nombre}` | `escenario`, `ventanas`, `serie5min`, `diario`, `eventos` (filtros: `fuente`, `variable`, `dia_mision`) |
| `GET /escenarios/{nombre}/serie` | puntos de 5 min (mismos filtros) |
| `GET /escenarios/{nombre}/diario` | resumen por día de misión (mismos filtros) |
| `GET /paneles` | lista de nombres (los del escenario del que salen) |
| `GET /paneles/{nombre}` | `limites`, `perfiles_presion_mmhg`, `ventanas`, `aviso`, `dosis`, `protones`, `cabina`, `eventos` |
| `GET /paneles/{nombre}/{seccion}` | `dosis` (objeto o null), `protones`, `cabina` o `eventos` |

Errores: 404 = el ETL no publicó ese nombre como ese tipo (un escenario no se pide como panel, ni al revés); 422 = parámetro inválido (por ejemplo una sección que no existe); 500 = el archivo gold no coincide con su SHA-256 del manifiesto: **no uses esos datos** y avisa.

## Cómo leer los datos (lo que cambia una conclusión)

- **Tiempo:** `t_mision` es `D022T00:05:00` = día de misión 22, 00:05. `t_real` es la hora UTC real del dato. El origen de la línea de misión es sintético.
- **Ventanas mezcladas:** que series de fechas reales distintas (por ejemplo RadLab de 2011 y GOES de 2026) caigan en el mismo día de misión es decisión del escenario, no un hecho observado. Mira `ventanas` y `aviso` antes de correlacionar fuentes.
- **Dosis:** `dosis.tipo` es `equivalente` (µSv) o `absorbida` (µGy). Con `absorbida`, `orientativa` es `true`: se supone 1 µGy = 1 µSv, una cota inferior, así que la comparación con el límite de 600 mSv es solo indicativa. Solo ALTEA-Survey (ISS, 2010 a 2012) da dosis equivalente.
- **Cobertura:** `dosis.por_dia[].cobertura` es la fracción del día con datos (0 a 1). Con 0.042 (una hora de datos) la dosis del día es parcial y **no** es el total del día.
- **`porcentaje_limite_carrera`** ya es un porcentaje (0.1521 = 0.1521 %), sobre 600 mSv.
- **Protones:** `max_pfu` es el máximo del día por serie y satélite (`G18 >=10 MeV`). `modo_tormenta` es `true` si la serie de ≥10 MeV llega a 10 pfu.
- **CO2:** `co2_mmhg_por_perfil` convierte ppm a presión parcial con la presión total de cada perfil (estación 760, tránsito 760, superficie 424 mmHg). El límite es 3 mmHg de promedio en 1 h (`co2_sobre_limite_por_perfil`). No compares ppm con un umbral fijo fuera de la ISS.
- **`diario`:** `bins` es cuántos pasos de 5 min tuvieron datos, de 288 posibles. `max_prom_horario` es el máximo del promedio horario (solo CO2).
- **Secciones vacías:** `protones`, `cabina` y `eventos` pueden ser listas vacías y `dosis` puede ser `null` si el escenario no incluye esa fuente. Vacío no significa «sin riesgo»: significa «sin datos».
- **`naturaleza`:** todo dato medido es `Real`. El calendario de misión es escenario y no lo genera el ETL.
