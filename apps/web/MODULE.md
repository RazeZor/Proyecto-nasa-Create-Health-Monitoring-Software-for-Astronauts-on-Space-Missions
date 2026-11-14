# Módulo `apps/web`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Interfaz a bordo de VIGÍA: registro diario (<90 s), figura humana interactiva por sistema, tendencias con bandas de línea base, entorno de radiación/cabina, alertas con control de privacidad, cola de informes con retardo y conexión con wearable.

## Puntos clave

- Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Recharts + componentes UI accesibles (`components/ui/*`).
- Funciona **sin conexión**: el almacenamiento local (`lib/storage.ts`) usa IndexedDB (`vigia-db`) con respaldo en memoria y todas las vistas operan sin depender de red externa.
- Motor híbrido: `packages/engine` (TypeScript puro, port 1:1 del simulador de Python, con test de paridad) evalúa las capas A, B y C y la regla de contexto. `lib/engine.ts` (`analizar(checkIns)`) lo aplica al escenario de partida (caso de referencia, trip-1) más los registros del usuario; `AppProvider` lo recalcula en `analisis` cada vez que se guarda un check-in, y cuerpo, tendencias, alertas e informes lo leen de ahí. Modo adaptación (días 1 a 14) y modo tormenta (del entorno del escenario). Tres niveles (`ok`, `watch`, `act`); solo `act` escala al oficial médico (§4.2, §5.1). Importa `packages/engine` por ruta relativa (`experimental.externalDir` en `next.config.mjs`). El pulso de `/device` sigue simulado a propósito: el reloj inteligente lo integra otro equipo, no este módulo.
- Acoplado a las fichas validadas de `public/fichas/*.json` (`packages/schemas/ficha.schema.json`), al catálogo oficial de perfiles (`packages/schemas/perfiles.json`) y a la API del ETL (`apps/api`, vía `lib/etl-client.ts` y `lib/api-registro.ts`, que llaman a `/vigia-api` en el mismo origen; `next.config.mjs` lo reenvía a `VIGIA_API_INTERNA`, leída al compilar, por defecto `http://127.0.0.1:8000`. Así, en la LAN solo se expone el puerto 3000, sin CORS ni preflight de red privada. `NEXT_PUBLIC_VIGIA_API_URL` salta el proxy con una URL directa): `lib/mock/indicators.ts` importa las fichas oficiales con sus protocolos por perfil (`estacion`, `transito`, `superficie`), riesgos HRP y URLs de fuentes científicas; la vista de entorno (`/environment`) consume en vivo `/paneles`, `/paneles/{nombre}`, `/escenarios/{nombre}/diario` y `/simulacion/kpi` desde `apps/api` sin generar series sintéticas (`Math.sin`) si la API está apagada.
- `lib/api-registro.ts` envía el registro a la API (`POST` de lecturas, síntomas y reportes) traduciendo las claves con `lib/vocabulario.json`, copia de `packages/schemas/vocabulario.json` que un test mantiene idéntica (si cambia el contrato: `cp packages/schemas/vocabulario.json apps/web/lib/`). No lanza sin red: devuelve `false` y el dato sigue en el almacén local. Prueba: `node --test apps/web/lib/*.test.ts` (Node 22.18+).
- El registro diario se sube a la API con `lib/sincronizacion.ts` (núcleo puro en `lib/sincronizar.ts`): al guardar un registro y al abrir la app se envían los pendientes en orden y se detiene en el primer fallo; reenviar es seguro. La identidad es un atajo: `NEXT_PUBLIC_VIGIA_TRIPULANTE` (id de la API; `cd apps/api && python3 -m almacen sembrar` crea astronauta=1). Sin esa variable, o sin red, la app funciona solo con el almacén local. Los informes de `/reports` usan la cola real: al encolar se envía `POST /reportes` (en la demo el retardo se acorta a 1 min como en la vista local), se consulta `GET /reportes` cada 3 s y el estado y la cuenta atrás salen del servidor (`lib/cola.ts`); si llega una respuesta se muestra. Sin red o sin identidad, el informe usa el cálculo local; un informe encolado sin red no se reenvía después (la API no tiene idempotencia para reportes). El contenido del informe sigue solo en el almacén local: la cola guarda hora, retardo, estado y respuesta. `t_real` es la hora real del envío, no el día de misión elegido en la interfaz: la API lo ve como día 1 de la misión demo.
- Sigue el modelo de tres roles (`astronaut`, `cmo`, `surgeon`) y cinco perfiles de misión (`station`: 760, `transit`: 760, `transit-docked`: 527, `lunar`: 424, `mars`: 424 mmHg) con conversión de CO2 de ppm a mmHg según la presión total de cabina.
- Rutas principales en `app/`: `/` (mapa corporal), `/check-in` (registro diario con cronómetro de 90 s), `/trends` (series y fichas), `/environment` (dosis RadLab, protones GOES, eventos DONKI y cabina EDA), `/alerts`, `/reports` (cola con retardo de comunicación), `/device` (reloj y simulador BLE) y `/about`.

## Relación con el informe

- §4.1 Flujo de extremo a extremo. §4.2 Capas de captura, almacén, motor, permisos y decisión. §4.3 Stack. §5.1 Motor híbrido. Anexo A (Galaxy Watch4).

tags: frontend, interfaz, react, nextjs, pwa, offline, motor-hibrido, figura-humana, fichas
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [app/about/page.tsx](app/about/page.tsx) | 5 | — |
| [app/alerts/page.tsx](app/alerts/page.tsx) | 5 | — |
| [app/check-in/page.tsx](app/check-in/page.tsx) | 5 | — |
| [app/device/page.tsx](app/device/page.tsx) | 5 | — |
| [app/environment/page.tsx](app/environment/page.tsx) | 5 | — |
| [app/layout.tsx](app/layout.tsx) | 37 | — |
| [app/page.tsx](app/page.tsx) | 5 | — |
| [app/reports/page.tsx](app/reports/page.tsx) | 5 | — |
| [app/trends/page.tsx](app/trends/page.tsx) | 5 | — |
| [components/about/about-view.tsx](components/about/about-view.tsx) | 58 | — |
| [components/alerts/alerts-view.tsx](components/alerts/alerts-view.tsx) | 100 | — |
| [components/app-context.tsx](components/app-context.tsx) | 88 | — |
| [components/body/body-figure.tsx](components/body/body-figure.tsx) | 298 | — |
| [components/body/body-view.tsx](components/body/body-view.tsx) | 219 | — |
| [components/checkin/checkin-form.tsx](components/checkin/checkin-form.tsx) | 274 | — |
| [components/device/device-view.tsx](components/device/device-view.tsx) | 71 | — |
| [components/device/switch.tsx](components/device/switch.tsx) | 18 | — |
| [components/environment/environment-view.tsx](components/environment/environment-view.tsx) | 363 | — |
| [components/reports/reports-view.tsx](components/reports/reports-view.tsx) | 136 | — |
| [components/shared/delay-countdown.tsx](components/shared/delay-countdown.tsx) | 34 | — |
| [components/shared/indicator-card.tsx](components/shared/indicator-card.tsx) | 38 | — |
| [components/shared/line-chart.tsx](components/shared/line-chart.tsx) | 80 | — |
| [components/shared/states.tsx](components/shared/states.tsx) | 50 | — |
| [components/shared/status.tsx](components/shared/status.tsx) | 73 | — |
| [components/shell/alert-center.tsx](components/shell/alert-center.tsx) | 173 | — |
| [components/shell/app-shell.tsx](components/shell/app-shell.tsx) | 288 | — |
| [components/trends/trends-view.tsx](components/trends/trends-view.tsx) | 74 | — |
| [components/ui/badge.tsx](components/ui/badge.tsx) | 51 | — |
| [components/ui/button.tsx](components/ui/button.tsx) | 57 | — |
| [components/ui/card.tsx](components/ui/card.tsx) | 102 | — |
| [components/ui/dialog.tsx](components/ui/dialog.tsx) | 160 | — |
| [components/ui/popover.tsx](components/ui/popover.tsx) | 89 | — |
| [components/ui/sheet.tsx](components/ui/sheet.tsx) | 138 | — |
| [components/ui/slider.tsx](components/ui/slider.tsx) | 51 | — |
| [lib/api-registro.test.ts](lib/api-registro.test.ts) | 39 | — |
| [lib/api-registro.ts](lib/api-registro.ts) | 95 | Cliente de registro hacia apps/api (lecturas, síntomas y reportes). Traduce las claves de la interfaz |
| [lib/cola.test.ts](lib/cola.test.ts) | 35 | — |
| [lib/cola.ts](lib/cola.ts) | 28 | Estado de un reporte de la cola hacia Tierra: de la API si la hay y, si no, calculado con el reloj local. |
| [lib/engine.test.ts](lib/engine.test.ts) | 68 | — |
| [lib/engine.ts](lib/engine.ts) | 156 | Análisis de la app: el escenario de partida (caso de referencia, trip-1) más los registros |
| [lib/etl-client.ts](lib/etl-client.ts) | 161 | Cliente HTTP de solo lectura hacia apps/api (zona gold del ETL en pipelines/reanclaje). |
| [lib/mock/alerts.ts](lib/mock/alerts.ts) | 27 | — |
| [lib/mock/crew.ts](lib/mock/crew.ts) | 11 | — |
| [lib/mock/environment.ts](lib/mock/environment.ts) | 43 | — |
| [lib/mock/indicators.ts](lib/mock/indicators.ts) | 134 | — |
| [lib/sincronizacion.ts](lib/sincronizacion.ts) | 30 | — |
| [lib/sincronizar.test.ts](lib/sincronizar.test.ts) | 31 | — |
| [lib/sincronizar.ts](lib/sincronizar.ts) | 22 | Núcleo puro de la sincronización del registro diario con la API (sin red ni almacenamiento: se inyectan). |
| [lib/storage.ts](lib/storage.ts) | 46 | — |
| [lib/strings.ts](lib/strings.ts) | 303 | — |
| [lib/types.ts](lib/types.ts) | 163 | — |
| [lib/utils.ts](lib/utils.ts) | 6 | — |
| [next.config.mjs](next.config.mjs) | 21 | @type {import('next').NextConfig} |
| [postcss.config.mjs](postcss.config.mjs) | 8 | @type {import('postcss-load-config').Config} |

### API pública

**app/about/page.tsx**

- función `Page`

**app/alerts/page.tsx**

- función `Page`

**app/check-in/page.tsx**

- función `Page`

**app/device/page.tsx**

- función `Page`

**app/environment/page.tsx**

- función `Page`

**app/layout.tsx**

- constante `metadata`
- constante `viewport`
- función `RootLayout`

**app/page.tsx**

- función `Page`

**app/reports/page.tsx**

- función `Page`

**app/trends/page.tsx**

- función `Page`

**components/about/about-view.tsx**

- función `AboutView`

**components/alerts/alerts-view.tsx**

- función `AlertsView`

**components/app-context.tsx**

- tipo `Sex`
- función `AppProvider`
- función `useApp`

**components/body/body-figure.tsx**

- tipo `BodySide`
- función `BodyFigure`

**components/body/body-view.tsx**

- función `BodyView`

**components/checkin/checkin-form.tsx**

- función `CheckInScreen`

**components/device/device-view.tsx**

- función `DeviceView`

**components/device/switch.tsx**

- función `Switch`

**components/environment/environment-view.tsx**

- función `EnvironmentView`

**components/reports/reports-view.tsx**

- función `ReportsView`

**components/shared/delay-countdown.tsx**

- función `formatDelay`
- función `useReportState`
- función `DelayCountdown`

**components/shared/indicator-card.tsx**

- función `IndicatorCard`

**components/shared/line-chart.tsx**

- función `LineChart`

**components/shared/states.tsx**

- función `EmptyState`
- función `LoadingState`
- función `ErrorState`
- función `PageHeader`

**components/shared/status.tsx**

- constante `STATUS_ICON`
- constante `statusText`
- constante `statusSurface`
- función `StatusBadge`
- función `LayerChip`
- función `ProvenanceTag`

**components/shell/alert-center.tsx**

- función `AlertCenter`

**components/shell/app-shell.tsx**

- función `AppShell`

**components/trends/trends-view.tsx**

- función `TrendsView`

**lib/api-registro.ts**

- constante `API_BASE_URL`
- constante `indicadorApi`
- constante `nivelApi`
- constante `capaApi`
- constante `perfilApi`
- constante `retardoMin`
- constante `tReal`
- función `lecturasDeCheckIn`
- constante `sintomasDeCheckIn`
- función `enviarCheckIn`
- función `encolarReporte`
- función `listarReportes`

**lib/cola.ts**

- interfaz `ReporteServidor`
- función `estadoReporte`

**lib/engine.ts**

- constante `ADAPTATION_END_DAY`
- constante `BASELINE_SWITCH_DAY`
- constante `MISSION_DAYS`
- constante `isAdaptation`
- constante `worst`
- función `analizar`
- tipo `Analisis`
- función `evaluateCheckIn`

**lib/etl-client.ts**

- constante `API_BASE_URL`
- interfaz `VentanaEtl`
- interfaz `DosisDiaEtl`
- interfaz `DosisPanelEtl`
- interfaz `ProtonesPanelEtl`
- interfaz `CabinaPanelEtl`
- interfaz `EventoDonkiEtl`
- interfaz `PanelEntornoEtl`
- interfaz `ResumenDiarioEtl`
- interfaz `KpiSimulacionEtl`
- función `verificarSaludApi`
- función `listarPanelesGold`
- función `cargarPanelGold`
- función `cargarEscenarioDiario`
- función `cargarKpiSimulacion`

**lib/mock/alerts.ts**

- constante `SEED_REPORTS`
- constante `THREAD`
- constante `REMINDERS`

**lib/mock/crew.ts**

- constante `CURRENT_DAY`
- constante `PROFILES`

**lib/mock/environment.ts**

- constante `PRIOR_CAREER_MSV`
- constante `CAREER_LIMIT_MSV`
- constante `CO2_LIMIT_MMHG`
- constante `PFU_THRESHOLD`
- constante `RADIATION_INDICATOR`
- constante `ENV_SOURCES`
- constante `ppmToMmHg`
- constante `isStormDay`

**lib/mock/indicators.ts**

- constante `INDICATORS`
- función `howToForProfile`

**lib/sincronizacion.ts**

- constante `TRIPULANTE`
- función `sincronizarRegistros`

**lib/sincronizar.ts**

- interfaz `Dependencias`
- función `sincronizar`

**lib/storage.ts**

- interfaz `HealthStore`
- constante `localStore`
- constante `store`

**lib/strings.ts**

- constante `S`
- constante `MOTOR`

**lib/types.ts**

- tipo `Status`
- tipo `Layer`
- tipo `Role`
- tipo `ProfileId`
- tipo `Provenance`
- interfaz `MissionProfile`
- tipo `ZoneId`
- tipo `Symptom`
- interfaz `DailyVitals`
- interfaz `ZoneResult`
- interfaz `Alert`
- tipo `IndicatorId`
- interfaz `IndicatorInfo`
- interfaz `Baseline`
- interfaz `CheckInEntry`
- interfaz `EnvDay`
- interfaz `SolarEvent`
- tipo `ReportState`
- interfaz `Report`
- interfaz `ThreadMessage`
- tipo `DeviceState`

**lib/utils.ts**

- función `cn`

### Configuración y fuentes externas

- Variables de entorno: `NEXT_PUBLIC_VIGIA_API_URL`, `NEXT_PUBLIC_VIGIA_TRIPULANTE`, `VIGIA_API_INTERNA`

### Dependencias

- Internas: `../../../packages/engine/fixtures/caso-referencia.json`, `../types`, `./api-registro`, `./api-registro.ts`, `./cola`, `./cola.ts`, `./engine.ts`, `./globals.css`, `./sincronizar`, `./sincronizar.ts`, `./storage`, `./strings.ts`, `./types`, `./types.ts`, `./vocabulario.json`
- Externas: `@/components/about/about-view`, `@/components/alerts/alerts-view`, `@/components/app-context`, `@/components/body/body-figure`, `@/components/body/body-view`, `@/components/checkin/checkin-form`, `@/components/device/device-view`, `@/components/device/switch`, `@/components/environment/environment-view`, `@/components/reports/reports-view`, `@/components/shared/delay-countdown`, `@/components/shared/indicator-card`, `@/components/shared/line-chart`, `@/components/shared/states`, `@/components/shared/status`, `@/components/shell/alert-center`, `@/components/shell/app-shell`, `@/components/trends/trends-view`, `@/components/ui/button`, `@/components/ui/dialog`, `@/components/ui/popover`, `@/components/ui/sheet`, `@/components/ui/slider`, `@/lib/api-registro`, `@/lib/cola`, `@/lib/engine`, `@/lib/etl-client`, `@/lib/mock/alerts`, `@/lib/mock/crew`, `@/lib/mock/environment`, `@/lib/mock/indicators`, `@/lib/sincronizacion`, `@/lib/storage`, `@/lib/strings`, `@/lib/types`, `@/lib/utils`, `@/public/fichas/dosis_radiacion.json`, `@/public/fichas/estado_animo.json`, `@/public/fichas/frecuencia_cardiaca_reposo.json`, `@/public/fichas/glucosa.json`, `@/public/fichas/masa_corporal.json`, `@/public/fichas/presion_arterial_sistolica.json`, `@/public/fichas/spo2.json`, `@/public/fichas/sueno.json`, `@/public/fichas/temperatura_central.json`, `@base-ui/react/button`, `@base-ui/react/dialog`, `@base-ui/react/merge-props`, `@base-ui/react/popover`, `@base-ui/react/slider`, `@base-ui/react/use-render`, `class-variance-authority`, `clsx`, `cn`, `lucide-react`, `next`, `next/link`, `next/navigation`, `react`, `tailwind-merge`
- Biblioteca estándar: `node:assert/strict`, `node:test`

### Tests

- `apps/web/lib/api-registro.test.ts`: 0 pruebas
- `apps/web/lib/cola.test.ts`: 0 pruebas
- `apps/web/lib/engine.test.ts`: 0 pruebas
- `apps/web/lib/sincronizar.test.ts`: 0 pruebas
<!-- CONTEXT:AUTO:END -->
