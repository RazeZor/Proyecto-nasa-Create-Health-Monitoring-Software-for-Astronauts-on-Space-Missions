# Plan Maestro de Implementación por Etapas — VIGÍA (Monorepo)

> **Estado del repositorio analizado el 14/11/2026.**  
> Este plan unifica la especificación científica y funcional de [VIGA-informe-tcnico-para-el-reto-Health-Monitoring-Software-NASA-Space-Apps-2026.md](./VIGA-informe-tcnico-para-el-reto-Health-Monitoring-Software-NASA-Space-Apps-2026.md) (y su PDF) con la arquitectura real del monorepo definida en [AGENTS.md](../AGENTS.md), [docs/ARQUITECTURA.md](../docs/ARQUITECTURA.md) y [docs/CONVENCIONES.md](../docs/CONVENCIONES.md).  
> *(Nota: sustituye al borrador previo [PLAN-IMPLEMENTACION-VIGIA.md](./PLAN-IMPLEMENTACION-VIGIA.md), que fue redactado antes de existir la estructura de monorepo actual).*

---

## Diagnóstico actual del repositorio (línea base real)

### Lo que ya existe y funciona
- **Gobernanza y contexto IA:** `AGENTS.md`, `docs/ARQUITECTURA.md`, `docs/CONVENCIONES.md`, `docs/SETUP.md`, `.githooks/pre-commit`, CI en `.github/workflows/context.yml` y generador `tools/contextgen/contextgen.py`.
- **`pipelines/datalake/` (Python stdlib):** Ingesta y limpieza de `goes`, `donki` (3 URLs en cascada), `radlab` y `eda` (`eda_manual/`), con zonas `raw/` (inmutable) y `curated/` + `manifest.json` (SHA-256) + `EstructuraInesperada`. **7/7 pruebas unitarias en verde.**
- **`packages/i18n/` (Python stdlib + TypeScript puro):** Implementaciones paralelas `i18n.py` e `i18n.ts` con `locales/es.json` (fuente principal obligatoria) y `locales/en.json` (secundario). **8/8 pruebas unitarias en verde.**
- **Entorno Python operativo:** `venv\Scripts\python.exe` (Python 3.14.1).
- **Entorno Node operativo:** Node `v22.12.0` y npm `10.9.0`.

### Hallazgos y brechas detectadas
1. **Faltan los módulos de producto y motor:**
   - `apps/web/` solo contiene `app.tsx` vacío (0 líneas) y `MODULE.md`; falta `package.json`, PWA, Dexie, Recharts y todas las features.
   - `packages/schemas/` no existe aún (contrato JSON Schema entre `pipelines/` y `apps/`).
   - `packages/engine/` no existe aún (motor híbrido A/B/C en TypeScript puro).
   - No existe el pipeline de reanclaje/simulación (`pipelines/reanclaje/`) para producir la zona `gold/` (`caso_referencia.json`, `kpi.json` y series de misión reancladas).
2. **Aún no hay datos ingeridos ni CSVs de EDA:** No existe `pipelines/datalake/data/` ni archivos en `pipelines/datalake/eda_manual/`.
3. **`git` no está en el PATH del equipo:** 2 pruebas de `tools/contextgen/test_contextgen.py` (`test_lint_avisa_todo`, `test_patron_de_carpetas`) y `contextgen.py --lint` fallan con `FileNotFoundError` al invocar `git`. (`--check` sí funciona).
4. **Carpeta residual fuera de patrón:** Existe un directorio `backend/` (contiene únicamente `__pycache__/`, sin código fuente) que conviene eliminar para cumplir `ARQUITECTURA.md`.
5. **Reglas de oro del monorepo a respetar en todas las etapas:**
   - Todo código vive en `apps/`, `pipelines/`, `packages/` o `tools/`.
   - Dependencias: `apps/` y `pipelines/` importan de `packages/`, nunca entre sí ni entre módulos del mismo contenedor; `packages/` es puro y **sin IO**.
   - **Español obligatorio** en código, identificadores, comentarios, commits, `MODULE.md` y claves de `packages/i18n/locales/es.json` (sin strings literales visibles para el usuario).
   - Cada módulo nuevo lleva su `MODULE.md` con bloque `MANUAL` completo (sin TODOs) y bloque `AUTO` regenerado por `contextgen.py`.

---

## ETAPA 0 — Puesta a punto del entorno, limpieza y verificación base (COMPLETADA)

- [x] **0.1 Limpieza estructural:** Eliminada la carpeta residual `backend/` (solo tenía `__pycache__/`).
- [x] **0.2 Entorno `.env`:** Creado `.env` desde `.env.example` (ignorado por git).
- [x] **0.3 Git y pre-commit hook:** Localizado `C:\Program Files\Git\cmd\git.exe`; `test_contextgen.py` (9/9) y `contextgen.py --lint` pasan sin errores.
- [x] **0.4 Verificación base:** `unittest` en verde para `datalake` (7/7), `i18n` (8/8), `contextgen` (9/9) y `contextgen.py --check` sin diferencias.

**Criterio de salida Etapa 0:** Cumplido.

---

## ETAPA 1 — Ingesta real de datos ambientales (`pipelines/datalake`) (COMPLETADA — pendiente solo CSV manual de EDA)

- [x] **1.1 Ingesta en vivo de GOES, DONKI y RadLab:**
  - `goes`: **858 filas** limpias en `>=10`, `>=50` y `>=100 MeV` (`sha256: df3a81bf...`).
  - `donki`: ventana reciente de 30 días (**0 eventos**) + tormenta solar histórica de mayo de 2024 (`2024-05-01` a `2024-05-31`, **14 eventos SEP reales**, `sha256: 30c225b9...`).
  - `radlab`: actualizado `datalake.py` para pedir siempre `instrument_id`, `absorbed_dose_rate` y `dose_equivalent_rate` en la query clave-valor; ingeridos **1 192 registros** de `DosTel1` (ISS, `2022-04-01`), **3 658 registros** de ISS durante la tormenta solar del 10–11 de mayo de 2024 (`DosTel1`, `DosTel2`), y **18 910 registros** de espacio profundo (`BLEO`: `Liulin-MO-AB-Orbit`, `Liulin-MO-CD-Orbit`, `MSL-RAD-Surface`, `CRaTER-D1D2`).
- [ ] **1.2 Descarga manual e ingesta de EDA:**
  - Creada la carpeta `pipelines/datalake/eda_manual/`. Queda lista para depositar el CSV exportado desde [NASA OSDR EDA](https://visualization.osdr.nasa.gov/eda) y correr `python pipelines/datalake/index.py ingest eda` (o si quieres, puedo abrir el portal con el navegador integrado y descargarlo por ti).
- [x] **1.3 Verificación de trazabilidad y secretos:**
  - Verificado `pipelines/datalake/data/manifest.json` con huellas SHA-256, sin claves expuestas y con `t_real` en UTC ISO 8601.

**Criterio de salida Etapa 1:** Las 4 fuentes (`goes`, `donki`, `radlab`, `eda`) ingeridas en `raw/` + `curated/` con `manifest.json` verificado y evidencia de prueba en red real.

---

## ETAPA 2 — Contratos compartidos de datos (`packages/schemas`)

- [ ] **2.1 Crear módulo `packages/schemas/`:**
  - Sin dependencias externas ni IO (solo JSON Schemas + tipos TS / validadores puros).
- [ ] **2.2 Definir contratos y catálogos base (informe §2.4, §3.2, §3.3, §3.4):**
  - `perfiles.schema.json` y `perfiles.json`: los 5 perfiles nominales (`estacion`, `transito`, `transito_acoplado`, `superficie_lunar`, `superficie_marciana`) con `presion_cabina_mmHg`, `o2_pct`, `g_rel`, `co2_unidad`, `co2_limite_mmHg`, `masa_metodo`, `retardo_s` y `detector_radlab`.
  - `lectura.schema.json` y `tipos.ts`: lectura diaria/semanal con unidades, sitio SpO2 (`dedo` | `frente`), método de temperatura, enzima de tira (`deshidrogenasa` | `oxidasa`), instrumento de masa (`SLAMMD` | `BMMD` | `bascula`), fuente FC (`manual` | `simulador` | `galaxy-watch4`), bandera `durante_tormenta` y etiqueta de origen (`Simulado` | `Medido`).
  - `entorno-gold.schema.json`: filas curadas/gold con doble marca (`t_real` UTC + `t_mision`), `origen` (`Real` | `Escenario`), flujo protones, `sepID`, `ppCO2`/`ppm`, temperatura/humedad y dosis (`equivalente` | `absorbida_orientativa`).
  - `fichas.schema.json` y `fichas.json`: las **10 fichas de indicadores** completas con los 6 campos exigidos por el reto (`que_es`, `como_se_mide_en_vuelo` separado por perfil, `por_que`, `peligro`, `cuando_avisar`, `prevencion`) + `referencia_en_vuelo` + `fuentes[]` verificadas.
  - `inspiration4.schema.json` y dataset descriptivo separado (`OSD-569`, `OSD-575`).
- [ ] **2.3 Pruebas y contexto:**
  - `test_schemas.py` (validar que `perfiles.json` y `fichas.json` cumplen sus esquemas y no tienen fuentes vacías).
  - Crear `packages/schemas/MODULE.md` (bloque MANUAL completo) y regenerar con `contextgen.py`.

**Criterio de salida Etapa 2:** Contratos versionados en `packages/schemas`, 10 fichas completas con fuentes y tests en verde.

---

## ETAPA 3 — Pipeline de reanclaje temporal y simulación (`pipelines/reanclaje`)

- [ ] **3.1 Crear módulo `pipelines/reanclaje/` (Python stdlib):**
  - Consume las filas `curated` de `pipelines/datalake` a través de su API pública (`read()`, respetando `docs/ARQUITECTURA.md`) y valida salidas contra `packages/schemas`.
- [ ] **3.2 Reanclaje temporal sin alteración de datos (`reanclaje.py` — informe §3.4):**
  - Toma ventanas continuas reales de GOES, DONKI, RadLab y EDA sin escalar ni inventar puntos.
  - Conserva `t_real` (UTC) junto a `t_mision` (día/hora de misión).
  - Agrega a rejilla común de **5 minutos** y resúmenes **diarios** (`max_flujo_10mev`, `max_co2_horario`, `dosis_dia_msv`, `eventos_sep`).
  - Marca `coherencia_real: true` cuando DONKI, GOES y RadLab provengan de las mismas fechas reales (p. ej. tormenta de mayo 2024) y `"Escenario"` cuando coincidan fuentes de años distintos.
- [ ] **3.3 Simulador de referencia de 500 + 500 misiones (`simulacion.py` — informe §5.5):**
  - Misiones de 14 días pre-vuelo + 30 días en vuelo, 4 tripulantes, semilla `2026` (y segunda semilla `2027`).
  - Supuestos declarados: desplazamiento sostenido (`+3 lpm`, `-0.7 h`, `-4 mmHg`), adaptación aguda con decaimiento `tau = 4 días`.
  - Inyección de anomalías **A1** (días 18–27, deriva cardiovascular/sueño/ánimo + prueba a mitad de intensidad), **A2** (día 12, `4.6 mmHg` CO2 + 2 cefaleas) y **A3** (día 22, flujo `200 pfu` en `>=10 MeV` durante 2 días).
  - Réplica exacta de las reglas del motor híbrido (incluyendo `MAD_MIN`, corrección metrológica de Capa A, glucosa semanal y CUSUM desde día 21) para calcular KPIs honestos.
- [ ] **3.4 Exportación a zona `gold/` y puente hacia `apps/web/public/data/`:**
  - CLI `index.py` que exporta: `entorno_mision.json`, `caso_referencia.json`, `kpi.json`, `inspiration4.json` y `manifest_gold.json` (SHA-256).
  - Copia/publica esos JSON estáticos en `apps/web/public/data/` (ignorando datos pesados de trabajo si aplica, manteniendo fixtures pequeñas para tests).
- [ ] **3.5 Pruebas y contexto:**
  - `test_reanclaje.py` (sin red ni disco real) y `pipelines/reanclaje/MODULE.md` completo + `contextgen.py`.

**Criterio de salida Etapa 3:** Zona `gold/` generada con SHA-256, `caso_referencia.json` y `kpi.json` reales reproducibles, y tests Python en verde.

---

## ETAPA 4 — Motor híbrido puro (`packages/engine`) e i18n completo (`packages/i18n`)

- [ ] **4.1 Crear módulo `packages/engine/` (TypeScript puro, cero IO):**
  - Convenciones estrictas: nombres de archivo en `kebab-case.ts`, funciones/variables en `camelCase` en español, sin llamadas a red, DOM, `localStorage` ni `Date.now()`.
- [ ] **4.2 Submódulos del motor (informe §2.4, §5.1–5.4):**
  - `metrologia.ts`: `calcularPpCO2` (`ppm * presion_cabina_mmHg / 1_000_000`), `corregirMasa` (`lectura / g_rel`), detección de cambio de instrumento/sitio para reiniciar ventana en vuelo del indicador.
  - `estadistica.ts` y `linea-base.ts`: `mediana`, `mad`, pisos `MAD_MIN` explícitos anti-división por cero (`fc: 2.0`, `pas: 3.0`, `glucosa: 4.0`, `sueno: 0.35`, `animo: 0.5`), peso `w(d)` (`0` en días `1..14` o `<5` lecturas; `min(1, (d-14)/7)` en `15+`), ventana en vuelo días `8..d-3` (máx 14 días, excluyendo días con alerta) y reinicio de línea base de SpO2 al cambiar de perfil.
  - `capa-a.ts`: tramos NEWS2 + **corrección metrológica pendiente** (tramos extremos de 3 pts fijos en todo perfil; tramos de 1 y 2 pts solo suman si se apartan de la línea base del perfil o de los desplazamientos físicos esperados en adaptación).
  - `capa-b.ts`: Z-score modificado (`|M| >= 3.5` fisiológicas; `|M| >= 3.0` conductuales), persistencia 2 días seguidos (y 2 mediciones consecutivas para glucosa semanal), solo informativo en días `1..14`, alerta ámbar desde día `15`.
  - `capa-c.ts`: CUSUM unilateral (`k = 0.75`, `h = 5`) activo desde día `21` (FC al alza; sueño y ánimo a la baja), congelado durante tormenta solar y atenuado/reiniciado al atender la alerta.
  - `reglas-contexto.ts`: `ppCO2 > 3.0 mmHg` + `cefalea` → alerta de entorno colectiva (A2); flujo `>= 10 pfu` en `>= 10 MeV` o evento `DONKI` → Modo Tormenta (A3) marcando lecturas; regla de oferta `PVT-B` (cada 3 días o ámbar de sueño o `ppCO2 > 3.0`).
  - `privacidad.ts`: verde privado; ámbar privado con sugerencia de compartir al 3er día consecutivo; rojo (Capa A) escalamiento automático inmediato con dato mínimo, transparencia (nota editable, no cancelable), suplencia (`CMO -> Comandante`) y registro de auditoría.
  - `motor-hibrido.ts`: orquestador que devuelve estado por indicador, claves i18n de explicación y acción recomendada, estado agregado por los **5 sistemas corporales** (`cabeza_ojos`, `corazon_vasos`, `hueso_musculo`, `sangre_inmunidad`, `mente_sueno`) y paquetes de escalamiento/cola.
- [ ] **4.3 Ampliar `packages/i18n/`:**
  - Agregar primero todas las claves nuevas en `packages/i18n/locales/es.json` (español obligatorio: UI, errores, perfiles, sistemas, explicaciones del motor, acciones, fichas, cola con retardo, avisos).
  - Traducir a `packages/i18n/locales/en.json` para habilitar la demo en inglés.
  - Verificar con `.\venv\Scripts\python.exe packages/i18n/i18n.py` y `test_i18n.py`.
- [ ] **4.4 Tests unitarios en `packages/engine/` (`vitest`):**
  - Pruebas unitarias de `metrologia`, `linea-base`, `capa-a`, `capa-b`, `capa-c`, `reglas-contexto` y `privacidad`.
  - **`paridad-referencia.test.ts`:** verificar que el motor TS reproduce **100 % idéntico** `caso_referencia.json` generado en Etapa 3.
- [ ] **4.5 Contexto:** Crear `packages/engine/MODULE.md` y correr `contextgen.py` (+ agregar paso de tests TS en `.github/workflows/context.yml` según `ARQUITECTURA.md`).

**Criterio de salida Etapa 4:** Motor TS puro 100 % testeado, paridad verificada con `caso_referencia.json` e i18n validado sin errores en CI.

---

## ETAPA 5 — Aplicación Web Offline-First (`apps/web`) por funcionalidades

- [ ] **5.1 Inicialización de `apps/web/`:**
  - Crear `package.json` (`react`, `react-dom`, `vite`, `vite-plugin-pwa`, `dexie`, `recharts`, `vitest`), `tsconfig.json` (`resolveJsonModule: true`) y `vite.config.ts` con caché offline total (assets + `public/data/*.json`).
  - Organizar según `docs/ARQUITECTURA.md`: `src/app/`, `src/features/<feature>/` (con `index.ts` público), `src/shared/`, `public/data/`.
  - Todo texto visible pasa por `t("...")` de `packages/i18n`.
- [ ] **5.2 Shell de aplicación y almacén local (`src/app/`, `src/shared/`):**
  - Base `Dexie` (IndexedDB): tablas de lecturas, entorno cargado, alertas, auditoría de escalamientos, cola con retardo y preferencias (idioma `es`/`en` con `detectarIdioma`, perfil activo, tripulante activo).
  - Barra superior: selector de tripulante (4), selector de perfil de misión (`estacion`, `transito`, `transito_acoplado`, `superficie_lunar`, `superficie_marciana`), selector de día de misión (1..30) con badge de `Modo Adaptación` (días 1–14), indicador/simulador offline, selector `ES / EN` y botones de carga rápida de escenarios demo (`A1 Deriva`, `A2 CO2`, `A3 Tormenta`, `Rojo SpO2`).
  - Banner global de Modo Tormenta + pie permanente declarando "prototipo de apoyo a la decisión, no dispositivo médico".
- [ ] **5.3 Feature `src/features/registro-diario/`:**
  - Captura rápida **< 90 segundos** (con cronómetro visible opcional) de los 6 indicadores diarios + síntomas cerrados + cumplimiento de ejercicio.
  - Pestaña semanal para glucosa (con selector de enzima) y masa corporal (con instrumento y corrección por `g_rel`).
  - Instrumentos/sitios por defecto guardados por perfil (editables en 1 clic sin frenar el flujo diario).
  - Recordatorios locales (registro diario pendiente, semanal, repetición de medida o sugerencia `PVT-B`).
- [ ] **5.4 Feature `src/features/figura-humana/` y `src/features/alertas/`:**
  - `FiguraHumana.tsx`: SVG interactivo con los **5 sistemas** coloreados por estado (`verde`, `ámbar`, `rojo`).
  - Panel de detalle al tocar un sistema: indicadores que lo componen, capa que disparó el estado (`A / B / C / Contexto`), explicación cuantitativa, tarjeta de acción recomendada y las **10 fichas de indicadores** (6 campos + instrucciones según el perfil activo + enlaces clicables a las fuentes).
- [ ] **5.5 Feature `src/features/entorno/`:**
  - Panel ambiental con etiquetas explícitas (`Real`, `Escenario`, `Simulado`): dosis acumulada frente a `600 mSv` / `250 mSv` + advertencia CSA sobre ~30 % de neutrones; `ppCO2` en `mmHg` frente a `3.0 mmHg`; estado solar DONKI/GOES; tooltip con `t_real` UTC original.
  - Gráficas de tendencia (`Recharts`) con banda sombreada de línea base personal y marcadores de alerta/tormenta.
  - Modal separado para datos humanos reales de Inspiration4 (`OSD-569`, `OSD-575`).
- [ ] **5.6 Features `src/features/sincronizacion/` y `src/features/vista-tierra/` (+ vista Oficial Médico):**
  - Vista **Oficial Médico de Tripulación**: solo muestra reportes compartidos voluntariamente, escalamientos rojos automáticos (con respaldo si el afectado es el CMO) y alertas colectivas de entorno (sin exponer síntomas privados).
  - Cola persistida con retardo dinámico según `retardo_s` del perfil activo (hasta 22 min por trayecto en tránsito a Marte, con selector de velocidad `1x / 60x` para demostración).
  - Vista **Médico de Vuelo en Tierra**: recepción diferida del paquete completo (lectura + línea base + entorno + acción) y envío de respuesta de vuelta a través de la cola con retardo.
- [ ] **5.7 Contexto:** Actualizar `apps/web/MODULE.md` (quitar tag `pendiente`, documentar features y consumo de `gold`) y regenerar `contextgen.py`.

**Criterio de salida Etapa 5:** PWA funcional de extremo a extremo (capturar → contextualizar → decidir → escalar → sincronizar con retardo) sin conexión a internet.

---

## ETAPA 6 — Verificación integral, extras opcionales y entrega Space Apps

- [ ] **6.1 Suite completa de pruebas y checks:**
  - Tests Python (`pipelines/datalake`, `pipelines/reanclaje`, `packages/schemas`, `packages/i18n`, `tools/contextgen`).
  - Tests TypeScript (`packages/engine` con `paridad-referencia.test.ts` + tests de componentes/stores en `apps/web`).
  - `.\venv\Scripts\python.exe tools/contextgen/contextgen.py --check` sin diferencias.
  - `npm run build` + `npm run preview`: activar **Offline** en DevTools, recargar y completar el flujo entero sin errores de red.
- [ ] **6.2 Extras opcionales (solo si Etapa 5 y 6.1 están 100 % cerradas):**
  - Prueba cognitiva `PVT-B` (3 min, lapso `>= 355 ms`, salida en falso `< 130 ms`).
  - Rachas de registro diario.
  - Lectura Web Bluetooth Ruta A (`0x180D`) con retorno automático a entrada manual.
- [ ] **6.3 Medición rápida de usabilidad (informe §6.3):**
  - Cronometrar el registro diario (< 90 s) y, si es posible, aplicar escala SUS; reportar únicamente métricas medidas realmente.
- [ ] **6.4 Kit de entrega NASA Space Apps (informe §7.1 y §8):**
  - Verificar regla de coherencia (que el resumen y guion solo nombren lo implementado y probado).
  - Actualizar la declaración de uso de IA (§8.5) reflejando las herramientas reales usadas.
  - Desplegar PWA (Vercel o GitHub Pages) y grabar el video de **≤ 30 s** (o armar **≤ 7 diapositivas**) usando el modo `EN` de la aplicación.

---

## Orden de trabajo inmediato sugerido

Empezamos ejecutando la **Etapa 0** (verificar entorno, limpiar `backend/`, comprobar `.env` y tests base) y pasamos directo a la **Etapa 1** (ingesta real de `goes`, `donki`, `radlab` y revisión de `eda_manual/`).
