# Módulo `apps/web`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Interfaz a bordo de VIGÍA: registro diario (<90 s), figura humana interactiva por sistema, tendencias con bandas de línea base, entorno de radiación/cabina, alertas con control de privacidad y escalamiento real, cola de informes con retardo, conexión con wearable y funcionamiento sin enlace, con datos reales o en modo demo.

## Puntos clave

- Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + componentes UI accesibles (`components/ui/*`). Las gráficas son SVG propio (`components/shared/line-chart.tsx`).
- **Dos modos de datos** (selector «Datos» de la barra superior; `lib/storage.ts`: `leerModo`, `usarModo`). `real` (por defecto; `NEXT_PUBLIC_VIGIA_MODO=demo` lo cambia): solo lo que el tripulante registra y el entorno medido; el registro se guarda en el día de misión de hoy y se sube a la API con `naturaleza: Real`. `demo`: tripulante simulado de 30 días con las anomalías de §5.5, todo rotulado; lo registrado en demo usa otro almacén (prefijo `vigia:` frente a `vigia:real:`) y **nunca** se sube ni escala. La API recibe el modo en `?modo=`.
- **La app solo conoce la API, pero abre sin ella**: perfiles, fichas, referencia de entorno, historial, recordatorios, mensajes e informes salen de `apps/api`. `lib/catalogo.ts` (`cargarCatalogo(tripulante, modo)`) los pide al arrancar y guarda una copia local; si la API no responde, abre con esa copia (`catalogo.sinEnlace`), muestra «sin enlace» y reintenta cada 30 s y al volver la red. Solo la primera apertura en un dispositivo necesita enlace. `lib/etl-client.ts` hace lo mismo con el panel de entorno. No hay datos de ejemplo en el cliente: los mockups viven en `apps/api/demo/`.
- Sin conexión (§4.2): `public/sw.js` (escrito a mano, sin dependencias) guarda la carcasa (el HTML de las 8 pantallas y sus recursos de `/_next/static`) al instalarse; navegación con red primero y copia como respaldo; no intercepta `/vigia-api`. Se registra solo en producción (`components/shell/sw-register.tsx`). `app/manifest.ts` es el manifiesto. Si cambias las rutas, actualiza `PANTALLAS` en `sw.js`; si cambias la estrategia, sube la versión de `CACHE`.
- Motor híbrido: `packages/engine` evalúa las capas A, B y C y las reglas de contexto. `lib/engine.ts` (`analizar(checkIns, historial, presionCabinaMmHg)`) lo aplica al historial de la API más los registros locales; `AppProvider` lo recalcula en `analisis` al guardar un registro o cambiar de perfil. **El entorno entra al motor**: el CO2 real llega en ppm y se convierte con la presión de cabina del perfil activo (cambiar de perfil puede cambiar la alerta, §3.3); la tormenta sale del flujo (>= 10 pfu) o de un evento SEP real de DONKI. Cada alerta de entorno lleva su procedencia (`source`: Real o Simulado, fuente y fecha real). Una medida no tomada es `null`, nunca 0. Las alertas `informative` (capa B en adaptación) se muestran pero no cambian el estado ni avisan. La banda personal de las tendencias es la referencia del motor día a día (`analisis.band`).
- Privacidad y escalamiento (§5.4): solo el rojo de la capa A sale del dispositivo. `lib/alertas-sync.ts` (núcleo puro) y `sincronizarAlertasRojas` envían a `POST /tripulantes/{id}/alertas` el dato mínimo (indicador, valor, hora y tramo) de los rojos sobre registros propios, sin duplicar y reintentando sin red. `/alerts` muestra lo que salió de verdad (`GET .../escalamientos`), deja añadir contexto una vez y, como oficial médico, lee su bandeja real (`GET /escalamientos`). Verde y ámbar no salen; tras 3 días en ámbar se recomienda compartir. Las alertas de entorno se rotulan «compartida con la tripulación». En modo demo el escalamiento se rotula como simulado.
- Llamadas a la API: `lib/catalogo.ts`, `lib/etl-client.ts` y `lib/api-registro.ts` usan `/vigia-api` en el mismo origen; `next.config.mjs` lo reenvía a `VIGIA_API_INTERNA` (se lee al compilar; por defecto `http://127.0.0.1:8000`). En la LAN solo se expone el puerto 3000, sin CORS ni preflight de red privada. `NEXT_PUBLIC_VIGIA_API_URL` salta el proxy con una URL directa. La vista de entorno consume `/paneles`, `/escenarios/{nombre}/diario` y `/simulacion/kpi` sin generar series sintéticas.
- `lib/api-registro.ts` envía el registro a la API (`POST` de lecturas, síntomas y reportes) traduciendo las claves con `lib/vocabulario.json`, copia de `packages/schemas/vocabulario.json` que un test mantiene idéntica (si cambia el contrato: `cp packages/schemas/vocabulario.json apps/web/lib/`). No lanza sin red: devuelve `false` y el dato sigue en el almacén local. Prueba: `node --test apps/web/lib/*.test.ts` (Node 22.18+).
- El registro diario se sube a la API con `lib/sincronizacion.ts` (núcleo puro en `lib/sincronizar.ts`), solo en modo real: `AppProvider` envía los pendientes en orden al cambiar el análisis, al volver la red y cada 30 s si queda algo; la barra muestra cuántos faltan. Identidad provisional: `NEXT_PUBLIC_VIGIA_TRIPULANTE` (por defecto 1, el astronauta de `python3 -m almacen sembrar`). Los informes viven en la API con su `contenido` (lectura, línea base, entorno con procedencia y acción del día): `/reports` los lee cada 3 s; como cirujano de vuelo se puede responder un informe entregado. `t_real` es la hora real del envío.
- Reloj (`lib/reloj.ts`): con el dispositivo en «Conectar», `AppProvider` sondea `GET /tripulantes/{id}/reloj` cada 1,5 s y `siguienteEstado` (pura, con test) decide `connecting → connected → lost`: `connected` solo con una lectura de menos de 10 s; si no llega en 15 s, `lost`. Las órdenes (`iniciar_chequeo`, `medir_spo2`) van por `POST .../reloj/ordenes`. El simulador solo transmite cuando no hay reloj real. La app nunca habla con smart-monitor directamente. Del reloj también salen: la FC en reposo del día que precarga el registro (`fcReposoSugerida`: del chequeo, del sueño o del día despierto; nunca el pulso instantáneo, A.6), la SpO2 del reloj de las últimas 12 h (`spo2Sugerida`, sitio «Muñeca (reloj)», sube como `sensor`/`galaxy_watch4`; contrato `spo2_sitio: muneca`), el sueño estimado como sugerencia experimental, la curva de FC (`tramosSerie`, cortes en huecos > 3 s), HRV de 5 min, el aviso de cambio de instrumento, la tolerancia al movimiento y el CSV (`components/device/reloj-extras.tsx`) y, para `cmo`/`surgeon`, el estado de los relojes de la tripulación sin valores fisiológicos. Ante un cambio de instrumento el motor descarta la línea base y la ventana de la FC y pausa sus capas B y C 8 días (A.6); `cambiosDeInstrumento` lo detecta con `hrInstrument` de los registros y `fc_instrumento` del historial.
- Sigue el modelo de tres roles (`astronaut`, `cmo`, `surgeon`) y cinco perfiles de misión (`station`: 760, `transit`: 760, `transit-docked`: 527, `lunar`: 424, `mars`: 424 mmHg) con conversión de CO2 de ppm a mmHg según la presión total de cabina.
- i18n: ningún texto visible es literal. `lib/strings.ts` da forma y tipos a las claves `web.*` de `packages/i18n` (español e inglés); el idioma se resuelve en el navegador (preferencia guardada o idioma del navegador) y cambiarlo recarga la página. Las fichas y los recordatorios se piden a la API con `?lang=` (traducciones en `packages/schemas/fichas_en`); los nombres de perfil salen de `web.S.profiles`. Los mensajes de tierra y los errores de la API siguen en español.
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
| [app/layout.tsx](app/layout.tsx) | 39 | — |
| [app/manifest.ts](app/manifest.ts) | 19 | — |
| [app/page.tsx](app/page.tsx) | 5 | — |
| [app/reports/page.tsx](app/reports/page.tsx) | 5 | — |
| [app/trends/page.tsx](app/trends/page.tsx) | 5 | — |
| [components/about/about-view.tsx](components/about/about-view.tsx) | 50 | — |
| [components/alerts/alerts-view.tsx](components/alerts/alerts-view.tsx) | 204 | — |
| [components/app-context.tsx](components/app-context.tsx) | 218 | — |
| [components/body/body-figure.tsx](components/body/body-figure.tsx) | 298 | — |
| [components/body/body-view.tsx](components/body/body-view.tsx) | 271 | — |
| [components/checkin/checkin-form.tsx](components/checkin/checkin-form.tsx) | 315 | — |
| [components/device/device-view.tsx](components/device/device-view.tsx) | 160 | — |
| [components/device/fc-chart.tsx](components/device/fc-chart.tsx) | 46 | — |
| [components/device/reloj-extras.tsx](components/device/reloj-extras.tsx) | 107 | — |
| [components/device/switch.tsx](components/device/switch.tsx) | 18 | — |
| [components/environment/environment-view.tsx](components/environment/environment-view.tsx) | 269 | — |
| [components/reports/reports-view.tsx](components/reports/reports-view.tsx) | 149 | — |
| [components/shared/delay-countdown.tsx](components/shared/delay-countdown.tsx) | 34 | — |
| [components/shared/indicator-card.tsx](components/shared/indicator-card.tsx) | 38 | — |
| [components/shared/line-chart.tsx](components/shared/line-chart.tsx) | 82 | — |
| [components/shared/states.tsx](components/shared/states.tsx) | 50 | — |
| [components/shared/status.tsx](components/shared/status.tsx) | 73 | — |
| [components/shell/alert-center.tsx](components/shell/alert-center.tsx) | 167 | — |
| [components/shell/app-shell.tsx](components/shell/app-shell.tsx) | 329 | — |
| [components/shell/sw-register.tsx](components/shell/sw-register.tsx) | 15 | — |
| [components/trends/trends-view.tsx](components/trends/trends-view.tsx) | 73 | — |
| [components/ui/badge.tsx](components/ui/badge.tsx) | 51 | — |
| [components/ui/button.tsx](components/ui/button.tsx) | 57 | — |
| [components/ui/card.tsx](components/ui/card.tsx) | 102 | — |
| [components/ui/dialog.tsx](components/ui/dialog.tsx) | 160 | — |
| [components/ui/popover.tsx](components/ui/popover.tsx) | 89 | — |
| [components/ui/sheet.tsx](components/ui/sheet.tsx) | 138 | — |
| [components/ui/slider.tsx](components/ui/slider.tsx) | 51 | — |
| [lib/alertas-sync.test.ts](lib/alertas-sync.test.ts) | 52 | — |
| [lib/alertas-sync.ts](lib/alertas-sync.ts) | 35 | Núcleo puro del escalamiento de alertas rojas (§5.4): sin red ni almacenamiento, que se inyectan. |
| [lib/api-registro.test.ts](lib/api-registro.test.ts) | 54 | — |
| [lib/api-registro.ts](lib/api-registro.ts) | 157 | Cliente de registro hacia apps/api (lecturas, síntomas y reportes). Traduce las claves de la interfaz |
| [lib/catalogo.test.ts](lib/catalogo.test.ts) | 35 | — |
| [lib/catalogo.ts](lib/catalogo.ts) | 204 | Todo lo que la app muestra y no escribe el usuario sale de la API: perfiles, fichas, referencia de |
| [lib/cola.test.ts](lib/cola.test.ts) | 35 | — |
| [lib/cola.ts](lib/cola.ts) | 41 | Estado de un reporte de la cola hacia Tierra: de la API si la hay y, si no, calculado con el reloj local. |
| [lib/engine.test.ts](lib/engine.test.ts) | 151 | — |
| [lib/engine.ts](lib/engine.ts) | 252 | Análisis de la app: el historial que da la API (GET /tripulantes/{id}/historial, en modo real o demo) más |
| [lib/etl-client.ts](lib/etl-client.ts) | 166 | Cliente HTTP de solo lectura hacia apps/api (zona gold del ETL en pipelines/reanclaje). |
| [lib/reloj.test.ts](lib/reloj.test.ts) | 56 | — |
| [lib/reloj.ts](lib/reloj.ts) | 206 | Reloj en vivo (Galaxy Watch4) a través de apps/api: la app no habla con el servidor del reloj, solo con |
| [lib/sincronizacion.ts](lib/sincronizacion.ts) | 57 | — |
| [lib/sincronizar.test.ts](lib/sincronizar.test.ts) | 31 | — |
| [lib/sincronizar.ts](lib/sincronizar.ts) | 22 | Núcleo puro de la sincronización del registro diario con la API (sin red ni almacenamiento: se inyectan). |
| [lib/storage.ts](lib/storage.ts) | 91 | — |
| [lib/strings.ts](lib/strings.ts) | 589 | Textos de la interfaz. Ninguno es literal: todos salen de packages/i18n (`locales/es.json`, subárbol `web`; |
| [lib/types.ts](lib/types.ts) | 186 | — |
| [lib/utils.ts](lib/utils.ts) | 10 | — |
| [next.config.mjs](next.config.mjs) | 21 | @type {import('next').NextConfig} |
| [postcss.config.mjs](postcss.config.mjs) | 8 | @type {import('postcss-load-config').Config} |
| [public/sw.js](public/sw.js) | 64 | Service worker de VIGÍA: deja la aplicación disponible sin enlace (informe §4.2, "todo funciona sin enlace"). |

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

**app/manifest.ts**

- función `manifest`

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

**components/shell/sw-register.tsx**

- función `SwRegister`

**components/trends/trends-view.tsx**

- función `TrendsView`

**lib/alertas-sync.ts**

- interfaz `AvisoRojo`
- interfaz `DependenciasAlertas`
- constante `claveAlerta`
- constante `escalable`
- función `sincronizarAlertas`

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
- constante `responderReporte`
- función `reporteDeServidor`
- interfaz `Escalamiento`
- función `enviarAlertaRoja`
- constante `escalamientosPropios`
- constante `escalamientosRecibidos`
- constante `leerTripulacion`
- constante `agregarContexto`

**lib/catalogo.ts**

- tipo `FichaJson`
- interfaz `LecturaHistorial`
- interfaz `OrigenDato`
- interfaz `EventoSep`
- interfaz `EntornoHistorial`
- interfaz `Historial`
- interfaz `ReferenciaEntorno`
- interfaz `Catalogo`
- función `perfilesUi`
- función `indicadoresUi`
- función `comoMedirEnPerfil`
- constante `mensajesUi`
- constante `fuentesUi`
- función `cargarCatalogo`

**lib/cola.ts**

- interfaz `ReporteServidor`
- interfaz `ContenidoReporte`
- función `estadoReporte`

**lib/engine.ts**

- constante `ADAPTATION_END_DAY`
- constante `BASELINE_SWITCH_DAY`
- constante `isAdaptation`
- constante `DIAS_AMBAR_PARA_RECOMENDAR`
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
- función `sincronizarRegistros`
- función `sincronizarAlertasRojas`

**lib/sincronizar.ts**

- interfaz `Dependencias`
- función `sincronizar`

**lib/storage.ts**

- interfaz `HealthStore`
- función `leerModo`
- función `usarModo`
- constante `modoActual`
- constante `localStore`
- constante `store`
- constante `leerCache`
- función `guardarCache`

**lib/strings.ts**

- constante `IDIOMA`
- función `cambiarIdioma`
- constante `S`
- constante `MOTOR`

**lib/types.ts**

- tipo `Status`
- tipo `Layer`
- tipo `Role`
- tipo `Mode`
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
- interfaz `BandPoint`
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

- Variables de entorno: `NEXT_PUBLIC_VIGIA_API_URL`, `NEXT_PUBLIC_VIGIA_MODO`, `NEXT_PUBLIC_VIGIA_TRIPULANTE`, `NODE_ENV`, `VIGIA_API_INTERNA`

### Dependencias

- Internas: `../../../packages/engine/engine.ts`, `../../../packages/engine/fixtures/caso-referencia.json`, `../../../packages/i18n/i18n.ts`, `./alertas-sync`, `./alertas-sync.ts`, `./api-registro`, `./api-registro.ts`, `./catalogo.ts`, `./cola.ts`, `./engine.ts`, `./globals.css`, `./reloj.ts`, `./sincronizar`, `./sincronizar.ts`, `./storage`, `./storage.ts`, `./strings`, `./strings.ts`, `./types`, `./types.ts`, `./vocabulario.json`
- Externas: `@/components/about/about-view`, `@/components/alerts/alerts-view`, `@/components/app-context`, `@/components/body/body-figure`, `@/components/body/body-view`, `@/components/checkin/checkin-form`, `@/components/device/device-view`, `@/components/device/fc-chart`, `@/components/device/reloj-extras`, `@/components/device/switch`, `@/components/environment/environment-view`, `@/components/reports/reports-view`, `@/components/shared/delay-countdown`, `@/components/shared/indicator-card`, `@/components/shared/line-chart`, `@/components/shared/states`, `@/components/shared/status`, `@/components/shell/alert-center`, `@/components/shell/app-shell`, `@/components/shell/sw-register`, `@/components/trends/trends-view`, `@/components/ui/button`, `@/components/ui/dialog`, `@/components/ui/popover`, `@/components/ui/sheet`, `@/components/ui/slider`, `@/lib/alertas-sync`, `@/lib/api-registro`, `@/lib/catalogo`, `@/lib/cola`, `@/lib/engine`, `@/lib/etl-client`, `@/lib/reloj`, `@/lib/sincronizacion`, `@/lib/storage`, `@/lib/strings`, `@/lib/types`, `@/lib/utils`, `@base-ui/react/button`, `@base-ui/react/dialog`, `@base-ui/react/merge-props`, `@base-ui/react/popover`, `@base-ui/react/slider`, `@base-ui/react/use-render`, `class-variance-authority`, `clsx`, `cn`, `lucide-react`, `next`, `next/link`, `next/navigation`, `react`, `tailwind-merge`
- Biblioteca estándar: `node:assert/strict`, `node:fs`, `node:test`

### Tests

- `apps/web/lib/alertas-sync.test.ts`: 0 pruebas
- `apps/web/lib/api-registro.test.ts`: 0 pruebas
- `apps/web/lib/catalogo.test.ts`: 0 pruebas
- `apps/web/lib/cola.test.ts`: 0 pruebas
- `apps/web/lib/engine.test.ts`: 0 pruebas
- `apps/web/lib/reloj.test.ts`: 0 pruebas
- `apps/web/lib/sincronizar.test.ts`: 0 pruebas
<!-- CONTEXT:AUTO:END -->
