# Viaje a Marte Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un único tránsito Tierra→Marte de 259 días en el modo demo, con la posición de la nave cada día y el entorno (retardo, dosis, protones, CO2) ligado a ella.

**Architecture:** Python calcula la trayectoria (Hohmann + Kepler) y el caso del viaje (misión de 4 tripulantes × 259 días con entorno modelado); se publica como fixture `packages/engine/fixtures/caso-viaje.json`. La API sirve ese caso en modo demo con la posición por día; la web solo dibuja (SVG) y alarga el selector de día.

**Tech Stack:** Python estándar (`pipelines/reanclaje`, `unittest`), FastAPI (`apps/api`), TypeScript/Next (`apps/web`), `packages/engine` (sin cambios de reglas).

**Spec:** `docs/superpowers/specs/2026-11-15-viaje-a-marte-design.md`

## Global Constraints

- Idioma: español en código, comentarios y commits (infinitivo). Rama `cambios-jose`; nada a `main`; no hacer push.
- `pipelines/reanclaje` solo biblioteca estándar. Todo determinista por semilla (`SEMILLA_DEFECTO = 2026`).
- No cambiar ninguna regla del motor (`simulacion.py` ↔ `packages/engine/engine.ts`); el caso de 30 días y `caso-referencia.json` quedan intactos.
- i18n: toda clave nueva primero en `packages/i18n/locales/es.json`, luego `apps/web/lib/strings.ts`; `en.json` opcional.
- Al terminar: `python tools/contextgen/contextgen.py` + `--check`, y MODULE.md manual al día (apps/web, apps/api, pipelines/reanclaje).
- Constantes: Tierra 1 UA, Marte 1,524 UA, semieje 1,262 UA, tránsito 259 días, c = 499,0 s/UA, dosis de fondo ≈ 1,8 mSv/día.

## Review Focus

- Día 0 y día 259 de la trayectoria: la nave en la Tierra y en la órbita de Marte (sin saltos ni NaN).
- La ecuación de Kepler converge también cerca del perihelio y del afelio.
- Dosis acumulada estrictamente creciente y coherente con 259 × ~1,8 mSv (≈ 470 mSv, límite de carrera aparte).
- El fixture del viaje pesa poco (compactar el JSON) y se regenera idéntico con la misma semilla.
- Selector de día con 259 días: ±1 no basta en pantalla táctil; hay que poder saltar.
- Las gráficas y la descomposición de series con 259 puntos siguen legibles.

---

### Task 1: Trayectoria Hohmann

**Files:**
- Create: `pipelines/reanclaje/trayectoria.py`
- Test: `pipelines/reanclaje/test_trayectoria.py`

**Interfaces:**
- Produces: `DIAS_TRANSITO = 259`; `posicion(dia: int) -> dict` con claves `dia`, `x_ua`, `y_ua`, `dist_sol_ua`, `dist_tierra_ua`, `retardo_min`, `tierra: {x_ua, y_ua}`, `marte: {x_ua, y_ua}`. Día 0 = salida (nave en la Tierra), día 259 = llegada. Sol en el origen.

- [ ] **Step 1: Tests** (`test_trayectoria.py`): `test_dia_0_la_nave_esta_en_la_tierra` (dist_tierra < 1e-6 UA, dist_sol ≈ 1,0); `test_dia_259_la_nave_esta_en_marte` (distancia nave–Marte < 1e-3 UA, dist_sol ≈ 1,524); `test_distancia_al_sol_crece_sin_saltos` (monótona en 0..259, paso < 0,01 UA/día); `test_retardo_dentro_del_perfil` (3 ≤ retardo_min ≤ 22 para dia 1..259 y retardo = dist_tierra × 499,0 / 60); `test_es_determinista` (dos llamadas iguales).
- [ ] **Step 2:** `python3 -m unittest pipelines/reanclaje/test_trayectoria.py` → falla (módulo no existe).
- [ ] **Step 3: Implementar `posicion(dia: int) -> dict`.** Elipse de Hohmann con perihelio en la Tierra (r=1) y afelio en Marte (r=1,524); anomalía media lineal en el tiempo (media órbita en 259 d), Kepler por Newton (tolerancia 1e-12, máx. 50 iteraciones); Tierra circular a 360/365,25 °/día; Marte circular con periodo 686,98 d y fase tal que en el día 259 coincide con la nave (la nave llega a ángulo 180° respecto de la salida).
- [ ] **Step 4:** el mismo comando → pasa.
- [ ] **Step 5: Commit** `Calcular la trayectoria de Hohmann Tierra-Marte`.

### Task 2: Caso del viaje (generador, fixture, esquema y paridad)

**Files:**
- Modify: `pipelines/reanclaje/simulacion.py` (parametrizar `generar_mision`, `_entorno_sintetico_mision`, `_generar_tripulante` por `dias_vuelo` y días de anomalías; añadir `generar_caso_viaje`), `pipelines/reanclaje/index.py` (subcomando `viaje`), `packages/schemas/caso-referencia.schema.json` (campos opcionales `trayectoria` y, en `entorno_diario`, `dosis_msv_dia` y `dosis_acumulada_msv`)
- Create: `packages/engine/fixtures/caso-viaje.json` (generado, JSON compacto)
- Test: `pipelines/reanclaje/test_simulacion.py`, `packages/engine/paridad-referencia.test.ts`

**Interfaces:**
- Consumes: `trayectoria.posicion`, `DIAS_TRANSITO`.
- Produces: `generar_caso_viaje(semilla=SEMILLA_DEFECTO) -> dict` con el esquema de `caso_referencia` más `trayectoria: [posicion(d) for d in 1..259]` y, por día en `entorno_diario`, `dosis_msv_dia` y `dosis_acumulada_msv`. `dias_vuelo = 259`. Anomalías: A2 (CO2) día 60, A1 (deriva de trip-1) días 100–120, A3 (tormenta) días 110–111. Con los parámetros por defecto, `generar_caso_referencia` devuelve exactamente lo de antes.

- [ ] **Step 1: Tests:** `test_caso_viaje_tiene_259_dias_y_cumple_esquema`; `test_caso_viaje_es_determinista`; `test_anomalias_del_viaje_en_su_dia` (alertas esperadas incluyen capa C de trip-1 entre los días 100 y 125, y pico de CO2 el día 60); `test_dosis_acumulada_crece_y_cuadra` (monótona; 259 × 1,6..2,0 mSv); `test_el_fixture_de_caso_viaje_es_el_generado`; `test_caso_referencia_no_cambia` (el test de fixture existente sigue pasando). En `paridad-referencia.test.ts`: la misma comprobación del motor TS contra `caso-viaje.json` (mismas alertas que `alertas_esperadas`).
- [ ] **Step 2:** correr los tests de Python y `node --experimental-strip-types --test packages/engine/*.test.ts` → fallan.
- [ ] **Step 3: Implementar.** Parametrizar con un `dict` de días de anomalías (`ANOMALIAS_REFERENCIA` = los valores actuales) y `dias_vuelo`. Entorno del viaje: CO2 y protones de fondo como hoy; dosis diaria 1,8 mSv con modulación lenta (±8 %) y ruido acotado; en los días de tormenta, suma de la dosis del evento. `index.py viaje` escribe `gold/caso_viaje.json` y el fixture compacto (`separators=(",", ":")`). Confirmar el peso del fixture (esperado < 600 KB).
- [ ] **Step 4:** los comandos del paso 2 → pasan. Comprobar que `git diff packages/engine/fixtures/caso-referencia.json` está vacío.
- [ ] **Step 5: Commit** `Generar el caso del viaje a Marte de 259 días`.

### Task 3: API: demo sobre el viaje

**Files:**
- Modify: `apps/api/rutas_dashboard.py` (`_CASO` → `caso-viaje.json`, `DIA_ACTUAL_DEMO = 130`, `_entorno_demo` copia `posicion`, `retardo_min`, `dosis_*`), `apps/api/AGENTES.md`, `apps/api/test_api_dashboard.py`, `apps/api/test_api.py` si depende de los 30 días
- Test: `apps/api/test_api_dashboard.py`

**Interfaces:**
- Consumes: `caso-viaje.json` (Task 2).
- Produces: `GET /tripulantes/{id}/historial?modo=demo` devuelve `dias_vuelo: 259`, `dia_actual: 130` y, en cada fila de `entorno_diario`, `posicion` (el dict de Task 1 sin `tierra`/`marte` si pesa, o completo) y `dosis_msv_dia`, `dosis_acumulada_msv`; modo real sin cambios.

- [ ] **Step 1: Tests:** actualizar el assert existente a `("demo", "Simulado", 259, 130)`; `test_historial_demo_trae_la_posicion_de_cada_dia` (día 1 y día 259 con `retardo_min` dentro de 3–22 y `dosis_acumulada_msv` creciente); `test_historial_real_no_cambia` (el existente).
- [ ] **Step 2:** `cd apps/api && python -m unittest discover -s .` (venv del scratchpad) → falla.
- [ ] **Step 3: Implementar** los cambios de `rutas_dashboard.py`; el escenario de entorno `mision-vigia` (eventos reales reanclados) se mantiene sobre los días de la tormenta del viaje: reanclar sus `dia_mision` en el escenario (`pipelines/reanclaje/escenarios/mision-vigia.json`) a días ~110 y regenerar el gold. Documentar la ruta en `AGENTES.md`.
- [ ] **Step 4:** todos los tests de la API → pasan.
- [ ] **Step 5: Commit** `Servir el viaje a Marte en el modo demo`.

### Task 4: Web: trayectoria, selector largo y retardo por posición

**Files:**
- Modify: `apps/web/lib/catalogo.ts` (tipos: `posicion`, `dosis_*` en `EntornoDia`), `apps/web/components/environment/environment-view.tsx` (monta la tarjeta; dosis y retardo del día desde el viaje si vienen), `apps/web/components/crew/historico.tsx` (mini de trayectoria y selector con saltos), `packages/i18n/locales/es.json` y `apps/web/lib/strings.ts`
- Create: `apps/web/components/environment/trayectoria-marte.tsx`
- Test: `apps/web/lib/catalogo.test.ts` (o el test de lib que corresponda)

**Interfaces:**
- Consumes: `historial.entorno_diario[d].posicion` (Task 3).
- Produces: `<TrayectoriaMarte dia={number} mini?={boolean} />` (SVG: Sol, órbitas de Tierra y Marte, arco de la nave, marcadores y, si no es mini, lecturas: día X/259, distancia a la Tierra en UA y km, retardo en min, dosis acumulada en mSv).

- [ ] **Step 1: Test** (lib, sin DOM): una función pura `lecturaDeTrayecto(entorno, dia)` que devuelve `{distanciaTierraUa, retardoMin, dosisAcumuladaMsv} | null` (null si ese día no trae posición, p. ej. el modo real); casos: día con posición, día sin posición, día fuera de rango.
- [ ] **Step 2:** `node --experimental-strip-types --test apps/web/lib/*.test.ts` → falla.
- [ ] **Step 3: Implementar** la función en `lib/`, el componente (`viewBox` fijo, colores por tokens, `role="img"` con `aria-label` de la lectura; en mini solo el dibujo), las claves `S.trayecto.*` (es primero), la tarjeta en Entorno (solo si hay posición) y el mini en Histórico. Selector del Histórico: añadir botones ±7 días (y mantener ±1) de al menos 44 px, o un `input type="range"`; el que sea más corto con `Ayuda` ya existente. Revisar que `TrendsView`/`LineChart` aguantan 259 puntos (ejes y etiquetas).
- [ ] **Step 4:** tests web + `pnpm exec tsc --noEmit` + `pnpm build` (con `VIGIA_API_INTERNA=http://127.0.0.1:8001 NEXT_PUBLIC_VIGIA_TRIPULANTE=1`) → pasan; probar en el navegador (tablet): Entorno muestra la trayectoria en el día 130; Histórico llega al 259 con los saltos.
- [ ] **Step 5: Commit** `Dibujar la trayectoria a Marte y alargar el Histórico`.

### Task 5: Documentación y verificación final

**Files:**
- Modify: `pipelines/reanclaje/MODULE.md`, `apps/api/MODULE.md`, `apps/web/MODULE.md` (puntos clave del bloque MANUAL), `docs/CONVENCIONES.md` solo si algo choca

- [ ] **Step 1:** actualizar los puntos clave (viaje de 259 días, fixture, posición en la API, trayectoria en Entorno, saltos en el selector).
- [ ] **Step 2:** correr `python tools/contextgen/contextgen.py` y `--check`; todas las suites (reanclaje, API con el venv del scratchpad, engine, web lib, i18n, `tsc`, `pnpm build`).
- [ ] **Step 3: Commit** `Documentar el viaje a Marte`. No hacer push.
