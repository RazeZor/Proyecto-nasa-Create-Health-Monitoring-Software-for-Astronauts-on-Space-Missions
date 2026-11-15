# Módulo `apps/web`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Interfaz a bordo de VIGÍA: registro diario (<90 s), figura humana interactiva por sistema, tendencias con bandas de línea base, entorno de radiación/cabina, alertas con control de privacidad y escalamiento real, cola de informes con retardo, conexión con wearable y funcionamiento sin enlace, con datos reales o en modo demo.

## Puntos clave

- Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + componentes UI accesibles (`components/ui/*`) + three.js (solo el cuerpo 3D). Las gráficas son SVG propio (`components/shared/line-chart.tsx`, con exploración táctil del día).
- **Marca y sistema visual** (`docs/brand`, logotipo «Centinela»): tokens en `app/globals.css` (tinta Noche `#0B1020`, fondo Casco `#F2F5FA`, estados Normal/Atención/Alerta; tema claro por defecto), Space Grotesk e IBM Plex Mono empaquetadas con `@fontsource` (sin red). `components/shared/logo.tsx` dibuja el símbolo con el punto en el color del estado del sistema. Iconos propios en `components/shared/iconos.tsx` (y un `iconos.tsx` por pantalla); `lucide-react` solo para flechas y cierres. La navegación es una barra superior no fija (`components/shell/app-shell.tsx`), pensada para pantalla táctil de 19": objetivos de 48–56 px o más y nada depende de `hover`.
- **Cuerpo 3D** (`/`, `components/body/`): `escena.ts` (three.js, sin React) dibuja la piel translúcida y los órganos, late a los lpm del dato (`liveHr` del reloj o la FC en reposo del día; sin dato late tenue), y lleva la cámara al órgano de la vista elegida (un indicador o una zona). Carga `public/modelos/cuerpo.glb` (BodyParts3D, CC BY 4.0, varón adulto; atribución en `public/modelos/ATRIBUCION.md` y visible en el lienzo); si el archivo falta, genera una anatomía procedural (`anatomia.ts`: campos de distancia + «surface nets») con selector de modelo corporal. Sin WebGL se avisa con un texto (el estado de cada zona sigue en las tarjetas); ya no hay figura vectorial 2D. `body-stage.tsx` pone los marcadores táctiles y avisa en cada cuadro de dónde cae cada ancla; `body-view.tsx` dibuja con eso las líneas guía de las tarjetas. El estado por indicador sale de `analisis.indicatorStatus(day)` (`lib/engine.ts`): B, C y glucosa señalan su indicador y la capa A (NEWS2) los parámetros que puntúan. Las zonas con indicadores fuera de rango y los síntomas del día tiñen la piel en su ancla.
- **Registro guiado** (`components/checkin/`): una medida por paso con dial +/− y deslizador, sin teclado; cada dial arranca en el último valor conocido pero solo se guarda lo confirmado o ajustado (lo demás, `null`).
- **Dos modos de datos** (selector «Datos» de la barra superior; `lib/storage.ts`: `leerModo`, `usarModo`). `real` (por defecto; `NEXT_PUBLIC_VIGIA_MODO=demo` lo cambia): solo lo que el tripulante registra y el entorno medido; el registro se guarda en el día de misión de hoy y se sube a la API con `naturaleza: Real`. `demo`: tripulante simulado de 30 días con las anomalías de §5.5, todo rotulado; lo registrado en demo usa otro almacén (prefijo `vigia:` frente a `vigia:real:`) y **nunca** se sube ni escala. La API recibe el modo en `?modo=`. **Nada se inventa en modo real** (auditoría 2026-11-15): el simulador de pulso solo actúa en demo (`simulando` en `app-context.tsx`; la tarjeta de `/device` queda deshabilitada), el ánimo del registro solo se guarda si se confirma (`SIN_OMITIR` ya no lo incluye), los informes viajan con el retardo del perfil (`retardoEnvio`: solo demo lo acorta a 1 min), sin red `listarReportes` devuelve `null` y la pantalla avisa, las etiquetas «Real» de Entorno solo aparecen con datos y sin ningún registro el cuerpo dice «Aún no hay registro» en vez de «Todo en orden». El hilo con tierra se pide con `?modo=&lang=` y la API filtra los reportes de demo (`contenido.demo`). `NEXT_PUBLIC_VIGIA_PUBLICO=1` (al compilar) muestra en modo real el aviso de tripulante de prueba compartido del sitio público.
- **La app solo conoce la API, pero abre sin ella**: perfiles, fichas, referencia de entorno, historial, recordatorios, mensajes e informes salen de `apps/api`. `lib/catalogo.ts` (`cargarCatalogo(tripulante, modo)`) los pide al arrancar y guarda una copia local; si la API no responde, abre con esa copia (`catalogo.sinEnlace`), muestra «sin enlace» y reintenta cada 30 s y al volver la red. Solo la primera apertura en un dispositivo necesita enlace. `lib/etl-client.ts` hace lo mismo con el panel de entorno. No hay datos de ejemplo en el cliente: los mockups viven en `apps/api/demo/`.
- Sin conexión (§4.2): `public/sw.js` (escrito a mano, sin dependencias) guarda la carcasa (el HTML de las 8 pantallas, sus recursos de `/_next/static` y el modelo `/modelos/cuerpo.glb`) al instalarse; navegación con red primero y copia como respaldo; no intercepta `/vigia-api`. Se registra solo en producción (`components/shell/sw-register.tsx`). `app/manifest.ts` es el manifiesto. Si cambias las rutas, actualiza `PANTALLAS` en `sw.js`; si cambias la estrategia, sube la versión de `CACHE`.
- Motor híbrido: `packages/engine` evalúa las capas A, B y C y las reglas de contexto. `lib/engine.ts` (`analizar(checkIns, historial, presionCabinaMmHg)`) lo aplica al historial de la API más los registros locales; `AppProvider` lo recalcula en `analisis` al guardar un registro o cambiar de perfil. **El entorno entra al motor**: el CO2 real llega en ppm y se convierte con la presión de cabina del perfil activo (cambiar de perfil puede cambiar la alerta, §3.3); la tormenta sale del flujo (>= 10 pfu) o de un evento SEP real de DONKI. Cada alerta de entorno lleva su procedencia (`source`: Real o Simulado, fuente y fecha real). Una medida no tomada es `null`, nunca 0. Las alertas `informative` (capa B en adaptación) se muestran pero no cambian el estado ni avisan. La banda personal de las tendencias es la referencia del motor día a día (`analisis.band`).
- Privacidad y escalamiento (§5.4): solo el rojo de la capa A sale del dispositivo. `lib/alertas-sync.ts` (núcleo puro) y `sincronizarAlertasRojas` envían a `POST /tripulantes/{id}/alertas` el dato mínimo (indicador, valor, hora y tramo) de los rojos sobre registros propios, sin duplicar y reintentando sin red. `/alerts` muestra lo que salió de verdad (`GET .../escalamientos`), deja añadir contexto una vez y, como oficial médico, lee su bandeja real (`GET /escalamientos`). Verde y ámbar no salen; tras 3 días en ámbar se recomienda compartir. Las alertas de entorno se rotulan «compartida con la tripulación». En modo demo el escalamiento se rotula como simulado.
- Llamadas a la API: `lib/catalogo.ts`, `lib/etl-client.ts` y `lib/api-registro.ts` usan `/vigia-api` en el mismo origen; `next.config.mjs` lo reenvía a `VIGIA_API_INTERNA` (se lee al compilar; por defecto `http://127.0.0.1:8000`). En la LAN solo se expone el puerto 3000, sin CORS ni preflight de red privada. `NEXT_PUBLIC_VIGIA_API_URL` salta el proxy con una URL directa. La vista de entorno consume `/paneles`, `/escenarios/{nombre}/diario` y `/simulacion/kpi` sin generar series sintéticas.
- `lib/api-registro.ts` envía el registro a la API (`POST` de lecturas, síntomas y reportes) traduciendo las claves con `lib/vocabulario.json`, copia de `packages/schemas/vocabulario.json` que un test mantiene idéntica (si cambia el contrato: `cp packages/schemas/vocabulario.json apps/web/lib/`). No lanza sin red: devuelve `false` y el dato sigue en el almacén local. Prueba: `node --test apps/web/lib/*.test.ts` (Node 22.18+).
- El registro diario se sube a la API con `lib/sincronizacion.ts` (núcleo puro en `lib/sincronizar.ts`), solo en modo real: `AppProvider` envía los pendientes en orden al cambiar el análisis, al volver la red y cada 30 s si queda algo; la barra muestra cuántos faltan. Identidad provisional: `NEXT_PUBLIC_VIGIA_TRIPULANTE` (por defecto 1, el astronauta de `python3 -m almacen sembrar`). Los informes viven en la API con su `contenido` (lectura, línea base, entorno con procedencia y acción del día): `/reports` los lee cada 3 s; como cirujano de vuelo se puede responder un informe entregado. `t_real` es la hora real del envío.
- Reloj (`lib/reloj.ts`): con el dispositivo en «Conectar», `AppProvider` sondea `GET /tripulantes/{id}/reloj` cada 1,5 s y `siguienteEstado` (pura, con test) decide `connecting → connected → lost`: `connected` solo con una lectura de menos de 10 s; si no llega en 15 s, `lost`. Las órdenes (`iniciar_chequeo`, `medir_spo2`) van por `POST .../reloj/ordenes`. El simulador solo transmite cuando no hay reloj real. La app nunca habla con smart-monitor directamente. Del reloj también salen: la FC en reposo del día que precarga el registro (`fcReposoSugerida`: del chequeo, del sueño o del día despierto; nunca el pulso instantáneo, A.6), la SpO2 del reloj de las últimas 12 h (`spo2Sugerida`, sitio «Muñeca (reloj)», sube como `sensor`/`galaxy_watch4`; contrato `spo2_sitio: muneca`), el sueño estimado como sugerencia experimental, la curva de FC (`tramosSerie`, cortes en huecos > 3 s), HRV de 5 min, el aviso de cambio de instrumento, la tolerancia al movimiento y el CSV (`components/device/reloj-extras.tsx`) y, para `cmo`/`surgeon`, el estado de los relojes de la tripulación sin valores fisiológicos. Ante un cambio de instrumento el motor descarta la línea base y la ventana de la FC y pausa sus capas B y C 8 días (A.6); `cambiosDeInstrumento` lo detecta con `hrInstrument` de los registros y `fc_instrumento` del historial. **Conexión guiada** (auditoría 2026-11-15): `components/device/pasos-conexion.tsx` muestra cuatro pasos (API → smart-monitor → reloj vinculado y transmitiendo → pulso en la muñeca) con `pasosConexion` (pura, `lib/reloj.ts`), marca el que falla y dice qué hacer con la URL real de smart-monitor (`puente.url_live`) y la que hay que escribir en el reloj (`puente.url_reloj_sugerida`); si el reloj no está vinculado lista los nombres que ve el servidor (`GET /reloj/tripulacion`) y «Este es mi reloj» llama a `POST /tripulantes/{id}/reloj/vinculo`. La vigencia de la lectura usa `recibido_hace_s` de la API (no la hora del reloj). El estado «Conectar» se recuerda en `localStorage` (`vigia:reloj`) y se reconecta solo al abrir.
- Sigue el modelo de tres roles (`astronaut`, `cmo`, `surgeon`) y cinco perfiles de misión (`station`: 760, `transit`: 760, `transit-docked`: 527, `lunar`: 424, `mars`: 424 mmHg) con conversión de CO2 de ppm a mmHg según la presión total de cabina.
- i18n: ningún texto visible es literal. `lib/strings.ts` da forma y tipos a las claves `web.*` de `packages/i18n` (español e inglés); el idioma se resuelve en el navegador (preferencia guardada o idioma del navegador) y cambiarlo recarga la página. Las fichas y los recordatorios se piden a la API con `?lang=` (traducciones en `packages/schemas/fichas_en`); los nombres de perfil salen de `web.S.profiles`. Los mensajes de tierra y los errores de la API siguen en español.
- **Rutas por rol** (`lib/roles.ts`, `app/[rol]/`): `/` solo elige el rol; cada uno entra a su tablero: `/astronauta` (cuerpo, `/body` es el mismo, `/check-in`, `/trends`, `/environment`, `/alerts`, `/reports`, `/device`, `/about`), `/oficial` (tripulación: relojes y bandeja de avisos escalados; `/body`, `/ficha`, `/alerts`, `/environment`, `/device`, `/about`) y `/medico` (informes en Tierra; `/body`, `/ficha`, `/alerts`, `/environment`, `/about`). Oficial y médico tienen dos modos sobre el mismo selector de tripulantes (`crew-body.tsx`): «Tiempo real» (`/body`, su cuerpo de hoy con una rueda (`shared/rueda-giro.tsx`) como único modo de girarlo, una vuelta completa (`giroExtra`; sin balanceo ni arrastre: `sinBalanceo`, `sinArrastre`); vuelve el día al actual) e «Histórico» (`/ficha`, `historico.tsx`: elige el día de misión, minicuerpo (miniatura quieta del cuerpo de tiempo real: el mismo modelo 3D en pequeño, con los órganos teñidos según el estado de ese día; no gira) y `TrendsView`). El encabezado solo muestra el día de misión; cambiarlo es cosa del modo Histórico (el astronauta ya no lo mueve). Este conmutador es aparte de Demo/Real (de dónde salen los datos). `/body` es el cuerpo de cada tripulante en solo lectura: `crew-body.tsx` (`CuerpoTripulacion`, con la vista como parámetro) pide `historial` ajeno (`cargarHistorialAjeno`, queda auditado como `lectura_ajena`) y lo muestra con `VerComo`; el astronauta ve el suyo (`/astronauta` y `/astronauta/body`), sin selector. shortcut: el médico actúa con el id del oficial médico hasta tener autenticación. El rol sale de la ruta (`role` en `useApp()`, sin selector); una pantalla que el rol no tiene da 404 (`lib/guardia.ts`; en export estático el estado HTTP es 200 con la página 404). Menú, avisos emergentes y banners de registro son del astronauta: el estado personal (logo, «Vigilar», toasts) no se muestra a los otros roles. Enlaces entre pantallas con `rutaDe(rol, seccion)`. Si cambias las rutas, actualiza `PANTALLAS` en `public/sw.js` (lo comprueba `lib/roles.test.ts`). shortcut: la ruta solo cambia la vista; el servidor no comprueba el rol hasta la autenticación (#46).

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
| [app/[rol]/about/page.tsx](app/[rol]/about/page.tsx) | 7 | — |
| [app/[rol]/alerts/page.tsx](app/[rol]/alerts/page.tsx) | 7 | — |
| [app/[rol]/body/page.tsx](app/[rol]/body/page.tsx) | 11 | — |
| [app/[rol]/check-in/page.tsx](app/[rol]/check-in/page.tsx) | 7 | — |
| [app/[rol]/device/page.tsx](app/[rol]/device/page.tsx) | 7 | — |
| [app/[rol]/environment/page.tsx](app/[rol]/environment/page.tsx) | 7 | — |
| [app/[rol]/ficha/page.tsx](app/[rol]/ficha/page.tsx) | 7 | — |
| [app/[rol]/layout.tsx](app/[rol]/layout.tsx) | 9 | — |
| [app/[rol]/page.tsx](app/[rol]/page.tsx) | 10 | — |
| [app/[rol]/reports/page.tsx](app/[rol]/reports/page.tsx) | 7 | — |
| [app/[rol]/trends/page.tsx](app/[rol]/trends/page.tsx) | 7 | — |
| [app/layout.tsx](app/layout.tsx) | 43 | — |
| [app/manifest.ts](app/manifest.ts) | 21 | — |
| [app/page.tsx](app/page.tsx) | 5 | — |
| [components/about/about-view.tsx](components/about/about-view.tsx) | 247 | — |
| [components/about/iconos.tsx](components/about/iconos.tsx) | 63 | Iconos de la pantalla Acerca de, con el lenguaje de `components/shared/iconos.tsx`: rejilla de 24 px, |
| [components/alerts/alerts-view.tsx](components/alerts/alerts-view.tsx) | 432 | — |
| [components/alerts/iconos.tsx](components/alerts/iconos.tsx) | 92 | Iconos de las alertas y de los avisos emergentes: privacidad (quién lo ve) y tipo de aviso. Mismo lenguaje que |
| [components/app-context.tsx](components/app-context.tsx) | 257 | — |
| [components/body/anatomia.ts](components/body/anatomia.ts) | 319 | Anatomía procedural del cuerpo 3D: todo se genera con matemáticas (campos de distancia con signo) y se |
| [components/body/body-stage.tsx](components/body/body-stage.tsx) | 135 | — |
| [components/body/body-view.tsx](components/body/body-view.tsx) | 595 | — |
| [components/body/ecg.tsx](components/body/ecg.tsx) | 82 | — |
| [components/body/escena.ts](components/body/escena.ts) | 700 | Escena 3D del cuerpo (three.js): silueta translúcida, órganos animados y una cámara que viaja al órgano del |
| [components/checkin/checkin-form.tsx](components/checkin/checkin-form.tsx) | 762 | — |
| [components/checkin/controles.tsx](components/checkin/controles.tsx) | 141 | — |
| [components/checkin/iconos.tsx](components/checkin/iconos.tsx) | 95 | Iconos del registro diario, con el mismo lenguaje que `components/shared/iconos.tsx`: rejilla de 24 px, |
| [components/crew/crew-body.tsx](components/crew/crew-body.tsx) | 101 | — |
| [components/crew/crew-view.tsx](components/crew/crew-view.tsx) | 22 | — |
| [components/crew/historico.tsx](components/crew/historico.tsx) | 54 | — |
| [components/device/device-view.tsx](components/device/device-view.tsx) | 338 | — |
| [components/device/fc-chart.tsx](components/device/fc-chart.tsx) | 62 | — |
| [components/device/iconos.tsx](components/device/iconos.tsx) | 117 | Iconos e ilustración de la pantalla Dispositivo, con el lenguaje de `components/shared/iconos.tsx`: |
| [components/device/pasos-conexion.tsx](components/device/pasos-conexion.tsx) | 98 | — |
| [components/device/reloj-extras.tsx](components/device/reloj-extras.tsx) | 144 | — |
| [components/device/switch.tsx](components/device/switch.tsx) | 25 | — |
| [components/environment/environment-view.tsx](components/environment/environment-view.tsx) | 466 | — |
| [components/environment/iconos.tsx](components/environment/iconos.tsx) | 65 | Iconos de la pantalla Entorno, con el mismo lenguaje que `components/shared/iconos.tsx`: rejilla de 24 px, |
| [components/reports/iconos.tsx](components/reports/iconos.tsx) | 51 | Iconos de los informes: los dos extremos del enlace (nave y Tierra) y el mensaje que viaja entre ellos. Mismo |
| [components/reports/reports-view.tsx](components/reports/reports-view.tsx) | 272 | — |
| [components/reports/trayecto.tsx](components/reports/trayecto.tsx) | 74 | — |
| [components/shared/delay-countdown.tsx](components/shared/delay-countdown.tsx) | 36 | — |
| [components/shared/iconos.tsx](components/shared/iconos.tsx) | 140 | Iconos propios de VIGÍA, dibujados para esta aplicación (no vienen de una librería). Mismo lenguaje en todos: |
| [components/shared/indicator-card.tsx](components/shared/indicator-card.tsx) | 66 | — |
| [components/shared/line-chart.tsx](components/shared/line-chart.tsx) | 262 | — |
| [components/shared/logo.tsx](components/shared/logo.tsx) | 42 | Marca VIGÍA («Centinela»), tal como la define docs/brand: el casco, la V con su cabeza y el punto de estado. |
| [components/shared/rueda-giro.tsx](components/shared/rueda-giro.tsx) | 70 | — |
| [components/shared/states.tsx](components/shared/states.tsx) | 50 | — |
| [components/shared/status.tsx](components/shared/status.tsx) | 73 | — |
| [components/shell/alert-center.tsx](components/shell/alert-center.tsx) | 219 | — |
| [components/shell/app-shell.tsx](components/shell/app-shell.tsx) | 276 | — |
| [components/shell/sw-register.tsx](components/shell/sw-register.tsx) | 15 | — |
| [components/start/elegir-rol.tsx](components/start/elegir-rol.tsx) | 35 | — |
| [components/trends/iconos.tsx](components/trends/iconos.tsx) | 46 | Iconos de la ficha del indicador, con el mismo lenguaje que `components/shared/iconos.tsx`: rejilla de 24 px, |
| [components/trends/resumen.ts](components/trends/resumen.ts) | 44 | — |
| [components/trends/trends-view.tsx](components/trends/trends-view.tsx) | 266 | — |
| [components/ui/badge.tsx](components/ui/badge.tsx) | 51 | — |
| [components/ui/button.tsx](components/ui/button.tsx) | 57 | — |
| [components/ui/card.tsx](components/ui/card.tsx) | 102 | — |
| [components/ui/dialog.tsx](components/ui/dialog.tsx) | 161 | — |
| [components/ui/popover.tsx](components/ui/popover.tsx) | 89 | — |
| [components/ui/sheet.tsx](components/ui/sheet.tsx) | 139 | — |
| [components/ui/slider.tsx](components/ui/slider.tsx) | 51 | — |
| [lib/alertas-sync.test.ts](lib/alertas-sync.test.ts) | 52 | — |
| [lib/alertas-sync.ts](lib/alertas-sync.ts) | 35 | Núcleo puro del escalamiento de alertas rojas (§5.4): sin red ni almacenamiento, que se inyectan. |
| [lib/api-registro.test.ts](lib/api-registro.test.ts) | 61 | — |
| [lib/api-registro.ts](lib/api-registro.ts) | 160 | Cliente de registro hacia apps/api (lecturas, síntomas y reportes). Traduce las claves de la interfaz |
| [lib/catalogo.test.ts](lib/catalogo.test.ts) | 35 | — |
| [lib/catalogo.ts](lib/catalogo.ts) | 208 | Todo lo que la app muestra y no escribe el usuario sale de la API: perfiles, fichas, referencia de |
| [lib/cola.test.ts](lib/cola.test.ts) | 35 | — |
| [lib/cola.ts](lib/cola.ts) | 41 | Estado de un reporte de la cola hacia Tierra: de la API si la hay y, si no, calculado con el reloj local. |
| [lib/engine.test.ts](lib/engine.test.ts) | 172 | — |
| [lib/engine.ts](lib/engine.ts) | 281 | Análisis de la app: el historial que da la API (GET /tripulantes/{id}/historial, en modo real o demo) más |
| [lib/etl-client.ts](lib/etl-client.ts) | 166 | Cliente HTTP de solo lectura hacia apps/api (zona gold del ETL en pipelines/reanclaje). |
| [lib/guardia.ts](lib/guardia.ts) | 8 | — |
| [lib/reloj.test.ts](lib/reloj.test.ts) | 79 | — |
| [lib/reloj.ts](lib/reloj.ts) | 259 | Reloj en vivo (Galaxy Watch4) a través de apps/api: la app no habla con el servidor del reloj, solo con |
| [lib/roles.test.ts](lib/roles.test.ts) | 52 | — |
| [lib/roles.ts](lib/roles.ts) | 27 | Quién usa la app lo dice la ruta: /astronauta, /oficial y /medico. Cada rol ve sus propias pantallas. |
| [lib/sincronizacion.ts](lib/sincronizacion.ts) | 57 | — |
| [lib/sincronizar.test.ts](lib/sincronizar.test.ts) | 31 | — |
| [lib/sincronizar.ts](lib/sincronizar.ts) | 22 | Núcleo puro de la sincronización del registro diario con la API (sin red ni almacenamiento: se inyectan). |
| [lib/storage.ts](lib/storage.ts) | 91 | — |
| [lib/strings.ts](lib/strings.ts) | 934 | Textos de la interfaz. Ninguno es literal: todos salen de packages/i18n (`locales/es.json`, subárbol `web`; |
| [lib/types.ts](lib/types.ts) | 188 | — |
| [lib/utils.ts](lib/utils.ts) | 10 | — |
| [next.config.mjs](next.config.mjs) | 21 | @type {import('next').NextConfig} |
| [postcss.config.mjs](postcss.config.mjs) | 8 | @type {import('postcss-load-config').Config} |
| [public/sw.js](public/sw.js) | 76 | Service worker de VIGÍA: deja la aplicación disponible sin enlace (informe §4.2, "todo funciona sin enlace"). |

### API pública

**app/[rol]/about/page.tsx**

- función `Page`

**app/[rol]/alerts/page.tsx**

- función `Page`

**app/[rol]/body/page.tsx**

- función `Page`

**app/[rol]/check-in/page.tsx**

- función `Page`

**app/[rol]/device/page.tsx**

- función `Page`

**app/[rol]/environment/page.tsx**

- función `Page`

**app/[rol]/ficha/page.tsx**

- función `Page`

**app/[rol]/layout.tsx**

- constante `dynamicParams`
- constante `generateStaticParams`
- función `Layout`

**app/[rol]/page.tsx**

- función `Page`

**app/[rol]/reports/page.tsx**

- función `Page`

**app/[rol]/trends/page.tsx**

- función `Page`

**app/layout.tsx**

- constante `metadata`
- constante `viewport`
- función `RootLayout`

**app/manifest.ts**

- función `manifest`

**app/page.tsx**

- función `Page`

**components/about/about-view.tsx**

- función `AboutView`

**components/about/iconos.tsx**

- constante `IconoPrivacidad`
- constante `IconoSinConexion`
- constante `IconoCapas`
- constante `IconoDatos`
- constante `IconoResultados`
- constante `IconoLimites`

**components/alerts/alerts-view.tsx**

- función `Bandeja`
- función `AlertsView`

**components/alerts/iconos.tsx**

- tipo `Icono`
- constante `IconoCandado`
- constante `IconoCompartida`
- constante `IconoEscalada`
- constante `IconoTripulacion`
- constante `IconoMatraz`
- constante `IconoReloj`
- constante `IconoInfo`
- constante `IconoCalma`
- constante `IconoEscudoAviso`
- constante `IconoCampana`
- constante `IconoVisto`

**components/app-context.tsx**

- tipo `Sex`
- función `AppProvider`
- función `VerComo`
- función `useApp`

**components/body/anatomia.ts**

- tipo `Vec3`
- tipo `Sdf`
- tipo `Sexo`
- interfaz `Malla`
- constante `smin`
- función `elipsoide`
- función `conoRedondo`
- función `union`
- interfaz `Medidas`
- función `medidas`
- función `cuerpo`
- función `corazon`
- función `pulmones`
- función `cerebro`
- constante `higado`
- constante `estomago`
- constante `pancreas`
- constante `rinones`
- constante `ojos`
- función `mallar`
- función `trazados`
- constante `ANCLAS`
- tipo `AnclaId`

**components/body/body-stage.tsx**

- interfaz `Marcador`
- función `BodyStage`

**components/body/body-view.tsx**

- función `BodyView`

**components/body/ecg.tsx**

- función `Ecg`

**components/body/escena.ts**

- tipo `Vista`
- interfaz `ZonaCaliente`
- interfaz `EstadoEscena`
- tipo `Proyeccion`
- función `crearEscena`
- tipo `Escena`

**components/checkin/checkin-form.tsx**

- función `CheckInScreen`

**components/checkin/controles.tsx**

- función `Dial`
- función `Opciones`

**components/checkin/iconos.tsx**

- constante `ICONO_SINTOMA`
- constante `IconoMolestias`
- constante `IconoHecho`
- constante `IconoSinMedir`
- constante `IconoPendiente`
- constante `IconoCrono`
- constante `IconoMenos`
- constante `IconoMas`

**components/crew/crew-body.tsx**

- función `CuerpoTripulacion`

**components/crew/crew-view.tsx**

- función `CrewView`

**components/crew/historico.tsx**

- función `Historico`

**components/device/device-view.tsx**

- función `DeviceView`

**components/device/fc-chart.tsx**

- constante `COLOR_PULSO`
- función `FcChart`

**components/device/iconos.tsx**

- constante `IconoSimulador`
- constante `IconoMovimiento`
- constante `IconoDescarga`
- constante `IconoTripulacion`
- constante `IconoChequeo`
- constante `IconoPunto`
- función `RelojIlustracion`

**components/device/pasos-conexion.tsx**

- función `PasosConexion`

**components/device/reloj-extras.tsx**

- función `CrewWatches`
- función `WatchSettings`

**components/device/switch.tsx**

- función `SwitchTrack`
- función `Switch`

**components/environment/environment-view.tsx**

- función `EnvironmentView`

**components/environment/iconos.tsx**

- constante `IconoTormenta`
- constante `IconoCo2`
- constante `IconoDosis`
- constante `IconoHumedad`
- constante `IconoPresion`
- constante `IconoDatos`

**components/reports/iconos.tsx**

- tipo `Icono`
- constante `IconoNave`
- constante `IconoTierra`
- constante `IconoSobre`
- constante `IconoRespuesta`
- constante `IconoEspera`
- constante `IconoVisto`

**components/reports/reports-view.tsx**

- función `ReportsView`

**components/reports/trayecto.tsx**

- función `Trayecto`

**components/shared/delay-countdown.tsx**

- función `formatDelay`
- función `useReportState`
- función `DelayCountdown`

**components/shared/iconos.tsx**

- tipo `Icono`
- constante `ICONO_INDICADOR`
- constante `IconoCuerpo`
- constante `IconoRegistro`
- constante `IconoTendencias`
- constante `IconoEntorno`
- constante `IconoAlertas`
- constante `IconoInformes`
- constante `IconoDispositivo`
- constante `IconoAcerca`

**components/shared/indicator-card.tsx**

- función `IndicatorCard`

**components/shared/line-chart.tsx**

- función `LineChart`

**components/shared/logo.tsx**

- función `Simbolo`
- función `Palabra`
- función `Logo`

**components/shared/rueda-giro.tsx**

- función `RuedaGiro`

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

**components/start/elegir-rol.tsx**

- función `ElegirRol`

**components/trends/iconos.tsx**

- constante `IconoQueEs`
- constante `IconoPorQue`
- constante `IconoRiesgo`
- constante `IconoPrevencion`

**components/trends/resumen.ts**

- tipo `Lugar`
- interfaz `Resumen`
- función `resumir`

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
- constante `retardoEnvio`
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
- constante `cargarHistorialAjeno`

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

**lib/guardia.ts**

- función `seccionDe`

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
- tipo `PasoConexionId`
- interfaz `PasoConexion`
- función `pasosConexion`
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
- función `vincularReloj`
- función `cambiarTolerancia`
- función `descargarCsvReloj`

**lib/roles.ts**

- constante `RUTA_DE_ROL`
- tipo `Seccion`
- constante `SECCIONES`
- constante `permitida`
- función `rolDeRuta`
- constante `rutaDe`

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

- Variables de entorno: `NEXT_PUBLIC_VIGIA_API_URL`, `NEXT_PUBLIC_VIGIA_MODO`, `NEXT_PUBLIC_VIGIA_PUBLICO`, `NEXT_PUBLIC_VIGIA_TRIPULANTE`, `NODE_ENV`, `VIGIA_API_INTERNA`

### Dependencias

- Internas: `../../../packages/engine/engine.ts`, `../../../packages/engine/fixtures/caso-referencia.json`, `../../../packages/i18n/i18n.ts`, `./alertas-sync`, `./alertas-sync.ts`, `./api-registro`, `./api-registro.ts`, `./catalogo.ts`, `./cola.ts`, `./engine.ts`, `./globals.css`, `./reloj.ts`, `./roles.ts`, `./sincronizar`, `./sincronizar.ts`, `./storage`, `./storage.ts`, `./strings`, `./strings.ts`, `./types`, `./types.ts`, `./vocabulario.json`
- Externas: `@/components/about/about-view`, `@/components/about/iconos`, `@/components/alerts/alerts-view`, `@/components/alerts/iconos`, `@/components/app-context`, `@/components/body/anatomia`, `@/components/body/body-stage`, `@/components/body/body-view`, `@/components/body/ecg`, `@/components/body/escena`, `@/components/checkin/checkin-form`, `@/components/checkin/controles`, `@/components/checkin/iconos`, `@/components/crew/crew-body`, `@/components/crew/crew-view`, `@/components/crew/historico`, `@/components/device/device-view`, `@/components/device/fc-chart`, `@/components/device/iconos`, `@/components/device/pasos-conexion`, `@/components/device/reloj-extras`, `@/components/device/switch`, `@/components/environment/environment-view`, `@/components/environment/iconos`, `@/components/reports/iconos`, `@/components/reports/reports-view`, `@/components/reports/trayecto`, `@/components/shared/delay-countdown`, `@/components/shared/iconos`, `@/components/shared/indicator-card`, `@/components/shared/line-chart`, `@/components/shared/logo`, `@/components/shared/rueda-giro`, `@/components/shared/states`, `@/components/shared/status`, `@/components/shell/alert-center`, `@/components/shell/app-shell`, `@/components/shell/sw-register`, `@/components/start/elegir-rol`, `@/components/trends/iconos`, `@/components/trends/resumen`, `@/components/trends/trends-view`, `@/components/ui/button`, `@/components/ui/dialog`, `@/lib/alertas-sync`, `@/lib/api-registro`, `@/lib/catalogo`, `@/lib/cola`, `@/lib/engine`, `@/lib/etl-client`, `@/lib/guardia`, `@/lib/reloj`, `@/lib/roles`, `@/lib/sincronizacion`, `@/lib/storage`, `@/lib/strings`, `@/lib/types`, `@/lib/utils`, `@base-ui/react/button`, `@base-ui/react/dialog`, `@base-ui/react/merge-props`, `@base-ui/react/popover`, `@base-ui/react/slider`, `@base-ui/react/use-render`, `@fontsource-variable/space-grotesk`, `@fontsource/ibm-plex-mono/400.css`, `@fontsource/ibm-plex-mono/500.css`, `@fontsource/ibm-plex-mono/600.css`, `class-variance-authority`, `clsx`, `cn`, `lucide-react`, `next`, `next/link`, `next/navigation`, `react`, `tailwind-merge`, `three`, `three/examples/jsm/loaders/GLTFLoader.js`, `three/examples/jsm/utils/BufferGeometryUtils.js`
- Biblioteca estándar: `node:assert/strict`, `node:fs`, `node:test`

### Tests

- `apps/web/lib/alertas-sync.test.ts`: 0 pruebas
- `apps/web/lib/api-registro.test.ts`: 0 pruebas
- `apps/web/lib/catalogo.test.ts`: 0 pruebas
- `apps/web/lib/cola.test.ts`: 0 pruebas
- `apps/web/lib/engine.test.ts`: 0 pruebas
- `apps/web/lib/reloj.test.ts`: 0 pruebas
- `apps/web/lib/roles.test.ts`: 0 pruebas
- `apps/web/lib/sincronizar.test.ts`: 0 pruebas
<!-- CONTEXT:AUTO:END -->
