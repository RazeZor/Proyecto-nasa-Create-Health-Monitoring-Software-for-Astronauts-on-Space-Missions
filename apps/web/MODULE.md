# Módulo `apps/web`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Interfaz a bordo de VIGÍA: registro diario (<90 s), figura humana interactiva por sistema, tendencias con bandas de línea base, entorno de radiación/cabina, alertas con control de privacidad, cola de informes con retardo y conexión con wearable.

## Puntos clave

- Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Recharts + componentes UI accesibles (`components/ui/*`).
- Funciona **sin conexión**: el almacenamiento local (`lib/storage.ts`) usa IndexedDB (`vigia-db`) con respaldo en memoria y todas las vistas operan sin depender de red externa.
- Motor híbrido (`lib/engine.ts`): evalúa las capas A (seguridad clínica), B (desviación de línea base personal) y C (deriva lenta), además del modo adaptación (días 1 a 14) y modo tormenta solar (≥10 pfu). Muestra 3 niveles (`ok`, `watch`, `act`); solo el nivel `act` (rojo) escala automáticamente al oficial médico (§4.2, §5.1).
- Acoplado a las fichas validadas de `public/fichas/*.json` (`packages/schemas/ficha.schema.json`) y a la API del ETL (`apps/api`, vía `lib/etl-client.ts` y `NEXT_PUBLIC_VIGIA_API_URL`): `lib/mock/indicators.ts` importa las fichas oficiales con sus protocolos por perfil (`estacion`, `transito`, `superficie`), riesgos HRP y URLs de fuentes científicas; la vista de entorno (`/environment`) consume en vivo `/paneles` y `/paneles/{nombre}` (`panel-demo`, `dosis-equivalente`) desde `apps/api` y cae automáticamente a `PANELES_RESPALDO` si la API está apagada o sin red.
- `lib/api-registro.ts` envía el registro a la API (`POST` de lecturas, síntomas y reportes) traduciendo las claves con `lib/vocabulario.json`, copia de `packages/schemas/vocabulario.json` que un test mantiene idéntica (si cambia el contrato: `cp packages/schemas/vocabulario.json apps/web/lib/`). No lanza sin red: devuelve `false` y el dato sigue en el almacén local. Prueba: `node --test apps/web/lib/*.test.ts` (Node 22.18+).
- El registro diario se sube a la API con `lib/sincronizacion.ts` (núcleo puro en `lib/sincronizar.ts`): al guardar un registro y al abrir la app se envían los pendientes en orden y se detiene en el primer fallo; reenviar es seguro. La identidad es un atajo: `NEXT_PUBLIC_VIGIA_TRIPULANTE` (id de la API; `cd apps/api && python3 -m almacen sembrar` crea astronauta=1). Sin esa variable, o sin red, la app funciona solo con el almacén local. `t_real` es la hora real del envío, no el día de misión elegido en la interfaz: la API lo ve como día 1 de la misión demo.
- Sigue el modelo de tres roles (`astronaut`, `cmo`, `surgeon`) y cinco perfiles de misión (`station`, `transit`, `transit-docked`, `lunar`, `mars`) con conversión de CO2 de ppm a mmHg según la presión total de cabina (760, 527 y 424 mmHg).
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
| [components/alerts/alerts-view.tsx](components/alerts/alerts-view.tsx) | 101 | — |
| [components/app-context.tsx](components/app-context.tsx) | 78 | — |
| [components/body/body-figure.tsx](components/body/body-figure.tsx) | 298 | — |
| [components/body/body-view.tsx](components/body/body-view.tsx) | 220 | — |
| [components/checkin/checkin-form.tsx](components/checkin/checkin-form.tsx) | 273 | — |
| [components/device/device-view.tsx](components/device/device-view.tsx) | 71 | — |
| [components/device/switch.tsx](components/device/switch.tsx) | 18 | — |
| [components/environment/environment-view.tsx](components/environment/environment-view.tsx) | 224 | — |
| [components/reports/reports-view.tsx](components/reports/reports-view.tsx) | 107 | — |
| [components/shared/delay-countdown.tsx](components/shared/delay-countdown.tsx) | 35 | — |
| [components/shared/indicator-card.tsx](components/shared/indicator-card.tsx) | 38 | — |
| [components/shared/line-chart.tsx](components/shared/line-chart.tsx) | 80 | — |
| [components/shared/states.tsx](components/shared/states.tsx) | 50 | — |
| [components/shared/status.tsx](components/shared/status.tsx) | 73 | — |
| [components/shell/alert-center.tsx](components/shell/alert-center.tsx) | 174 | — |
| [components/shell/app-shell.tsx](components/shell/app-shell.tsx) | 288 | — |
| [components/trends/trends-view.tsx](components/trends/trends-view.tsx) | 75 | — |
| [components/ui/badge.tsx](components/ui/badge.tsx) | 51 | — |
| [components/ui/button.tsx](components/ui/button.tsx) | 57 | — |
| [components/ui/card.tsx](components/ui/card.tsx) | 102 | — |
| [components/ui/dialog.tsx](components/ui/dialog.tsx) | 160 | — |
| [components/ui/popover.tsx](components/ui/popover.tsx) | 89 | — |
| [components/ui/sheet.tsx](components/ui/sheet.tsx) | 138 | — |
| [components/ui/slider.tsx](components/ui/slider.tsx) | 51 | — |
| [lib/api-registro.test.ts](lib/api-registro.test.ts) | 39 | — |
| [lib/api-registro.ts](lib/api-registro.ts) | 72 | Cliente de registro hacia apps/api (lecturas, síntomas y reportes). Traduce las claves de la interfaz |
| [lib/engine.ts](lib/engine.ts) | 73 | Analysis engine facade. Signatures are final; bodies return scripted mock results |
| [lib/etl-client.ts](lib/etl-client.ts) | 178 | Cliente HTTP de solo lectura hacia apps/api (zona gold del ETL en pipelines/reanclaje). |
| [lib/mock/alerts.ts](lib/mock/alerts.ts) | 60 | — |
| [lib/mock/crew.ts](lib/mock/crew.ts) | 62 | — |
| [lib/mock/environment.ts](lib/mock/environment.ts) | 70 | — |
| [lib/mock/indicators.ts](lib/mock/indicators.ts) | 134 | — |
| [lib/sincronizacion.ts](lib/sincronizacion.ts) | 30 | — |
| [lib/sincronizar.test.ts](lib/sincronizar.test.ts) | 31 | — |
| [lib/sincronizar.ts](lib/sincronizar.ts) | 22 | Núcleo puro de la sincronización del registro diario con la API (sin red ni almacenamiento: se inyectan). |
| [lib/storage.ts](lib/storage.ts) | 46 | — |
| [lib/strings.ts](lib/strings.ts) | 263 | — |
| [lib/types.ts](lib/types.ts) | 161 | — |
| [lib/utils.ts](lib/utils.ts) | 6 | — |
| [next.config.mjs](next.config.mjs) | 11 | @type {import('next').NextConfig} |
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
- constante `encolarReporte`

**lib/engine.ts**

- constante `ADAPTATION_END_DAY`
- constante `isAdaptation`
- constante `isStorm`
- constante `worst`
- función `getVitals`
- función `getAlerts`
- función `evaluateZones`
- función `overallStatus`
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
- constante `PANELES_RESPALDO`
- función `verificarSaludApi`
- función `listarPanelesGold`
- función `cargarPanelGold`

**lib/mock/alerts.ts**

- constante `ALERTS`
- constante `SEED_REPORTS`
- constante `THREAD`
- constante `REMINDERS`

**lib/mock/crew.ts**

- constante `MISSION_DAYS`
- constante `CURRENT_DAY`
- constante `BASELINE_SWITCH_DAY`
- constante `PROFILES`
- constante `VITALS`
- función `getBaselines`

**lib/mock/environment.ts**

- constante `PRIOR_CAREER_MSV`
- constante `CAREER_LIMIT_MSV`
- constante `CO2_LIMIT_MMHG`
- constante `PFU_THRESHOLD`
- constante `RADIATION_INDICATOR`
- constante `ENV_SOURCES`
- constante `ENV`
- constante `SOLAR_EVENTS`
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

- Variables de entorno: `NEXT_PUBLIC_VIGIA_API_URL`, `NEXT_PUBLIC_VIGIA_TRIPULANTE`

### Dependencias

- Internas: `../types`, `./api-registro`, `./api-registro.ts`, `./crew`, `./globals.css`, `./mock/alerts`, `./mock/crew`, `./mock/environment`, `./sincronizar`, `./sincronizar.ts`, `./storage`, `./types`, `./types.ts`, `./vocabulario.json`
- Externas: `@/components/about/about-view`, `@/components/alerts/alerts-view`, `@/components/app-context`, `@/components/body/body-figure`, `@/components/body/body-view`, `@/components/checkin/checkin-form`, `@/components/device/device-view`, `@/components/device/switch`, `@/components/environment/environment-view`, `@/components/reports/reports-view`, `@/components/shared/delay-countdown`, `@/components/shared/indicator-card`, `@/components/shared/line-chart`, `@/components/shared/states`, `@/components/shared/status`, `@/components/shell/alert-center`, `@/components/shell/app-shell`, `@/components/trends/trends-view`, `@/components/ui/button`, `@/components/ui/dialog`, `@/components/ui/popover`, `@/components/ui/sheet`, `@/components/ui/slider`, `@/lib/engine`, `@/lib/etl-client`, `@/lib/mock/alerts`, `@/lib/mock/crew`, `@/lib/mock/environment`, `@/lib/mock/indicators`, `@/lib/sincronizacion`, `@/lib/storage`, `@/lib/strings`, `@/lib/types`, `@/lib/utils`, `@/public/fichas/dosis_radiacion.json`, `@/public/fichas/estado_animo.json`, `@/public/fichas/frecuencia_cardiaca_reposo.json`, `@/public/fichas/glucosa.json`, `@/public/fichas/masa_corporal.json`, `@/public/fichas/presion_arterial_sistolica.json`, `@/public/fichas/spo2.json`, `@/public/fichas/sueno.json`, `@/public/fichas/temperatura_central.json`, `@base-ui/react/button`, `@base-ui/react/dialog`, `@base-ui/react/merge-props`, `@base-ui/react/popover`, `@base-ui/react/slider`, `@base-ui/react/use-render`, `class-variance-authority`, `clsx`, `cn`, `lucide-react`, `next`, `next/link`, `next/navigation`, `react`, `tailwind-merge`
- Biblioteca estándar: `node:assert/strict`, `node:test`

### Tests

- `apps/web/lib/api-registro.test.ts`: 0 pruebas
- `apps/web/lib/sincronizar.test.ts`: 0 pruebas
<!-- CONTEXT:AUTO:END -->
