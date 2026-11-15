# Módulo `apps/web`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Interfaz a bordo de VIGÍA: registro diario (<90 s), figura humana interactiva por sistema, tendencias con bandas de línea base, entorno de radiación/cabina, alertas con control de privacidad, cola de informes con retardo y conexión con wearable.

## Puntos clave

- Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Recharts + componentes UI accesibles (`components/ui/*`).
- **La app solo conoce la API**: perfiles (`/perfiles`), fichas (`/fichas`), referencia de entorno (`/entorno/referencia`), historial simulado del tripulante (`/tripulantes/{id}/historial`), recordatorios, mensajes con tierra e informes salen de `apps/api`. `lib/catalogo.ts` los pide al arrancar (`cargarCatalogo`) y los traduce al modelo de la interfaz; `AppProvider` no muestra la app hasta tenerlos y, si la API no responde, muestra un aviso con «Reintentar». No hay datos de ejemplo en el cliente (`lib/mock` ya no existe): los mockups viven en `apps/api/demo/`. Lo único local son los registros del usuario (`lib/storage.ts`, `localStorage`), que se suben a la API.
- Motor híbrido: `packages/engine` (TypeScript puro, port 1:1 del simulador de Python, con test de paridad) evalúa las capas A, B y C y la regla de contexto. `lib/engine.ts` (`analizar(checkIns, historial)`) lo aplica al historial de la API más los registros del usuario; `AppProvider` lo recalcula en `analisis` cada vez que se guarda un check-in, y cuerpo, tendencias, alertas e informes lo leen de ahí. Modo adaptación (días 1 a 14) y modo tormenta (del `entorno_diario` del historial). Tres niveles (`ok`, `watch`, `act`); solo `act` escala al oficial médico (§4.2, §5.1). Importa `packages/engine` por ruta relativa (`experimental.externalDir` en `next.config.mjs`). El pulso de `/device` viene del Galaxy Watch real a través de la API (ver el punto del reloj).
- Llamadas a la API: `lib/catalogo.ts`, `lib/etl-client.ts` y `lib/api-registro.ts` usan `/vigia-api` en el mismo origen; `next.config.mjs` lo reenvía a `VIGIA_API_INTERNA` (se lee al compilar; por defecto `http://127.0.0.1:8000`). En la LAN solo se expone el puerto 3000, sin CORS ni preflight de red privada. `NEXT_PUBLIC_VIGIA_API_URL` salta el proxy con una URL directa. La vista de entorno consume `/paneles`, `/escenarios/{nombre}/diario` y `/simulacion/kpi` sin generar series sintéticas.
- `lib/api-registro.ts` conecta todas las rutas de `apps/api/rutas_registro.py` (`POST`/`GET` de lecturas, síntomas, alertas y reportes; `PUT`/`GET` de línea base en `tierra` y `vuelo`; `GET` de escalamientos recibidos y propios; `POST` de contexto en escalamientos, avance de cola y respuesta de Tierra) traduciendo las claves con `lib/vocabulario.json`, copia de `packages/schemas/vocabulario.json` que un test mantiene idéntica (si cambia el contrato: `cp packages/schemas/vocabulario.json apps/web/lib/`). No lanza sin red: devuelve `false`/`null`/`[]` y el dato sigue en el almacén local. Prueba: `node --test apps/web/lib/*.test.ts` (Node 22.18+).
- El registro diario, las líneas base y las alertas del motor se sincronizan con la API mediante `lib/sincronizacion.ts` (núcleo puro en `lib/sincronizar.ts`): al guardar un registro y al abrir la app se envían los pendientes en orden, se combinan lecturas/síntomas remotos de SQLite (`cargarRegistrosCombinados`) y se persisten las líneas base y alertas nuevas sin duplicar (`sincronizarMotorConServidor`). Identidad provisional: `NEXT_PUBLIC_VIGIA_TRIPULANTE` (por defecto 1, el astronauta de `python3 -m almacen sembrar`; el rol `cmo`/`surgeon` firma con el actor 2). En `/reports`, el Cirujano de Vuelo puede avanzar la cola (`POST /reportes/avanzar`) y responder informes entregados (`POST /reportes/{id}/respuesta`), actualizando el hilo de mensajes en vivo; en `/alerts`, se consultan los escalamientos reales y el astronauta puede adjuntar contexto una sola vez (`POST /escalamientos/{id}/contexto`); en `/trends`, se lee la línea base guardada en SQLite (`GET /linea-base/...`).
- Reloj (`lib/reloj.ts`): con el dispositivo en «Conectar», `AppProvider` sondea `GET /tripulantes/{id}/reloj` cada 1,5 s y `siguienteEstado` (pura, con test) decide `connecting → connected → lost`: `connected` solo con una lectura de menos de 10 s; si no llega en 15 s, `lost`. Las órdenes (`iniciar_chequeo`, `medir_spo2`) van por `POST .../reloj/ordenes`. El simulador solo transmite cuando no hay reloj real. La app nunca habla con smart-monitor directamente. Del reloj también salen: la FC en reposo del día que precarga el registro (`fcReposoSugerida`: del chequeo, del sueño o del día despierto; nunca el pulso instantáneo, A.6), la SpO2 del reloj de las últimas 12 h (`spo2Sugerida`, sitio «Muñeca (reloj)», sube como `sensor`/`galaxy_watch4`; contrato `spo2_sitio: muneca`), el sueño estimado como sugerencia experimental, la curva de FC (`tramosSerie`, cortes en huecos > 3 s), HRV de 5 min, el aviso de cambio de instrumento, la tolerancia al movimiento y el CSV (`components/device/reloj-extras.tsx`) y, para `cmo`/`surgeon`, el estado de los relojes de la tripulación sin valores fisiológicos. El motor no reinicia la línea base ante un cambio de instrumento (no tiene ventana en vuelo y debe mantener paridad con el simulador): solo se avisa.
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
| [components/alerts/alerts-view.tsx](components/alerts/alerts-view.tsx) | 213 | — |
| [components/app-context.tsx](components/app-context.tsx) | 162 | — |
| [components/body/body-figure.tsx](components/body/body-figure.tsx) | 298 | — |
| [components/body/body-view.tsx](components/body/body-view.tsx) | 218 | — |
| [components/checkin/checkin-form.tsx](components/checkin/checkin-form.tsx) | 312 | — |
| [components/device/device-view.tsx](components/device/device-view.tsx) | 160 | — |
| [components/device/fc-chart.tsx](components/device/fc-chart.tsx) | 46 | — |
| [components/device/reloj-extras.tsx](components/device/reloj-extras.tsx) | 107 | — |
| [components/device/switch.tsx](components/device/switch.tsx) | 18 | — |
| [components/environment/environment-view.tsx](components/environment/environment-view.tsx) | 359 | — |
| [components/reports/reports-view.tsx](components/reports/reports-view.tsx) | 196 | — |
| [components/shared/delay-countdown.tsx](components/shared/delay-countdown.tsx) | 34 | — |
| [components/shared/indicator-card.tsx](components/shared/indicator-card.tsx) | 38 | — |
| [components/shared/line-chart.tsx](components/shared/line-chart.tsx) | 80 | — |
| [components/shared/states.tsx](components/shared/states.tsx) | 50 | — |
| [components/shared/status.tsx](components/shared/status.tsx) | 73 | — |
| [components/shell/alert-center.tsx](components/shell/alert-center.tsx) | 173 | — |
| [components/shell/app-shell.tsx](components/shell/app-shell.tsx) | 288 | — |
| [components/trends/trends-view.tsx](components/trends/trends-view.tsx) | 101 | — |
| [components/ui/badge.tsx](components/ui/badge.tsx) | 51 | — |
| [components/ui/button.tsx](components/ui/button.tsx) | 57 | — |
| [components/ui/card.tsx](components/ui/card.tsx) | 102 | — |
| [components/ui/dialog.tsx](components/ui/dialog.tsx) | 160 | — |
| [components/ui/popover.tsx](components/ui/popover.tsx) | 89 | — |
| [components/ui/sheet.tsx](components/ui/sheet.tsx) | 138 | — |
| [components/ui/slider.tsx](components/ui/slider.tsx) | 51 | — |
| [lib/api-registro.test.ts](lib/api-registro.test.ts) | 104 | — |
| [lib/api-registro.ts](lib/api-registro.ts) | 472 | Cliente de registro hacia apps/api (lecturas, síntomas y reportes). Traduce las claves de la interfaz |
| [lib/catalogo.test.ts](lib/catalogo.test.ts) | 35 | — |
| [lib/catalogo.ts](lib/catalogo.ts) | 170 | Todo lo que la app muestra y no escribe el usuario sale de la API: perfiles, fichas, referencia de |
| [lib/cola.test.ts](lib/cola.test.ts) | 35 | — |
| [lib/cola.ts](lib/cola.ts) | 39 | Estado de un reporte de la cola hacia Tierra: de la API si la hay y, si no, calculado con el reloj local. |
| [lib/engine.test.ts](lib/engine.test.ts) | 96 | — |
| [lib/engine.ts](lib/engine.ts) | 199 | Análisis de la app: el historial que da la API (GET /tripulantes/{id}/historial) más los registros |
| [lib/etl-client.ts](lib/etl-client.ts) | 161 | Cliente HTTP de solo lectura hacia apps/api (zona gold del ETL en pipelines/reanclaje). |
| [lib/reloj.test.ts](lib/reloj.test.ts) | 56 | — |
| [lib/reloj.ts](lib/reloj.ts) | 206 | Reloj en vivo (Galaxy Watch4) a través de apps/api: la app no habla con el servidor del reloj, solo con |
| [lib/sincronizacion.ts](lib/sincronizacion.ts) | 83 | — |
| [lib/sincronizar.test.ts](lib/sincronizar.test.ts) | 31 | — |
| [lib/sincronizar.ts](lib/sincronizar.ts) | 22 | Núcleo puro de la sincronización del registro diario con la API (sin red ni almacenamiento: se inyectan). |
| [lib/storage.ts](lib/storage.ts) | 42 | — |
| [lib/strings.ts](lib/strings.ts) | 371 | — |
| [lib/types.ts](lib/types.ts) | 167 | — |
| [lib/utils.ts](lib/utils.ts) | 10 | — |
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

**components/device/fc-chart.tsx**

- función `FcChart`

**components/device/reloj-extras.tsx**

- función `CrewWatches`
- función `WatchSettings`

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
- interfaz `LecturaServidor`
- interfaz `SintomaServidor`
- tipo `OrigenLineaBase`
- interfaz `LineaBaseServidor`
- interfaz `AlertaInServidor`
- interfaz `AlertaServidor`
- interfaz `EscalamientoServidor`
- constante `indicadorApi`
- constante `indicadorMotorApi`
- constante `nivelApi`
- constante `capaApi`
- constante `perfilApi`
- constante `retardoMin`
- constante `tReal`
- constante `tRealDeDia`
- constante `diaDeTMision`
- función `lecturasDeCheckIn`
- constante `sintomasDeCheckIn`
- función `enviarCheckIn`
- función `encolarReporte`
- función `listarReportes`
- función `reporteDeServidor`
- función `avanzarCola`
- función `responderReporte`
- función `listarLecturas`
- función `listarSintomas`
- función `checkInsDeServidor`
- función `guardarLineaBase`
- función `leerLineaBase`
- función `alertaInDeMotor`
- función `crearAlerta`
- función `listarAlertas`
- función `listarEscalamientosRecibidos`
- función `listarEscalamientosPropios`
- función `agregarContextoEscalamiento`

**lib/catalogo.ts**

- tipo `FichaJson`
- interfaz `LecturaHistorial`
- interfaz `Historial`
- interfaz `ReferenciaEntorno`
- interfaz `Catalogo`
- función `perfilesUi`
- función `indicadoresUi`
- función `comoMedirEnPerfil`
- constante `mensajesUi`
- constante `fuentesUi`
- función `leerMensajes`
- función `cargarCatalogo`

**lib/cola.ts**

- interfaz `ReporteServidor`
- interfaz `ContenidoReporte`
- función `estadoReporte`

**lib/engine.ts**

- constante `ADAPTATION_END_DAY`
- constante `BASELINE_SWITCH_DAY`
- constante `isAdaptation`
- constante `worst`
- función `analizar`
- función `cambiosDeInstrumento`
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

**lib/reloj.ts**

- constante `VIGENCIA_LECTURA_MS`
- constante `ESPERA_CONEXION_MS`
- constante `INTERVALO_SONDEO_MS`
- interfaz `ChequeoReloj`
- interfaz `DatosReloj`
- interfaz `MiembroReloj`
- tipo `PresetTolerancia`
- interfaz `Tolerancia`
- interfaz `ConfigReloj`
- interfaz `RespuestaReloj`
- tipo `OrdenReloj`
- función `lecturaVigente`
- función `siguienteEstado`
- constante `HUECO_MS`
- función `tramosSerie`
- función `fcReposoSugerida`
- constante `VIGENCIA_SPO2_MS`
- función `spo2Sugerida`
- función `suenoSugerido`
- función `ultimoCambioInstrumento`
- función `leerReloj`
- función `enviarOrdenReloj`
- constante `leerTripulacionReloj`
- constante `leerConfigReloj`
- función `cambiarTolerancia`
- función `descargarCsvReloj`

**lib/sincronizacion.ts**

- constante `TRIPULANTE`
- constante `actorDeRol`
- función `sincronizarRegistros`
- función `cargarRegistrosCombinados`
- función `sincronizarMotorConServidor`

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
- constante `ppmToMmHg`

### Configuración y fuentes externas

- Variables de entorno: `NEXT_PUBLIC_VIGIA_API_URL`, `NEXT_PUBLIC_VIGIA_TRIPULANTE`, `VIGIA_API_INTERNA`

### Dependencias

- Internas: `../../../packages/engine/engine.ts`, `../../../packages/engine/fixtures/caso-referencia.json`, `./api-registro.ts`, `./catalogo.ts`, `./cola`, `./cola.ts`, `./engine`, `./engine.ts`, `./globals.css`, `./reloj.ts`, `./sincronizar`, `./sincronizar.ts`, `./storage`, `./strings.ts`, `./types`, `./types.ts`, `./vocabulario.json`
- Externas: `@/components/about/about-view`, `@/components/alerts/alerts-view`, `@/components/app-context`, `@/components/body/body-figure`, `@/components/body/body-view`, `@/components/checkin/checkin-form`, `@/components/device/device-view`, `@/components/device/fc-chart`, `@/components/device/reloj-extras`, `@/components/device/switch`, `@/components/environment/environment-view`, `@/components/reports/reports-view`, `@/components/shared/delay-countdown`, `@/components/shared/indicator-card`, `@/components/shared/line-chart`, `@/components/shared/states`, `@/components/shared/status`, `@/components/shell/alert-center`, `@/components/shell/app-shell`, `@/components/trends/trends-view`, `@/components/ui/button`, `@/components/ui/dialog`, `@/components/ui/popover`, `@/components/ui/sheet`, `@/components/ui/slider`, `@/lib/api-registro`, `@/lib/catalogo`, `@/lib/cola`, `@/lib/engine`, `@/lib/etl-client`, `@/lib/reloj`, `@/lib/sincronizacion`, `@/lib/storage`, `@/lib/strings`, `@/lib/types`, `@/lib/utils`, `@base-ui/react/button`, `@base-ui/react/dialog`, `@base-ui/react/merge-props`, `@base-ui/react/popover`, `@base-ui/react/slider`, `@base-ui/react/use-render`, `class-variance-authority`, `clsx`, `cn`, `lucide-react`, `next`, `next/link`, `next/navigation`, `react`, `tailwind-merge`
- Biblioteca estándar: `node:assert/strict`, `node:fs`, `node:test`

### Tests

- `apps/web/lib/api-registro.test.ts`: 0 pruebas
- `apps/web/lib/catalogo.test.ts`: 0 pruebas
- `apps/web/lib/cola.test.ts`: 0 pruebas
- `apps/web/lib/engine.test.ts`: 0 pruebas
- `apps/web/lib/reloj.test.ts`: 0 pruebas
- `apps/web/lib/sincronizar.test.ts`: 0 pruebas
<!-- CONTEXT:AUTO:END -->
