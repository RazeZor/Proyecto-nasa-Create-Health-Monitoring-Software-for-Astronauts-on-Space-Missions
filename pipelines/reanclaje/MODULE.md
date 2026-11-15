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
- Escenario inválido lanza `ValueError` y no escribe nada. Una ventana sin datos curated se omite, se avisa por stderr y queda en `faltan` del gold y del panel; solo si faltan todas falla sin escribir (#27: la ventana GOES de un escenario no se puede volver a descargar). Es idempotente y determinista: mismo escenario y mismo curated dan el mismo archivo y SHA-256.
- Salida: `<DATALAKE_DIR>/gold/<escenario>.json` y `gold/manifest.json` (SHA-256, tamaños y hora por escenario).
- `panel.py` convierte el gold en el panel de entorno (`index.py panel <escenario.json> [destino]`, por defecto `gold/panel-<nombre>.json`): dosis acumulada por día y su porcentaje del límite de carrera de 600 mSv, flujo de protones con `modo_tormenta` (≥10 pfu en ≥10 MeV), y cabina con CO2 en mmHg por perfil (ppm x presión total del perfil: 760, 760 y 424 mmHg), temperatura y humedad. Una sección sin datos queda en `null` o vacía.
- La dosis usa dosis equivalente si el escenario la trae; con dosis absorbida (DosTel, Lidal) va con `orientativa: true` y supone 1 µGy = 1 µSv, que es una cota inferior. `cobertura` es la fracción del día con datos (con 1 h de datos, 0,042): la dosis del día es parcial y no debe leerse como total.
- `ALTEA-Survey` es el único instrumento de RadLab con `dose_equivalent_rate` (408 321 filas, cada minuto, de 2010-09 a 2012-06 en la ISS; revisado con una consulta a toda la base). `escenarios/dosis-equivalente.json` lo usa: un día completo (2011-11-16, cobertura 1,0) da 913 µSv, sin `orientativa`. Ese día está por encima de los 0,2 a 0,5 mSv/día que cita el informe; es un día y los datos son preliminares.
- El panel repite `ventanas` (fuente y fechas reales) y un `aviso`: que series de fechas reales distintas caigan en el mismo día de misión es decisión del escenario, no un hecho observado (§3.4 regla 4).
- GOES separa la serie por satélite (`G18 >=10 MeV`) para no mezclar satélites en el mismo paso.
- Solo biblioteca estándar. CLI: `python3 index.py build escenarios/ejemplo.json`, `index.py panel ...`, `index.py simular [n]` e `index.py barrer [n]`. Sus mensajes de error están en español sin pasar por `packages/i18n`.
- `simulacion.py` implementa el protocolo de §5.5 tal cual: 14 días de prevuelo + 30 de misión, 4 tripulantes, y las anomalías A1 (deriva de sueño, FC y ánimo en trip-1, días 18 a 27), A2 (CO2 de 4,6 mmHg el día 12 con cefalea en trip-2 y trip-3) y A3 (200 pfu los días 22 y 23). El motor de referencia sigue §5.1 y §5.2 (línea base de tierra a vuelo; el detector no conoce los desplazamientos de `SUPUESTOS`, que solo usa el generador). Publica `gold/caso_referencia.json` y `gold/kpi.json` (detección por anomalía, días hasta la alerta, mitad de intensidad, alerta por azar, comparador de 91 lpm y falsas alarmas por tripulante y semana, con segunda semilla). `index.py barrer` publica `gold/barrido.json` (k y h del CUSUM). Las cifras del informe salen de aquí: si cambia una regla, se vuelve a correr y se actualiza el informe; no se ajustan parámetros para recuperar un número.
- Escenarios que usa la app (la API los busca por nombre): `mision-real` es el entorno del modo real, anclado al día 1 de la misión (GOES y DONKI en su fecha real, y RadLab ALTEA-Survey y EDA RR-1 reanclados); `mision-vigia` es el del modo demo (ventanas en los días 18 a 23, con los 14 eventos SEP de mayo de 2024). El servicio de GOES solo guarda 24 horas: hay que reingerir y republicar (`index.py panel`) para que el modo real avance. Una ventana de DONKI ya consultada y sin eventos es un resultado válido (no va a `faltan`); cualquier otra ventana sin datos sí.

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
| [index.py](index.py) | 43 | CLI del ETL de reanclaje. |
| [panel.py](panel.py) | 83 | Panel de entorno (tarjeta del kanban): el gold de un escenario resumido para la app. |
| [reanclaje.py](reanclaje.py) | 161 | ETL de reanclaje (informe §3.4): zona curated del datalake -> zona gold. |
| [simulacion.py](simulacion.py) | 597 | Simulador reproducible y motor híbrido de referencia de VIGÍA (informe §5.1, §5.2 y §5.5). |
| [test_panel.py](test_panel.py) | 76 | — |
| [test_reanclaje.py](test_reanclaje.py) | 106 | — |
| [test_simulacion.py](test_simulacion.py) | 205 | — |
| [test_trayectoria.py](test_trayectoria.py) | 47 | — |
| [trayectoria.py](trayectoria.py) | 46 | Trayectoria de la nave en el tránsito Tierra→Marte (diseño: docs/superpowers/specs/2026-11-15-viaje-a-marte-design.md). |

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
- función `construir(escenario)`: Genera y guarda el gold del escenario. Una ventana sin curated (p. ej. GOES, que solo publica
- función `guardar(clave, datos, destino=None, **resumen)`: Escribe `datos` en gold/<clave>.json (o en `destino`) y lo registra con su SHA-256 en

**simulacion.py**

- función `evaluar_tripulante(tripulante, entorno_por_dia, cusum_k=CUSUM_K, cusum_h=CUSUM_H)`: Motor híbrido de referencia sobre un tripulante: alertas de las capas A, B, C y de contexto.
- función `generar_mision(rng, a1=None, a2=False, a3=False, dias_vuelo=DIAS_VUELO, anomalias=ANOMALIAS_REFERENCIA)`: Genera una misión (entorno y 4 tripulantes x (14 + `dias_vuelo`) días). `a1` = intensidad de la deriva en trip-1.
- función `evaluar_mision(entorno, tripulantes, cusum_k=CUSUM_K, cusum_h=CUSUM_H)`
- función `generar_caso_referencia(semilla=SEMILLA_DEFECTO)`: Caso de referencia: una misión con A1 (trip-1), A2 (trip-2 y trip-3) y A3; trip-4 es nominal.
- función `generar_caso_viaje(semilla=SEMILLA_DEFECTO)`: Caso del viaje a Marte: el tránsito completo (`DIAS_TRANSITO` días) con las tres anomalías en su calendario,
- función `publicar_caso_viaje(destino)`: Escribe el caso del viaje compacto (el fixture de la demo y de la paridad del motor).
- función `barrer(n_misiones=200, semilla=SEMILLA_DEFECTO, ks=(0.5, 0.75, 1.0), hs=(4.0, 5.0, 6.0))`: Barrido de k y h del CUSUM (§5.1): falsas alarmas en control y detección de A1 por combinación.
- función `ejecutar_simulacion(n_misiones=500, semilla=SEMILLA_DEFECTO)`: Protocolo completo: n misiones con anomalías y n de control, mitad de intensidad y segunda semilla.
- función `publicar_simulacion(n_misiones=500, semilla=SEMILLA_DEFECTO)`: Genera y persiste `caso_referencia.json` y `kpi.json` en `gold/` con SHA-256.
- función `publicar_barrido(n_misiones=200, semilla=SEMILLA_DEFECTO)`: Persiste el barrido de k y h en `gold/barrido.json`.

**trayectoria.py**

- función `posicion(dia)`: Dónde están la nave, la Tierra y Marte el día `dia` (0 = salida, 259 = llegada) y qué retardo hay a la Tierra.

### Puntos de entrada

- `pipelines/reanclaje/index.py`

```
python3 index.py build <escenario.json>   curated -> gold (ver escenarios/ejemplo.json)
python3 index.py panel <escenario.json> [destino.json]   gold -> panel de entorno para la app
python3 index.py simular [n_misiones]     genera caso_referencia.json y kpi.json en gold/
python3 index.py viaje                    regenera packages/engine/fixtures/caso-viaje.json (viaje a Marte)
python3 index.py barrer [n_misiones]      barrido de k y h del CUSUM en gold/barrido.json
python3 index.py manifest                 SHA-256 y tamaños de cada escenario generado
```

### Dependencias

- Internas: `panel`, `reanclaje`, `simulacion`, `trayectoria`
- Externas: `datalake`, `validador`
- Biblioteca estándar: `collections`, `datetime`, `hashlib`, `json`, `math`, `pathlib`, `random`, `statistics`, `sys`, `tempfile`, `unittest`

### Tests

- `pipelines/reanclaje/test_panel.py`: 7 pruebas en Panel (6), Publicar (1)
- `pipelines/reanclaje/test_reanclaje.py`: 10 pruebas en Pasos (6), Construir (4)
- `pipelines/reanclaje/test_simulacion.py`: 22 pruebas en Simulacion (3), Reglas (13), FixtureDelMotor (1), CasoViaje (5)
- `pipelines/reanclaje/test_trayectoria.py`: 6 pruebas en TrayectoriaTest (6)
<!-- CONTEXT:AUTO:END -->
