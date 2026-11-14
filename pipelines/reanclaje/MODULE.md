# Módulo `pipelines/reanclaje`

<!-- CONTEXT:MANUAL:START -->
## Propósito

ETL que toma la zona curated de `pipelines/datalake` (GOES, DONKI, RadLab, EDA), reancla cada ventana real a la línea de tiempo de misión y publica la zona gold y el JSON del panel de entorno que consume la app.

## Puntos clave

- Entrada: un escenario JSON (`escenarios/ejemplo.json`) con ventanas `{fuente, desde, hasta, dia_mision}`. Lee solo con `datalake.read()`, nunca los archivos.
- Un corrimiento único por ventana: `desde` cae en 00:00 del `dia_mision`. Se ancla en `desde` y no en la primera marca (el informe dice la primera marca) para que las fuentes con el mismo `desde` y día mantengan su relación real (§3.4 regla 5). Los valores no se escalan ni se suavizan.
- Doble marca en cada punto: `t_real` (UTC) y `t_mision` (`D022T00:05:00` = día de misión 22, 00:05). El origen de la línea de misión es sintético.
- Rejilla de 5 min: máximo en flujo de protones y CO2, promedio en el resto. `n` indica cuántas lecturas entran en cada paso.
- Resumen diario: `max`; `dosis` (tasa de dosis x horas) en las tasas de dosis; `max_prom_horario` en CO2. `bins` cuenta los pasos con datos: con huecos la dosis queda por debajo. DosTel no trae `dose_equivalent_rate`, así que su dosis es absorbida (µGy), orientativa frente al límite de 600 mSv.
- Los eventos de DONKI van aparte (`eventos`), reanclados con el mismo corrimiento. Toda fila lleva `naturaleza: "Real"`; el calendario de misión es escenario y no se genera aquí.
- Falla cerrado: escenario inválido o ventana sin datos curated lanzan `ValueError` y no escriben nada. Es idempotente y determinista: mismo escenario y mismo curated dan el mismo archivo y SHA-256.
- Salida: `<DATALAKE_DIR>/gold/<escenario>.json` y `gold/manifest.json` (SHA-256, tamaños y hora por escenario).
- `panel.py` convierte el gold en el panel de entorno (`index.py panel <escenario.json> [destino]`, por defecto `gold/panel-<nombre>.json`): dosis acumulada por día y su porcentaje del límite de carrera de 600 mSv, flujo de protones con `modo_tormenta` (≥10 pfu en ≥10 MeV), y cabina con CO2 en mmHg por perfil (ppm x presión total del perfil: 760, 760 y 424 mmHg), temperatura y humedad. Una sección sin datos queda en `null` o vacía.
- La dosis usa dosis equivalente si el escenario la trae; con dosis absorbida (DosTel, Lidal) va con `orientativa: true` y supone 1 µGy = 1 µSv, que es una cota inferior. `cobertura` es la fracción del día con datos (con 1 h de datos, 0,042): la dosis del día es parcial y no debe leerse como total.
- `ALTEA-Survey` es el único instrumento de RadLab con `dose_equivalent_rate` (408 321 filas, cada minuto, de 2010-09 a 2012-06 en la ISS; revisado con una consulta a toda la base). `escenarios/dosis-equivalente.json` lo usa: un día completo (2011-11-16, cobertura 1,0) da 913 µSv, sin `orientativa`. Ese día está por encima de los 0,2 a 0,5 mSv/día que cita el informe; es un día y los datos son preliminares.
- El panel repite `ventanas` (fuente y fechas reales) y un `aviso`: que series de fechas reales distintas caigan en el mismo día de misión es decisión del escenario, no un hecho observado (§3.4 regla 4).
- GOES separa la serie por satélite (`G18 >=10 MeV`) para no mezclar satélites en el mismo paso.
- Solo biblioteca estándar. CLI: `python3 index.py build escenarios/ejemplo.json`, `index.py panel ...` y `index.py simular [n]`. Sus mensajes de error están en español sin pasar por `packages/i18n`.
- `simulacion.py` implementa el protocolo reproducible del informe §5.5 (14 días previos al vuelo + 30 días de misión, 4 tripulantes, semilla principal `2026` y validación `2027`, adaptación `w(d) = 1 - exp(-d / 4)`, anomalías `A1`, `A2` y `A3`, motor de referencia NEWS2 + MAD + CUSUM) y publica `gold/caso_referencia.json` y `gold/kpi.json` con `tipo: "simulacion"` en `gold/manifest.json`.
- `escenarios/mision-vigia.json` y `escenarios/tormenta-mayo-2024.json` definen escenarios multi-día reales (5 días continuos de `ALTEA-Survey` / RadLab ISS mayo 2024, 5 días de `EDA RR-1`, 14 eventos `DONKI` SEP de mayo 2024 y serie `GOES-18`).

## Relación con el informe

- §3.4 Sincronización temporal (reanclaje, doble marca, rejilla común, resúmenes diarios). §4.1 flujo de extremo a extremo, §4.2 capa de reanclaje y §5.5 protocolo de simulación reproducible.

tags: etl, reanclaje, gold, rejilla, misión, t_mision, t_real, dosis, co2, flujo-protones, simulacion, kpi
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [index.py](index.py) | 36 | CLI del ETL de reanclaje. |
| [panel.py](panel.py) | 82 | Panel de entorno (tarjeta del kanban): el gold de un escenario resumido para la app. |
| [reanclaje.py](reanclaje.py) | 147 | ETL de reanclaje (informe §3.4): zona curated del datalake -> zona gold. |
| [simulacion.py](simulacion.py) | 468 | Simulador reproducible y generación de caso de referencia para VIGÍA (§5.5). |
| [test_panel.py](test_panel.py) | 71 | — |
| [test_reanclaje.py](test_reanclaje.py) | 87 | — |
| [test_simulacion.py](test_simulacion.py) | 54 | — |

### API pública

**panel.py**

- función `construir_panel(gold)`: Panel de un escenario ya reanclado. Una sección sin datos queda en null o lista vacía.
- función `publicar(escenario, destino=None)`: Reancla el escenario, arma el panel y lo guarda (por defecto en gold/panel-<nombre>.json).

**reanclaje.py**

- función `medidas(fuente, fila)`: (serie, variable, valor) de una fila curada de una fuente con series temporales.
- función `corrimiento(ventana)`: Un único corrimiento por ventana: `desde` cae en 00:00 del día de misión. Así las fuentes
- función `rejilla(fuente, filas, corrimiento)`: Series a 5 minutos sobre la hora de misión.
- función `diario(puntos)`: Resumen por día de misión: máximo, dosis del día (tasas de dosis) y máximo del promedio
- función `eventos(filas, corrimiento)`
- función `validar(escenario)`
- función `construir(escenario)`: Genera y guarda el gold del escenario. Si falta curated en una ventana no escribe nada.
- función `guardar(clave, datos, destino=None, **resumen)`: Escribe `datos` en gold/<clave>.json (o en `destino`) y lo registra con su SHA-256 en

**simulacion.py**

- función `evaluar_tripulante(tripulante, entorno_por_dia)`: Ejecuta el motor híbrido de referencia (Capas A, B, C y contexto) sobre un tripulante.
- función `generar_mision(rng, asignaciones=None, con_tormenta=False)`: Genera una misión completa (4 tripulantes x 44 días) y calcula sus alertas.
- función `generar_caso_referencia(semilla=SEMILLA_DEFECTO)`: Construye el caso de referencia único con trip-1=A1, trip-2=A2, trip-3=A3, trip-4=nominal.
- función `ejecutar_simulacion(n_misiones=500, semilla=SEMILLA_DEFECTO)`: Ejecuta el protocolo completo: 500 anomalías (por tipo) + 500 control + media intensidad + semilla 2027.
- función `publicar_simulacion(n_misiones=500, semilla=SEMILLA_DEFECTO)`: Genera y persiste `caso_referencia.json` y `kpi.json` en `gold/` con SHA-256.

### Puntos de entrada

- `pipelines/reanclaje/index.py`

```
python3 index.py build <escenario.json>   curated -> gold (ver escenarios/ejemplo.json)
python3 index.py panel <escenario.json> [destino.json]   gold -> panel de entorno para la app
python3 index.py simular [n_misiones]     genera caso_referencia.json y kpi.json en gold/
python3 index.py manifest                 SHA-256 y tamaños de cada escenario generado
```

### Dependencias

- Internas: `panel`, `reanclaje`, `simulacion`
- Externas: `datalake`, `validador`
- Biblioteca estándar: `collections`, `datetime`, `hashlib`, `json`, `math`, `pathlib`, `random`, `statistics`, `sys`, `tempfile`, `unittest`

### Tests

- `pipelines/reanclaje/test_panel.py`: 6 pruebas en Panel (5), Publicar (1)
- `pipelines/reanclaje/test_reanclaje.py`: 8 pruebas en Pasos (6), Construir (2)
- `pipelines/reanclaje/test_simulacion.py`: 3 pruebas en Simulacion (3)
<!-- CONTEXT:AUTO:END -->
