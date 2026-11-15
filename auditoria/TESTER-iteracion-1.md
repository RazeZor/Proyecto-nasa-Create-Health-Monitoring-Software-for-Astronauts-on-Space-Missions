# Tester (juez de hackatón) · iteración 1

Fecha: 2026-11-15, 01:40–05:05 (UTC-3). Rama `fix/auditoria-final`; el recorrido de rutas se hizo sobre `20a311f` (= `origin/main`); las corridas posteriores (estados, flujo, recomprobación) se ejecutaron sobre el árbol de trabajo, **que otro agente estaba modificando en paralelo** (14 archivos cambiados al cierre: `checkin-form.tsx`, `app-context.tsx`, `rutas_dashboard.py`, catálogos i18n, etc.). Donde importa se indica qué versión se observó.

Herramientas: Chrome sin cabeza (puppeteer-core 25.17, SwiftShader), viewports 1280×800 y 390×844. Capturas y textos extraídos en `C:\Users\ASUS-07\AppData\Local\Temp\claude\74a4dbc3801d4802\165b8463-03bf-4b2d-a8a9-ce9d4b5e5cad\scratchpad\tester\capturas\` (los nombres de archivo de la tabla son relativos a esa carpeta). Resultados en bruto (JSON) en la carpeta padre `tester\`.

Entorno probado:

- `next dev` en :3000 (ya en marcha, no se reinició) y la API en :8000 (ya en marcha, **no se tocó**).
- Para separar fallos de la app de la API desactualizada (hallazgo T01) se levantó una **segunda copia de la API con el código actual del repo en :8001**, con base SQLite propia en el scratchpad (`vigia-test.db`, sembrada con `almacen sembrar`), y se redirigieron las peticiones `/vigia-api/*` del navegador a ella con `setRequestInterception`. No se modificó ningún archivo del repo.
- Sitio público https://vigia.smoraleslo.dev, siempre en contexto de navegador nuevo (sin cookies ni localStorage).

## Resumen (10 líneas)

1. **La API local en :8000 corre código viejo** (proceso lanzado el 14-11 18:55, antes de los PR 63–65): `historial?modo=real` devuelve el tripulante simulado (44 lecturas, día 24) y la app lo pinta como «Medido»; `/tripulacion` da 404; `fichas` y `recordatorios` ignoran `lang=en`; la demo abre en día 24 «Todo en orden» sin ninguna anomalía. Todo lo que un juez vería hoy en local en modo real es simulación disfrazada de real. Reiniciar `uvicorn` lo corrige (verificado contra :8001).
2. **El sitio público sirve la interfaz anterior** (barra lateral, cuerpo 2D, tema oscuro), no el cuerpo 3D de `main`; y en modo real (el de por defecto) un visitante nuevo ve en «día 2» una alerta roja «Actuar · NEWS2 6 pts · escalada al oficial médico» y «dolor de cabeza» de registros de otra persona: el tripulante 1 es compartido por todos los visitantes.
3. **`/about` está íntegramente en español con `lang=en`** (`about-view.tsx` es componente de servidor y `S` se resuelve con `IDIOMA = "es"`); es la pantalla que explica el proyecto al jurado.
4. **En móvil (390 px) solo se ven las pestañas Cuerpo y Registro**; Tendencias, Entorno, Alertas, Informes, Dispositivo y Acerca de quedan ocultas en una barra desplazable sin ningún indicio.
5. Textos en español con `lang=en` en todas las combinaciones: recordatorios, fichas de indicador, fuentes de entorno, informes y mensajes del hilo, unidad «puntos (1 a 10)», `<title>` (lista literal al final). Con la API actual se arreglan fichas y recordatorios; el resto persiste.
6. **Modo real vacío** (API actual, cero mediciones): «Todo en orden · Todos los indicadores dentro de tu rango esperado», cinco zonas «OK» y cuerpo rotulado «Medido» sin un solo dato.
7. **Carga**: página completamente en blanco (sin esqueleto ni «Cargando…») durante más de 4 s con red lenta. **Error sin copia local**: pantalla clara con «Reintentar», pero sin cabecera ni aviso de prototipo. **Con copia local** funciona y lo avisa.
8. **El flujo completo en modo real funciona**: registro normal guardado, visible en Cuerpo y Tendencias y subido a la API (7 lecturas, `origen=manual`); registro rojo (135 lpm, SpO2 90) → «Actúa ahora», alerta «Escalada · Enviado automáticamente al Oficial Médico», `GET /escalamientos` lo refleja (id 1 → destinatario 2) tanto en :8000 como en :8001. Los avisos emergentes tapan el contenido y disparan `AudioContext`/`vibrate` sin gesto (error de consola).
9. **Sin conexión**: en dev no hay service worker (0 registrados) y navegar entre pantallas acaba en `chrome-error` (RSC payload); en el sitio público el SW (`vigia-carcasa-v1`, 33 entradas) permite navegar y recargar sin red.
10. En el árbol de trabajo actual aparece un **error de hidratación de React en toda página con `lang=en`** (HTML servido en español, cliente en inglés); no se vio en el recorrido sobre `20a311f`. Los registros de prueba quedaron en `apps/api/data/vigia.db` (lecturas 5–18, alerta 1, escalamiento 1): limpiar.

## 1. Primera impresión como juez

- **Qué es / para quién (10 s):** el nombre VIGÍA, el cuerpo 3D, «Estado general · Todo en orden» y el selector «Ver como: Astronauta / Oficial Médico / Cirujano de Vuelo» dejan claro que es un monitor de salud del propio astronauta. El lema «Monitor de autosalud de la tripulación» solo está en el `<title>` y en `/about`; no hay un titular en la pantalla principal.
- **Flujo REUNIR → EVALUAR → ACTUAR:** no se nombra como tal en ninguna pantalla. Está implícito: botón «Iniciar registro» (reunir) → tarjeta de estado y zonas (evaluar) → «Qué hacer ahora» en el resultado del registro y en Alertas (actuar). `/about` sí lo explica en tres pasos («1. Registras · 2. VIGÍA compara · 3. Sabes qué hacer»), pero en inglés sale en español (T04). Un juez que no lea `/about` lo infiere, no lo ve.
- **Aviso de prototipo:** presente en el pie de todas las pantallas («Prototipo de apoyo a la decisión. No es un dispositivo médico…»), en 12 px y color atenuado; visible pero discreto. En el árbol de trabajo actual ya incluye «reglas de prototipo … no límites de vuelo validados clínicamente».
- **Distintivo DEMO/Simulado:** en modo demo hay banda «Modo demo: tripulante simulado con anomalías inyectadas» en las 8 rutas y el cuerpo lleva la etiqueta «Simulado»; en móvil la banda se trunca («Demo mode: simulated crew m…») pero se ve. En modo real no hay banda (correcto), pero con la API :8000 el cuerpo muestra datos simulados con la etiqueta «Medido» (T01). En Entorno, modo real con :8000, los paneles de protones y CO2 llevan «Simulado» y el aviso «Sin datos de entorno publicados»; con la API actual muestra `mision-real` con datos reales.

## 2. Tabla de hallazgos

Gravedad: bloqueante / alta / media / baja. Modo: real, demo, ambos, público.

| Id | Grav. | Pantalla | Modo | Descripción | Pasos | Captura |
|---|---|---|---|---|---|---|
| T01 | bloqueante (entorno local) | todas | real y demo | La API en :8000 es un proceso del 14-11 18:55 (antes de los PR 63–65). `GET /tripulantes/1/historial?modo=real` devuelve `naturaleza: Simulado`, 44 lecturas, `dia_actual 24`, sin campo `modo`; `/tripulacion` → 404; `/fichas?lang=en` y `recordatorios?lang=en` responden en español. La app muestra la fisiología simulada como «Medido», la demo abre en día 24 sin anomalías y el registro real se guarda en «día 24» mientras la API lo ancla a `D002`. Contra :8001 (código actual) todo esto desaparece. | `curl -H "X-Tripulante: 1" localhost:8000/tripulantes/1/historial?modo=real`; comparar con :8001. Abrir `/?modo=real`. | `real-es-escritorio-home.png`, `estado-vacio-real-home.png` (API actual) |
| T02 | alta | todas | público | El sitio público sirve la interfaz anterior (barra lateral numerada, cuerpo 2D Female/Male, tema oscuro), no el cuerpo 3D ni la cabecera de `main`. Su API sí es reciente (`/tripulacion` existe, demo en día 27). | Abrir https://vigia.smoraleslo.dev/?modo=demo&lang=en | `publico-home-demo-en.png` |
| T03 | alta | Cuerpo, Entorno, Alertas | público, real | Visitante nuevo sin cookies: en modo real (por defecto) ve «Día 02/30», avisos «Actuar · Puntaje clínico NEWS2 6 pts · Escala automáticamente al oficial médico» y «Vigilar · Dolor de cabeza» creados por otra persona. Sin autenticación todos los visitantes son el tripulante 1 y comparten registros y escalamientos. Un juez puede creer que la app arranca en rojo o que ve datos ajenos. | Ventana privada → https://vigia.smoraleslo.dev/ | `publico-environment-real-es.png`, `publico-home-real-es.png` |
| T04 | alta | Acerca de | ambos, `lang=en` | Toda la página en español (título «Acerca de VIGÍA», lema, los tres pasos, capas A/B/C, privacidad, resultados de la simulación, límites, uso de IA). `about-view.tsx` no es cliente, así que `S` se evalúa en el servidor con `IDIOMA="es"`. Las claves `web.S.about.*` sí existen traducidas en `en.json`. | `/about?lang=en` | `real-en-escritorio-about.png`, `recheck-about-en.png` |
| T05 | alta | todas | ambos, móvil | A 390 px la barra de pestañas solo muestra «Cuerpo» y «Registro» (la segunda recortada); las otras seis secciones quedan fuera de un `overflow-x-auto` sin flecha, menú ni degradado. `S.nav.openMenu` existe pero no hay botón de menú. | Abrir cualquier ruta a 390×844 | `real-es-movil-home.png`, `demo-en-movil-alerts.png` |
| T06 | media | Cuerpo, Alertas, Tendencias | demo | Con :8000 la demo está en día 24: «Todo en orden», «Hoy no hay alertas activas», gráfica sin deriva. La demo no enseña ninguna de las tres anomalías prometidas en la banda. Con la API actual: día 27, «Hay algo que vigilar», 2 alertas Vigilar (FC CUSUM 5.1, sueño 4.3 h). Causa: T01. | `/alerts?modo=demo` | `demo-es-escritorio-alerts.png` vs `api-actual-demo-es-alerts.png`; `demo-es-escritorio-home.png` vs `api-actual-demo-es-home.png` |
| T07 | media | Cuerpo | real (API actual) | Con cero mediciones: «Todo en orden · Todos los indicadores dentro de tu rango esperado», las cinco zonas «OK» y el cuerpo con etiqueta «Medido». Las tarjetas sí dicen «Sin medir hoy» y «—». El estado general debería ser «sin datos». | API actual, base vacía, `/?modo=real` | `estado-vacio-real-home.png` |
| T08 | media | todas | ambos | Carga: con red lenta (800 ms de latencia, 200 kB/s) la página está completamente en blanco a los 1,5 s y a los 4 s; no hay esqueleto, cabecera ni «Cargando…». | Emular red lenta y abrir `/?modo=demo` | `estado-cargando-home-1500ms.png`, `estado-cargando-home-4000ms.png` |
| T09 | media | Registro (resultado), Cuerpo | ambos | Los avisos automáticos (toasts) se apilan sobre el contenido: en el resultado del registro rojo tapan «Actúa ahora. Sigue el pro…» y parte de «Ver mi cuerpo»; en el público tapan la barra superior. Además intentan sonar y vibrar sin gesto del usuario: `The AudioContext was not allowed to start` (warn ×3) y `Blocked call to navigator.vibrate` (error) en cada página con alertas. | Registrar 135 lpm / SpO2 90 y mirar el resultado | `flujo-api8000-rojo-resultado.png`, `publico-home-demo-en.png` |
| T10 | media | Cuerpo, Tendencias, Entorno, Informes | ambos, `lang=en` | Texto en español procedente de la API/datos (lista completa en §3): recordatorios, fichas, fuentes de entorno, informes y mensajes del hilo, «puntos (1 a 10)», `<title>`. Con la API actual las fichas y los recordatorios salen en inglés; siguen en español las fuentes de `/entorno/referencia`, el hilo y los informes de demo, la unidad del ánimo y el título. | `/trends?lang=en`, `/environment?lang=en`, `/reports?modo=demo&lang=en` | `real-en-escritorio-trends.png`, `real-en-escritorio-environment.png`, `real-en-escritorio-reports.png`, `recheck-reports-demo-en.png` |
| T11 | media | todas | ambos, `lang=en` | `Hydration failed because the server rendered text didn't match the client` en cada carga con `lang=en` (árbol de trabajo actual; no se registró en el recorrido sobre `20a311f`). El HTML se sirve en español y el cliente resuelve inglés; React regenera el árbol. En producción esto se traduce en parpadeo y coste de arranque. | `/?modo=demo&lang=en` con consola abierta | `recheck-home-demo-en.png` |
| T12 | media | todas | ambos | Sin conexión en dev: `serviceWorker.getRegistrations()` = 0 (por diseño, solo producción). Tras `setOfflineMode(true)` la app muestra la banda «Sin enlace con la API: trabajando con la copia local», pero al pulsar «Tendencias» Next intenta el RSC payload, cae a navegación completa y termina en `chrome-error://` (ERR_INTERNET_DISCONNECTED); recargar también falla. En el público el SW `vigia-carcasa-v1` (33 entradas) permite navegar a Tendencias, Alertas, Registro, Entorno y recargar sin red. | Cargar `/`, cortar red, pulsar una pestaña | `estado-offline-home-tras-cortar.png`, `estado-offline-nav-trends.png`, `publico-offline-recarga.png` |
| T13 | media | Informes | demo y real | Con :8000 la cola muestra «Informe diario · Día 24» dos veces y «Día 26» estando en el día 24; en demo el informe del día 23 dice «Continúa la deriva de FC» mientras Cuerpo dice «Todo en orden». En modo real aparecen los mismos informes y el hilo de demo (coincide con A6 del backlog). | `/reports?modo=demo` | `demo-es-escritorio-reports.png`, `real-en-escritorio-reports.png` |
| T14 | media | Registro | real | Día de misión incoherente: la UI guarda el registro en «día 24» (`dia_actual` del historial de :8000) y la API lo ancla a `t_mision D002`. Desaparece con la API actual (día 2 en ambos). Causa: T01. | Flujo §4 y `GET /tripulantes/1/alertas` | `flujo-api8000-normal-resultado.png` |
| T15 | baja | Cuerpo, Tendencias | ambos | Contraste en tema claro: verde OK `#0C8F5B` y ámbar `#B06F00` sobre `#F2F5FA` dan 3,77:1 y 3,75:1 (< 4,5:1 AA) en textos pequeños («En tu rango», «OK» de los chips de zona). Rojo 4,48:1 (límite). En tema oscuro todos pasan (≥ 6:1). Texto atenuado 6,0:1 bien. | Cálculo WCAG sobre `globals.css` | `real-es-escritorio-home.png` |
| T16 | baja | todas | demo, móvil | La banda de demo se trunca en una línea («Demo mode: simulated crew m…»); el `title` con el detalle no es accesible al tacto. | 390×844, cualquier ruta en demo | `demo-en-movil-alerts.png` |
| T17 | baja | todas | demo | Botón «Ver datos reales / View real data» de 36 px de alto (< 44 px táctil). Es el único control por debajo de 40 px: diales (80 px), opciones (56 px), pestañas (64 px) y botones principales (64 px) cumplen. | Inspección de `getBoundingClientRect` en el recorrido | — |
| T18 | baja | Registro | ambos | Teclado: desde el inicio de la página hacen falta más de 14 Tab para llegar al dial (skip link → 8 pestañas → 3 botones → selectores → día). El skip link funciona. El `input[type=range]` responde a flechas (82 → 84) y los botones −/+ responden a Enter/Espacio (`onClick` con `detail === 0`). Los botones de paso tienen `aria-label`; el único control sin nombre accesible es «Atrás» cuando está deshabilitado (invisible, inofensivo). | Tab ×14 en `/check-in` | `flujo-api8000-teclado-foco-tab14.png` |
| T19 | baja | todas | ambos | Pantalla de error sin copia local («No se pudo conectar con la API de VIGÍA» + «Reintentar»): clara, pero sin logotipo, cabecera, banda de modo ni aviso de prototipo (coincide con B5 del backlog). Con copia local la app abre y avisa «Sin enlace con la API: trabajando con la copia local». | Bloquear `/vigia-api/*` en un contexto nuevo | `estado-error-api-caida-home.png`, `estado-error-api-caida-con-copia-local-home.png` |
| T20 | baja | todas | `lang=en` | `document.title` siempre «VIGÍA · Monitor de autosalud de la tripulación»; `lang` del `<html>` se corrige en cliente, pero la pestaña del navegador queda en español. | Cualquier ruta con `lang=en` | — |
| T21 | info | API | real | Residuos del flujo en la base del equipo `apps/api/data/vigia.db` (servida por :8000): lecturas ids 5–18 (`origen=manual`, `t_real` 2026-11-15T04:54:10Z y 04:54:41Z), `alerta` id 1 (FC 135, capa A, rojo) y `escalamiento` id 1 (destinatario 2). `alerta` y `escalamiento` son de solo adición (triggers). La base de :8001 vive en el scratchpad y se puede borrar sin más. | — | — |

## 3. Strings visibles en español con `lang=en` (literal)

Recorrido sobre `20a311f` con la API :8000. Entre corchetes, el origen y si la API actual (:8001) lo corrige.

**Todas las rutas**
- `VIGÍA · Monitor de autosalud de la tripulación` [`<title>`; no]

**Cuerpo (`/`)**
- `Registro matutino (menos de 90 s)` · `Ejercicio de resistencia · 60 min` · `Glucosa y masa corporal semanales el día 28` · `Objetivo de hidratación 2.5 L` [recordatorios de la API; sí con API actual]
- `puntos (1 a 10)` [unidad de la ficha `estado_animo`; `fichas_en` no trae `unidad`; no]

**Tendencias (`/trends`)**
- `FRECUENCIA CARDÍACA EN REPOSO · LPM` · `Frecuencia cardíaca en reposo` (leyenda, eje y ficha) · `Frecuencia cardíaca en reposo (lpm)` [ficha; sí]
- `Royal College of Physicians: NEWS2, tabla de puntuación` [título de fuente; sí]
- `Tramo extremo de la capa A (40 lpm o menos; 131 o más). Desviación persistente de la línea base (capa B, dos días seguidos) o deriva al alza (capa C).` [ficha; sí]
- `Sensor de muñeca o prenda. Valor de reposo del día, nunca una lectura suelta.` [ficha; sí]
- `Ejercicio aeróbico y de resistencia según el plan de vuelo; mitiga la pérdida de condición cardiovascular, sin evitarla por completo.` [ficha; sí]
- `Latidos por minuto con el cuerpo en reposo.` · `Vigila las adaptaciones cardiovasculares, uno de los riesgos del HRP.` [ficha; sí]
- `puntos (1 a 10)` [no]

**Entorno (`/environment`)**
- `RadLab · Tasa de dosis absorbida y equivalente` · `EDA · CO2, temperatura y humedad de cabina` · `DONKI · Eventos de partículas solares` · `GOES · Flujo integral de protones` · `Real · NASA CCMC · SEP en vivo` [`/entorno/referencia`, sin `lang`; no]
- `Dosis de radiación (mSv)` · `NASA OCHMO: resumen técnico de protección radiológica` · `Límite de carrera de 600 mSv y de 250 mSv por evento de partículas solares. Un flujo de protones de 10 o más en ≥10 MeV activa el modo tormenta.` · `Dosímetro de área del perfil.` · `Mantener la dosis tan baja como sea razonable (ALARA): refugio de tormenta durante eventos de protones, blindaje pasivo en los cuarteles y planificación de las salidas extravehiculares según el clima espacial.` · `Radiación acumulada que recibe la tripulación, medida por el dosímetro de área del perfil de misión.` · `Riesgo HRP: cánceres inducidos por radiación. Alimenta el contador de dosis acumulada de cada perfil. En la ISS la dosis efectiva se acumula a unos 0,2 a 0,5 mSv por día, entre 40 y 90 mSv en una misión típica de seis meses. Los neutrones aportan cerca del 30 % y los detectores usados no separan esa componente.` [ficha `dosis_radiacion`; sí]

**Informes (`/reports`)**
- `Informe diario · Día 23` · `Informe diario · Día 24` · `Informe diario · Día 26` [títulos de informes sembrados; no]
- `Estado general ámbar. Continúa la deriva de FC, sueño corto.` · `Estado general Vigilar. Enviado desde Tránsito a Marte (retardo de ida 12 min; en esta demostración la cola lo acorta a 1 min).` [contenido de informes; no]
- `FC en reposo 68 lpm, sueño 5.8 h, SpO2 97 %` · `74 lpm · 117.3 mmHg · 98.3 % SpO2 · 36.6 °C · sueño 4.23 h · ánimo 7/10` · `Banda de FC en vuelo 56-64 lpm` · `Banda personal de FC en reposo 60 a 86 lpm (línea base en vuelo)` · `Flujo de protones 64 pfu (en descenso), CO2 1.4 mmHg` · `Refugio de 6 h el día 22. Ventana de sueño ampliada planificada.` · `Atenúa las luces 1 h antes de dormir y reserva una ventana de sueño completa.` · `Recibido. Sigue con la ventana de sueño ampliada y vuelve a medir la FC mañana.` (respuesta de tierra) [no]
- Hilo: `Tú` · `Cirujano de Vuelo` (autor) · `Refugiándome por el SPE. Me siento bien, dormí mal las dos últimas noches.` · `Recibido. Permanece en el refugio hasta que el flujo baje de 10 pfu. Añade una nota de sueño al informe de mañana.` · `Recibido. Sigue con la ventana de sueño ampliada y vuelve a medir la FC mañana.` · `Veo tu tendencia de FC. Sin acción desde tierra por ahora; sigue el protocolo de deriva en tu pantalla Cuerpo.` [`mensajes` de la API; sigue en español en la recomprobación de las 05:00 aunque ya existe `apps/api/demo/mensajes.en.json` sin seguimiento]

**Acerca de (`/about`)**
- Página completa (85 líneas en español): `Acerca de VIGÍA` · `Monitor de autosalud de la tripulación` · `A mitad de camino a Marte, un mensaje al cirujano de vuelo tarda hasta 22 minutos por trayecto y la evacuación no es posible. VIGÍA permite que cada astronauta evalúe su propia salud y decida el siguiente paso a bordo, sin esperar a la Tierra.` · `registro diario` · `retardo máximo por trayecto` · `de detección, más el entorno` · `Sin conexión` · `todo funciona a bordo` · `Cómo decide` · `1. Registras` · `2. VIGÍA compara` · `3. Sabes qué hacer` · `A · Límite de seguridad` · `¿Hay algún valor en zona de peligro?` · `B · Desviación de línea base` · `¿Es raro para ti?` · `C · Deriva lenta` · `¿Vas cambiando poco a poco?` · `Contexto` · `¿Lo explica el entorno?` · `Datos reales y simulados` · `Modo real (por defecto)` · `Modo demo` · `Leyenda de procedencia de datos` · `Privacidad por defecto` · `Funciona sin conexión` · `Marco de riesgos` · `Resultados de la simulación` · `Límites declarados` · `Fuentes` · `Uso de IA` y todos sus párrafos [componente de servidor; no]

**Sin hallazgos en inglés:** Registro, Alertas y Dispositivo salen íntegramente en inglés (incluidos `aria-label` de los diales y textos de los pasos).

## 4. Errores de consola y de red

Se ignoraron los mensajes de HMR/Fast Refresh de Next dev. Cada carga fue en contexto nuevo salvo en el flujo.

**Recorrido de 8 rutas × 4 combinaciones × escritorio, más 3 rutas × 4 × móvil (44 cargas, `20a311f`, API :8000):** 0 `console.error`, 0 `console.warn`, 0 `pageerror`, 0 respuestas 4xx/5xx, 0 peticiones fallidas. La app no llama a `/tripulacion` en esas vistas, por eso el 404 de la API vieja no asoma.

**Estados:**
- API caída (interceptación): 12 × `Failed to load resource: net::ERR_FAILED` por página (las 12 peticiones a `/vigia-api/*`: catálogo, historial, fichas, entorno, recordatorios, mensajes, reportes, reloj…). Esperado; la UI lo gestiona (T19).
- Sin conexión en dev: `Failed to fetch RSC payload for http://localhost:3000/trends. Falling back to browser navigation.` → `net::ERR_INTERNET_DISCONNECTED` (T12).

**Flujo real (ambas API) y páginas con alertas:**
- `warn: The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page` (×3 por página con avisos).
- `error: Blocked call to navigator.vibrate because user hasn't tapped on the frame or any embedded frame yet` (×1 por página con avisos).
- Red: 0 respuestas 4xx/5xx; los `POST /tripulantes/1/lecturas` y `/alertas` devolvieron 201/200.

**Árbol de trabajo actual (corridas de las 04:50–05:00, `lang=en`):** `pageerror: Error: Hydration failed because the server rendered text didn't match the client. As a result this tree will be regenerated on the client` en `/`, `/alerts`, `/trends`, `/environment`, `/reports`, `/about` (T11). En `lang=es` no aparece. Además `[Fast Refresh] performing full reload` cuando otro agente guardó archivos durante la corrida.

**Sitio público (6 cargas, contexto nuevo):** 0 respuestas 4xx/5xx; en cada página los mismos `AudioContext` (warn) y `navigator.vibrate` (error) porque el tripulante 1 público tiene una alerta roja activa (T03). `manifest.webmanifest` 200, `sw.js` 200, `/vigia-api/salud` 200. Los 8 enlaces de navegación, el skip link, los 14 enlaces DONKI del panel de eventos y el PDF de NASA OCHMO responden 200 sin sesión.

## 5. Detalle del flujo completo en modo real (punto 4 del encargo)

Contexto nuevo, `?modo=real&lang=es`, diales fijados por el `input[type=range]` y botón «Confirmar»; ánimo por el radio «4»; síntomas «Ninguna molestia»; glucosa y masa «No medí hoy».

| Paso | API :8000 (en marcha, vieja) | API :8001 (código actual, base vacía) |
|---|---|---|
| Revisión | 62 lpm · 118/76 · 97 % (Dedo) · 36.6 °C (Oral) · 7.0 h · ánimo 4 · ninguna molestia · glucosa y masa «Sin medir» | igual |
| Resultado | «Registro guardado · Día 24 · Todo en orden · 7 de 9 medidas · 10 s» | «Registro guardado · Día 2 · Todo en orden» con banda «Modo adaptación (días 1-14)» |
| Cuerpo | 62 lpm «En reposo hoy», «Último registro hace 0 min», tarjetas con los valores nuevos; glucosa/masa siguen con el simulado «· D21» | valores nuevos; glucosa y masa «—» |
| Tendencias | pulso 62 «OK», gráfica con 24 días simulados + el nuevo | pulso 62, «Este indicador no usa rango personal», límites 40–100, un solo punto |
| API tras el normal | `lecturas` pasa de 4 a 11 (7 nuevas, `origen=manual`, `t_real` 04:54:10Z); `historial?modo=real` sigue devolviendo las 44 simuladas | `historial?modo=real`: `naturaleza Real`, 1 fila día 2 con todos los valores, `fc_instrumento manual` |
| localStorage | `vigia:real:checkins`, `vigia:real:synced` (1 id), `vigia:cache:catalogo:real:1:es` | igual |
| Registro rojo (135 lpm, SpO2 90) | «Actúa ahora · ACTUAR · Qué hacer ahora · Corazón y vasos: Vuelve a medir en 5 min y llama al Oficial Médico»; toasts «Actuar · NEWS2 6 pts · Escala automáticamente al oficial médico» y «Vigilar · FC CUSUM 18.11» | «Actúa ahora»; un solo toast (sin CUSUM porque no hay línea base) |
| Alertas | «Requieren tu atención hoy · 1 Actuar · 1 Vigilar»; tarjeta ACTUAR con chip **«Escalada»**, «Quién lo ve: Enviado automáticamente al Oficial Médico», botones «Ver lo enviado» y «Entendido» | igual con 1 Actuar |
| `GET /tripulantes/1/escalamientos` | `[{id 1, alerta_id 1, destinatario_id 2, contenido {frecuencia_cardiaca_reposo, 135, tramo "Tramo extremo (3 puntos)"}}]`; `GET /escalamientos` como tripulante 2 lo lista | igual |
| «Ver como Oficial Médico» | misma vista de alertas del astronauta; la bandeja del oficial no se pudo comprobar porque depende de `/tripulacion` (404 en :8000) | misma vista; la bandeja tampoco cambió en la captura (`flujo-api-actual-rojo-alerts-vista-medico.png`): revisar a mano |

Capturas: `flujo-api8000-normal-*.png`, `flujo-api8000-rojo-*.png`, `flujo-api-actual-normal-*.png`, `flujo-api-actual-rojo-*.png`.

## 6. Accesibilidad básica

- **Táctil:** diales de 80 px, opciones de 56 px, pestañas de 64 px, botones principales de 64 px, día ±1 de 40 px, botones de la cabecera de 40 px. Solo «Ver datos reales» (36 px) queda corto (T17).
- **Contraste:** T15 (verde y ámbar sobre claro < 4,5:1 en texto pequeño).
- **Etiquetas:** todos los `button`, `input`, `select` tienen nombre accesible salvo «Atrás» deshabilitado; los diales tienen `role=group` + `aria-label`, el range `aria-label`, ánimo y sitio de medida `role=radiogroup`, barra de progreso con `aria-valuenow`, cronómetro `role=timer`, resultado `role=status` con foco programático. Sin imágenes sin `alt`.
- **Teclado:** skip link visible al foco; orden lógico pero largo (T18); range y botones −/+ operables; el toast tiene botón de cierre con `aria-label`.
- **Idioma del documento:** `<html lang>` se fija en cliente; el servidor lo sirve en `es` (relacionado con T11/T20).

## 7. Sitio público frente a local

| Aspecto | Local (`main` 20a311f) | Público |
|---|---|---|
| Interfaz | cabecera con pestañas, cuerpo 3D (BodyParts3D), tema claro por defecto | barra lateral numerada 01–08, cuerpo 2D Female/Male Front/Back, tema oscuro |
| API | vieja (T01) | actual: demo día 27 con deriva, `/tripulacion` 200, fichas en inglés |
| Modo real nuevo visitante | datos simulados como «Medido» | día 2 con alerta roja y síntoma de otro usuario (T03) |
| Entorno real | «Sin datos de entorno publicados» + «Simulado» | `mision-real`: dosis 1.227 mSv RadLab, CO2 2.01 mmHg EDA, GOES/DONKI reales con ventanas de fechas |
| Sin conexión | no hay SW en dev | SW activo; navegar y recargar funciona |
| Enlaces sin sesión | — | todos 200 (navegación, DONKI, PDF OCHMO, manifest, sw.js) |
| Consola | limpia | `vibrate`/`AudioContext` por la alerta roja compartida |

Capturas: `publico-home-real-es.png`, `publico-home-demo-en.png`, `publico-environment-demo-es.png`, `publico-environment-real-es.png`, `publico-alerts-demo-en.png`, `publico-checkin-real-es.png`, `publico-offline-*.png`.

## 8. Qué no se pudo probar

- La bandeja real del oficial médico en la UI (ver §5); el escalamiento sí consta en la API.
- La precarga desde el Galaxy Watch (reloj desconectado durante la prueba).
- Tiempos de carga en producción local (`next build`): solo dev, donde cada ruta tarda 6–8 s en compilar la primera vez.
