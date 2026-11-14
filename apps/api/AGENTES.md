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

## Ejemplos de respuesta reales

Salidas reales de esta API sobre el gold local (escenarios `dosis-equivalente`, con RadLab ALTEA-Survey, y `panel-demo`, con RadLab DosTel, GOES y EDA RR-1). Se recortaron las listas largas. Los nombres de tu gold pueden ser otros: pídelos con `GET /escenarios` y `GET /paneles`.

`GET /escenarios` y `GET /paneles`
```json
["dosis-equivalente", "ejemplo-radlab-eda", "panel-demo"]
["dosis-equivalente", "panel-demo"]
```

`GET /paneles/dosis-equivalente/dosis`: dosis equivalente de un día completo, sin `orientativa`.
```json
{"tipo": "equivalente", "unidad": "µSv", "orientativa": false, "series": ["ALTEA-Survey"],
 "por_dia": [{"dia_mision": 22, "dosis": 912.7941, "acumulada": 912.7941, "cobertura": 1.0}],
 "porcentaje_limite_carrera": 0.1521}
```
Ese 0.1521 es el porcentaje sobre 600 mSv. El día supera lo típico del informe (0.2 a 0.5 mSv/día); es un día y los datos son preliminares.

`GET /paneles/panel-demo/protones` (primer elemento)
```json
[{"dia_mision": 22, "serie": "G18 >=10 MeV", "max_pfu": 0.3453, "modo_tormenta": false}]
```

`GET /paneles/panel-demo/cabina`: CO2 en ppm y en mmHg por perfil, con el límite de 3 mmHg.
```json
[{"dia_mision": 22, "mision": "RR-1", "co2_ppm_max": 2886.0, "co2_ppm_promedio_horario_max": 2879.9,
  "co2_mmhg_por_perfil": {"estacion": 2.189, "transito": 2.189, "superficie": 1.221},
  "co2_sobre_limite_por_perfil": {"estacion": false, "transito": false, "superficie": false},
  "humidity_iss_max": 70.0, "temperature_iss_max": 26.8}]
```

`GET /escenarios/panel-demo/serie?fuente=goes&dia_mision=22` (primeras 2 filas): cada punto trae las dos horas.
```json
[{"t_mision": "D022T01:55:00", "t_real": "2026-11-13T16:55:00Z", "fuente": "goes", "serie": "G18 >=10 MeV",
  "variable": "flux", "valor": 0.240860253572464, "n": 1, "naturaleza": "Real"},
 {"t_mision": "D022T01:55:00", "t_real": "2026-11-13T16:55:00Z", "fuente": "goes", "serie": "G18 >=100 MeV",
  "variable": "flux", "valor": 0.22888292372226715, "n": 1, "naturaleza": "Real"}]
```

`GET /escenarios/panel-demo/diario?fuente=radlab`: `bins` 12 de 288 = una hora de datos, la dosis es parcial.
```json
[{"dia_mision": 22, "fuente": "radlab", "serie": "DosTel1", "variable": "absorbed_dose_rate",
  "max": 8.195199333333333, "bins": 12, "dosis": 4.458305305555555},
 {"dia_mision": 22, "fuente": "radlab", "serie": "DosTel2", "variable": "absorbed_dose_rate",
  "max": 7.384952333333334, "bins": 12, "dosis": 4.496398388888889}]
```

Errores
```text
GET /paneles/nada                -> 404 {"detail": "no existe el gold «nada»; corre el ETL de pipelines/reanclaje"}
GET /paneles/panel-demo/nada     -> 422 (detail[0].msg: "Input should be 'dosis', 'protones', 'cabina' or 'eventos'")
```
El mensaje 404 sale en el idioma de `VIGIA_LANG` (español por defecto).
