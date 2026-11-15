# Módulo `packages/engine`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Motor híbrido de VIGÍA en TypeScript puro: capa A (NEWS2), capa B (desviación personal con mediana y MAD), capa C (CUSUM) y reglas de contexto (CO2 con cefalea, modo tormenta). Lo usa `apps/web` para recalcular cuerpo, tendencias y alertas con cada registro.

## Puntos clave

- Es el port 1:1 de `evaluar_tripulante` en `pipelines/reanclaje/simulacion.py`. Si cambias una regla o una constante, cámbiala en los dos lados.
- `paridad-referencia.test.ts` compara el motor con `fixtures/caso-referencia.json` (4 tripulantes; anomalías A1, A2 y A3 de §5.5). `test_simulacion.py` exige que ese fixture sea idéntico a `generar_caso_referencia()`: si el simulador cambia, regenera el fixture con `json.dumps(simulacion.generar_caso_referencia(), indent=1, ensure_ascii=False)`.
- `paridad-referencia.test.ts` también compara el motor con `fixtures/caso-viaje.json` (259 días): el motor no cambia, solo la duración y el calendario de las anomalías.
- Sin dependencias ni IO. Los tests corren con `node --test packages/engine/*.test.ts` (Node 22.18 o más, que ejecuta TypeScript sin compilar).
- Línea base de tierra a vuelo (§5.2): la referencia de cada indicador mezcla la mediana y el MAD del prevuelo (días <= 0) con los de la ventana en vuelo (hasta 14 lecturas desde el día 8, con 3 días de rezago y sin los días que superaron el umbral o tuvieron alerta), con peso `w = min(1, (d - 14) / 7)`. **El motor no usa los desplazamientos de `SUPUESTOS`**: son del generador; aquí solo valen los pisos `mad_min`.
- Reglas (§5.1 y §5.4): capa A roja (un parámetro en tramo extremo o suma >= 5) con `escalada_auto: true` siempre; capa A ámbar con suma 3 o 4. Capa B siempre ámbar; en adaptación (días 1 a 14) sale con `informativa: true` (se muestra, no alerta). Capa C desde el día 21, solo FC al alza y sueño y ánimo a la baja, ámbar, y la suma vuelve a cero al emitir. Contexto: CO2 **mayor** que 3 mmHg con `cefalea` y tormenta (flujo >= 10 pfu o `modo_tormenta` por evento SEP); ambas con `ambito: "tripulacion"`, ámbar y sin escalar.
- Solo en TypeScript (Python evalúa series completas): valores `null` (medida no tomada: no puntúa, no alerta y rompe los dos días seguidos), tripulante sin prevuelo (capa A desde el día 1; B y C cuando la ventana en vuelo llega a 5 lecturas) y cambio de instrumento (A.6): `{ cambiosInstrumento }` descarta la línea base y la ventana de la FC y pausa sus capas B y C `DIAS_VENTANA_REINICIO` (8) días; la capa A sigue.
- `analizarTripulante` devuelve además `referencias` (centro, dispersión, z y peso de vuelo por día): con ellas la interfaz dibuja la banda personal. Las claves y los códigos (`fc`, `cefalea`...) son los de la API y el simulador, no los de la UI.
- Glucosa (semanal) en la capa B: su persistencia son dos medidas seguidas y un día sin medida no la rompe (`SEMANALES`). Síntomas: uno que el entorno no explica (todo salvo `cefalea` con CO2 sobre el límite) da `sintoma_<código>`, ámbar personal de capa `contexto`, sin escalar; la interfaz lo lleva a su zona del cuerpo.
- `series.ts` (`descomponer`) no es parte del motor ni tiene paridad con Python: separa una serie diaria en tendencia (regresión local ±3 días), ciclo semanal (solo con >= 14 días y autocorrelación a 7 días >= 0.3) y residuo, para el histórico de la interfaz. Con < 10 días devuelve null. Tests en `series.test.ts`.
- Pendiente declarado en el informe: masa corporal en la capa C y corrección metrológica de la capa A.

## Relación con el informe

- §5.1 (reglas del motor), §5.2 (línea base de tierra a vuelo), §5.4 (qué escala) y §5.5 (protocolo de simulación y caso de referencia).

tags: engine, hibrido, news2, mad, cusum, paridad, typescript
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [engine.ts](engine.ts) | 289 | Motor híbrido de VIGÍA (informe §5.1 y §5.2): capa A (NEWS2), capa B (desviación personal con MAD), |
| [instrumento.test.ts](instrumento.test.ts) | 41 | — |
| [paridad-referencia.test.ts](paridad-referencia.test.ts) | 114 | — |
| [series.test.ts](series.test.ts) | 45 | — |
| [series.ts](series.ts) | 85 | Descomposición de una serie diaria en tendencia, ciclo y residuo, para el histórico de la interfaz. No es parte del |

### API pública

**engine.ts**

- constante `SUPUESTOS`
- constante `Z_UMBRAL_FISIOLOGICO`
- constante `Z_UMBRAL_CONDUCTUAL`
- constante `DIAS_CONSECUTIVOS_B`
- constante `CUSUM_K`
- constante `CUSUM_H`
- constante `CUSUM_DIA_INICIO`
- constante `CO2_LIMITE_MMHG`
- constante `PROTONES_TORMENTA_PFU`
- constante `DIA_FIN_ADAPTACION`
- constante `DIAS_TRANSICION`
- constante `VENTANA_DIA_INICIO`
- constante `VENTANA_MAX_LECTURAS`
- constante `VENTANA_REZAGO_DIAS`
- constante `VENTANA_MIN_LECTURAS`
- constante `DIAS_VENTANA_REINICIO`
- tipo `IndicadorB`
- interfaz `Lectura`
- interfaz `Tripulante`
- interfaz `EntornoDia`
- tipo `Capa`
- interfaz `CambioInstrumento`
- interfaz `OpcionesMotor`
- interfaz `Alerta`
- interfaz `Referencia`
- función `mediana`
- función `madBruto`
- función `pesoVuelo`
- función `puntosNews2`
- función `analizarTripulante`
- función `evaluarTripulante`

**series.ts**

- interfaz `Punto`
- interfaz `Descomposicion`
- constante `MIN_DIAS_DESCOMPOSICION`
- constante `MIN_DIAS_CICLO`
- constante `UMBRAL_CICLO`
- función `descomponer`

### Dependencias

- Internas: `./engine.ts`, `./fixtures/caso-referencia.json`, `./fixtures/caso-viaje.json`, `./series.ts`
- Externas: ninguna
- Biblioteca estándar: `node:assert/strict`, `node:test`

### Tests

- `packages/engine/instrumento.test.ts`: 0 pruebas
- `packages/engine/paridad-referencia.test.ts`: 0 pruebas
- `packages/engine/series.test.ts`: 0 pruebas
<!-- CONTEXT:AUTO:END -->
