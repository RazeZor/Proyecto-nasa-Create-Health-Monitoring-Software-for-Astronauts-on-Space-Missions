# Módulo `packages/engine`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Motor híbrido de VIGÍA en TypeScript puro: capa A (NEWS2), capa B (desviación personal con mediana y MAD), capa C (CUSUM) y regla de contexto (CO2 con síntomas). Lo usa `apps/web` para recalcular cuerpo, tendencias y alertas con cada registro.

## Puntos clave

- Es el port 1:1 de `evaluar_tripulante` en `pipelines/reanclaje/simulacion.py`. Si cambias una regla o una constante, cámbiala en los dos lados.
- `paridad-referencia.test.ts` compara el motor con `fixtures/caso-referencia.json` (4 tripulantes, 10 alertas). `test_simulacion.py` exige que ese fixture sea idéntico a `generar_caso_referencia()`: si el simulador cambia, regenera el fixture con `json.dump(simulacion.generar_caso_referencia(), ...)`.
- Sin dependencias ni IO. Los tests corren con `node --test packages/engine/*.test.ts` (Node 22.18 o más, que ejecuta TypeScript sin compilar).
- La línea base sale de los días <= 0 (prevuelo); `w(d) = 1 - exp(-d/tau)` desplaza la referencia de FC, PAS y sueño en vuelo. Las claves y los códigos (`fc`, `cefalea`...) son los del API/simulador, no los de la UI: la interfaz traduce en su borde.
- Cambio de instrumento (A.6): `evaluarTripulante(..., { cambiosInstrumento })`. Desde el día del cambio la FC pasa `DIAS_VENTANA_REINICIO` (7) días registrados formando una línea base en vuelo; en ese tiempo se pausan su capa B y su CUSUM (la capa A sigue). Luego se compara contra esa base sin desplazamiento de adaptación. Es opcional y por defecto vacío: el simulador de Python no simula cambios de instrumento, así que la paridad y los KPI no cambian. Si algún día los simula, hay que portar la regla a `simulacion.py`. `apps/web/lib/engine.ts` detecta los cambios con `hrInstrument` de cada registro (`instrumento.test.ts`).
- Brecha conocida frente al plan: el simulador usa pisos `MAD_MIN` y un `w(d)` más simples que los del plan (§4); el motor sigue al simulador porque los KPI del informe se calculan con él.

## Relación con el informe

- §5.1 (reglas del motor) y §5.5 (protocolo de simulación y caso de referencia).

tags: engine, hibrido, news2, mad, cusum, paridad, typescript
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [engine.ts](engine.ts) | 194 | Motor híbrido de VIGÍA (informe §5.1): capa A (NEWS2), capa B (desviación personal con MAD), |
| [instrumento.test.ts](instrumento.test.ts) | 41 | — |
| [paridad-referencia.test.ts](paridad-referencia.test.ts) | 37 | — |

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
- constante `DIAS_VENTANA_REINICIO`
- interfaz `Lectura`
- interfaz `Tripulante`
- interfaz `EntornoDia`
- tipo `Capa`
- interfaz `CambioInstrumento`
- interfaz `OpcionesMotor`
- interfaz `Alerta`
- constante `factorAdaptacion`
- función `mediana`
- función `madBruto`
- función `puntosNews2`
- función `evaluarTripulante`

### Dependencias

- Internas: `./engine.ts`, `./fixtures/caso-referencia.json`
- Externas: ninguna
- Biblioteca estándar: `node:assert/strict`, `node:test`

### Tests

- `packages/engine/instrumento.test.ts`: 0 pruebas
- `packages/engine/paridad-referencia.test.ts`: 0 pruebas
<!-- CONTEXT:AUTO:END -->
