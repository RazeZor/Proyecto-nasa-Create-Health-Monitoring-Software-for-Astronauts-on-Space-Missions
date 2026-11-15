# Tester (juez de hackatón) · iteración 3

Fecha: 2026-11-15, 07:50–08:10 (UTC-3). Rama `fix/auditoria-final`, commit `a5e40ee`. API en :8000 reiniciada con el código actual y base nueva (tripulante 1 sin lecturas al empezar; existe `vigia.db.respaldo-20261115-0241`); `next dev` en :3000 sin reiniciar. Chrome sin cabeza (puppeteer-core 25.17, SwiftShader), viewports 1280×800 y 390×844 (DPR 2), contexto de navegador nuevo por combinación (sin cookies ni localStorage). Puente del reloj: `GET /reloj/estado` → `conectado: true`, `url_reloj_sugerida ws://192.168.1.119:8765/watch`; `GET /reloj/tripulacion` → `[]` durante toda la corrida (ningún reloj transmitiendo). Capturas (prefijo `t3-`) y textos extraídos (`textos3/`) en `C:\Users\ASUS-07\AppData\Local\Temp\claude\74a4dbc3801d4802\165b8463-03bf-4b2d-a8a9-ce9d4b5e5cad\scratchpad\tester\capturas\`; resultados en bruto en `resultados-t3-*.json` y logs `t3-*.log` de la carpeta padre; scripts `t3-movil.js`, `t3-tour.js`, `t3-device.js`, `t3-reports.js`, `t3-banda.js`, `t3-deck.js`, `t3-deck-home.js`. No se tocó el repo ni el sitio público.

## Resumen (10 líneas)

1. **T2-01, T2-02 y T2-03 corregidos; T2-04 y T2-05 corregidos a medias** (hilo y títulos de fuentes en inglés; siguen en español el aviso del escenario de Entorno y el contenido del informe sembrado de demo). Hay **una regresión nueva en móvil real** y ninguna en escritorio.
2. Móvil 390×844: las 8 pestañas se ven en **dos filas** (y = 68 y 136 px) bajo el logo y los botones; cabecera 394 px CSS (antes 540) en `/`, `/check-in` y `/alerts`. CORREGIDO.
3. **REGRESIÓN T3-01 (móvil, real):** la banda «Aún no hay registros tuyos» se parte **palabra por palabra** (columna de texto de 48 px junto a dos botones de 139–147 px) y mide 545 px (589 en inglés); el h1 queda a 1142 px del viewport de 844. En demo no ocurre (no hay banda).
4. Informes en real: pista «Lo que tarda un mensaje… **El informe se entrega cuando pasa ese tiempo**» (en: «The report is delivered once that time has passed»), sin «esta demostración»; «Arrives in 11:55» con 12 min. CORREGIDO.
5. Cola por modo: el informe real «Daily report · Day 2» **no** aparece en demo y el «Informe diario · Día 23» de demo **no** aparece en real (comprobado en es y en). CORREGIDO.
6. Inglés: hilo de demo íntegro en inglés, incluida la respuesta del Día 23 · 07:12 («Copy. Keep the extended sleep window…»); fuentes «RadLab · Absorbed and equivalent dose rate», «EDA · Cabin CO2, temperature and humidity», «DONKI · Solar energetic particle events», «GOES · Proton flux ≥10 MeV (storm severity)». CORREGIDO.
7. **Persisten en español con `lang=en`:** el aviso «Cada serie es una medición real reanclada…» en Entorno (demo y real: la vista muestra `gold.aviso` de `/paneles/{nombre}`, que no recibe `lang`, en vez del `aviso_entorno` ya traducido de `/historial`) y las 7 líneas del informe sembrado de demo en la cola, incluida su «Reply from ground: Recibido…». Se ven en la captura de presentación de `/reports`.
8. `/device` (real-es, demo-es, real-en): tras «Conectar» aparece el diagnóstico en cuatro pasos con 1 y 2 en verde, **3 marcado** («Tu reloj está vinculado y transmite al servidor») y 4 atenuado; instrucción con `ws://192.168.1.119:8765/watch`; caja «Relojes que ve el servidor sin vincular · El servidor aún no ve ningún reloj con nombre propio»; a los 15 s «Conexión perdida»; al recargar vuelve a «Conectando…» solo. No había nombre que vincular: el vínculo no se tocó. CORRECTO.
9. Consola y red: **0 errores, 0 `pageerror`, 0 hidratación, 0 `AudioContext`/`vibrate`, 0 respuestas ≥ 400 y 0 peticiones fallidas** en 41 cargas del recorrido (8 rutas × 4 combinaciones + 9 móviles) y en los flujos de dispositivo, informes y presentación (unas 30 cargas más). Banda demo en las 22 cargas demo, pie «no es un dispositivo médico» en las 41, línea «Registras → VIGÍA compara → Sabes qué hacer» en `/`, modo real vacío con «Aún no hay registro hoy» y las cinco zonas «SIN MEDIR HOY».
10. Capturas de presentación (demo, inglés, 1280×800, tema claro, día 27): `t3-deck-home-zona-ambar.png`, `t3-deck-check-in-paso.png`, `t3-deck-environment.png`, `t3-deck-alerts.png`, `t3-deck-reports.png`, `t3-deck-device.png`, `t3-deck-trends.png` (+ `-completa.png` de página entera). Registro dejado en la base: `reportes` id 2 (real, Day 2, `en_cola`).

## 1. Estado de cada punto del encargo

| # | Punto | Estado | Evidencia |
|---|---|---|---|
| 1 | T2-01 móvil 390×844: 8 pestañas en segunda fila | **CORREGIDO** | `t3-movil-real-es-home-viewport.png`, `t3-movil-real-es-check-in-viewport.png`, `t3-movil-demo-es-alerts-viewport.png` (+ demo-en y página completa sin sufijo). Medidas (`resultados-t3-movil.json`, 9 cargas iguales): cabecera 394 px CSS = fila 1 de 200 px (logo + 3 botones en y=0–68, `nav` a y=68 con 390 px de ancho y 132 px de alto, pestañas en y=68 y y=136, 4 por fila de ~95 px) + barra de controles 194 px. `scrollWidth` 390 (sin scroll horizontal). El contenido empieza a 443 px en demo. **Pero** en real aparece T3-01 (abajo). |
| 2 | T2-02 pista bajo «Retardo de ida» en real | **CORREGIDO** | `t3-reports-real-es-antes.png`, `t3-reports-real-en-encolado.png`: «Lo que tarda un mensaje en llegar a Tierra desde Tránsito a Marte. El informe se entrega cuando pasa ese tiempo.» / «…The report is delivered once that time has passed.» Sin «demostración/demo» (`demoFrase=false` en `resultados-t3-reports.json`). En demo sigue, correctamente, «En esta demostración la cola lo acorta a 1 min como máximo» (`t3-reports-demo-es.png`). |
| 3 | T2-03 cola por modo | **CORREGIDO** | Encolado en real-en (`t3-reports-real-en-encolado.png`: «Daily report · Day 2 · In transit · Arrives in 11:55», «Overall status OK. Sent from Mars transit with the profile one-way delay (12 min).», contador «On the way 1»). Luego `/reports?modo=demo` (en y es): títulos de la cola = `["Informe diario · Día 23"]` únicamente (`t3-reports-demo-en.png`, `t3-reports-demo-es.png`); vuelta a real-es: `["Daily report · Day 2"]` únicamente (`t3-reports-real-es-despues.png`). |
| 4 | T2-04 inglés en el hilo de demo (respuesta del día 23) | **CORREGIDO** (hilo) / **PERSISTE** (contenido del informe sembrado) | Hilo (`t3-demo-en-escritorio-reports.png`): You · Day 22 · 15:10 «Sheltering for the SPE…»; Flight Surgeon · Day 22 · 15:41 «Copy. Stay in the shelter…»; **Day 23 · 07:12 «Copy. Keep the extended sleep window and measure your HR again tomorrow.»**; Day 23 · 09:05 «I see your HR trend…». La tarjeta del informe de la cola sigue en español (ver T3-03 y §3). |
| 5 | T2-05 inglés en Entorno (aviso y 4 fuentes) | **CORREGIDO** (fuentes) / **PERSISTE** (aviso) | `t3-demo-en-escritorio-environment.png`, `t3-real-en-escritorio-environment.png`: sección «Sources» con «RadLab · Absorbed and equivalent dose rate · Real · NASA OSDR · ALTEA / DosTel», «EDA · Cabin CO2, temperature and humidity · Real · NASA OSDR · RR-1 ISS», «DONKI · Solar energetic particle events · Real · NASA CCMC · Live SEP catalogue», «GOES · Proton flux ≥10 MeV (storm severity) · Real · NOAA SWPC · GOES-18 >=10 MeV». El aviso del escenario sigue en español (T3-02). |
| 6 | `/device`: Conectar → 4 pasos, paso 3 falla, URL del reloj, lista sin vincular, recarga | **CORRECTO** | `t3-device-real-es-conectando.png`, `t3-device-demo-es-conectando.png`, `t3-device-real-en-conectando.png`; `resultados-t3-device.json`. Detalle en §2 (sin hallazgo) y abajo. |
| 7 | Regresiones en 8 rutas × 4 combinaciones | **SIN REGRESIÓN** en escritorio; **REGRESIÓN** T3-01 en móvil real | `resultados-t3-tour.json`, `t3-tour.log`, capturas `t3-{modo}-{lang}-escritorio-{ruta}.png`. |
| 8 | Capturas de presentación | **HECHO** | `t3-deck-*.png` (§6). Reserva: `/reports` muestra el informe de demo en español (T3-03). |

### Detalle de `/device`

Pasos (texto literal, real-es): «OK 1. La API de VIGÍA responde» · «OK 2. La API habla con el servidor del reloj (smart-monitor)» · «FALLA 3. Tu reloj está vinculado y transmite al servidor» (ámbar, negrita, icono de aviso) · «-- 4. Hay pulso reciente en la muñeca» (atenuado). Instrucción: «En la app del reloj escribe Servidor = ws://192.168.1.119:8765/watch y, en Tripulante, un nombre tuyo (no el de fábrica); pulsa Iniciar monitoreo. Después elige tu reloj aquí.» Caja «RELOJES QUE VE EL SERVIDOR SIN VINCULAR · El servidor aún no ve ningún reloj con nombre propio.» (sin botones, coherente con `GET /reloj/tripulacion` → `[]`). En inglés: «In the watch app set Server = ws://192.168.1.119:8765/watch and, in Crew member, a name of your own (not the factory one); tap Start monitoring. Then pick your watch here.» / «Watches the server sees that are not linked yet · The server does not see any watch with its own name yet.» `GET /tripulantes/1/reloj` → `vinculado:false`, `nombres:["sebastián","astronauta"]`, `reloj:null`. A los ~17 s el estado pasa a «Conexión perdida» / «Connection lost» (espera de 15 s de `ESPERA_CONEXION_MS`) con botón «Reconectar»; `reload` → «Conectando…» con «Desconectar» y los mismos cuatro pasos, `localStorage vigia:reloj = "on"`; navegar a `/` y volver mantiene «Conectando…»; «Desconectar» → «Desconectado». **No se pulsó «Este es mi reloj»** (no había ningún nombre libre), así que el vínculo quedó como estaba.

## 2. Tabla de hallazgos

Gravedad: bloqueante / alta / media / baja / info.

| Id | Grav. | Pantalla | Modo | Descripción | Pasos | Captura |
|---|---|---|---|---|---|---|
| T3-01 | **alta (regresión)** | todas (banda) | real, móvil | La banda «Aún no hay registros tuyos» (`Banners`, `sinRegistros`) usa `flex flex-wrap` con el texto en `min-w-0 flex-1` y dos botones (`Hacer mi registro` 147 px, `Ver modo demo` 139 px) que no bajan de línea: el bloque de texto queda con **48 px** de ancho (49 en inglés) y el título y la explicación se parten palabra por palabra («Aún / no / hay / registros / tuyos / En / este / modo / VIGÍA / solo…»). La banda mide 545 px (es) / 589 px (en); con la cabecera (394) y la de adaptación (133) el `<main>` empieza a 1072 px (1136 en en) y el h1 «Aún no hay registro hoy» a 1142 px: la primera pantalla de 844 px no muestra nada del contenido. Afecta a `/`, `/check-in` y `/alerts` en real (la banda es global). En la iteración 2 el texto se veía entero (el ancho se lo quitaban las pestañas, no los botones). | Contexto nuevo, 390×844, `/?modo=real` | `t3-movil-real-es-home-viewport.png`, `t3-movil-real-es-home.png` (página entera), `t3-movil-real-es-check-in-viewport.png`, `t3-movil-real-es-alerts-viewport.png` |
| T3-02 | media | Entorno | ambos, `lang=en` | (T2-05 parcial) El aviso del escenario sigue en español: «Cada serie es una medición real reanclada a la línea de tiempo de misión. Que series de fechas reales distintas coincidan en un día de misión es una decisión del escenario, no un hecho observado (informe §3.4).» La API ya lo traduce en `GET /tripulantes/1/historial?lang=en` (`aviso_entorno: "Each series is a real measurement re-anchored…"`), pero `environment-view.tsx` (línea 421) muestra `gold.aviso`, que viene de `/paneles/{nombre}` (`etl-client.ts`, campo `aviso`) y ese endpoint ignora `lang` (`GET /paneles/mision-real?lang=en` → español). | `/environment?lang=en` (demo o real), pie de la sección de datos | `t3-demo-en-escritorio-environment.png`, `t3-real-en-escritorio-environment.png` |
| T3-03 | media | Informes | demo, `lang=en` | (T2-04 parcial) La tarjeta del informe sembrado sigue en español: «Informe diario · Día 23», «Estado general ámbar. Continúa la deriva de FC, sueño corto.», «Reply from ground: Recibido. Sigue con la ventana de sueño ampliada y vuelve a medir la FC mañana.», «FC en reposo 68 lpm, sueño 5.8 h, SpO2 97 %», «Banda de FC en vuelo 56-64 lpm», «Flujo de protones 64 pfu (en descenso), CO2 1.4 mmHg», «Refugio de 6 h el día 22. Ventana de sueño ampliada planificada.» (`GET /tripulantes/1/reportes?lang=en` devuelve el contenido guardado tal cual). El hilo sí está en inglés. Es lo primero que se ve en la captura de presentación de `/reports` en inglés. | `/reports?modo=demo&lang=en` | `t3-deck-reports.png`, `t3-reports-demo-en.png` |
| T3-04 | baja | Informes | real | Se puede encolar un informe sin ningún registro del día: queda «Daily report · Day 2 · Reading: No check-in for this day · Baseline: Personal baseline still being established · Overall status OK». Es honesto, pero manda a Tierra un informe vacío con «OK» de estado general cuando no hay nada medido; convendría avisar o pedir confirmación. | `/reports?modo=real` con el tripulante vacío → «Queue today's report» | `t3-reports-real-en-encolado.png` |
| T3-05 | baja | todas (toast) | ambos | El recordatorio «Registro diario pendiente / Daily check-in pending» aparece **~14 s después de cargar** `/` y tapa la esquina inferior derecha (en móvil, media pantalla) hasta que se cierra con la X; en 1280×800 cubre el panel derecho del cuerpo y la cola de informes. Para la presentación conviene cerrarlo o retrasarlo; no es error. | Abrir cualquier ruta y esperar 15 s | `t3-reports-real-en-encolado.png`, `t3-movil-real-es-home-viewport.png` |
| T3-06 | info | Dispositivo | ambos | Con `vigia:reloj = on` y sin reloj transmitiendo, cada apertura muestra «Conectando…» 15 s y después «Conexión perdida» con «Reconectar»; el diagnóstico en pasos sigue visible en ambos estados. Coherente con lo pedido (reconexión recordada); solo conviene saberlo para la demo. | Conectar, esperar 15 s, recargar | `t3-device-real-es-tras-espera.png`, `t3-device-real-es-recarga.png` |
| T3-07 | info | API | real | Registro de prueba dejado en la base: ver §5. | — | — |

## 3. Strings visibles en español con `lang=en` (literal, 8 rutas, demo y real)

Revisadas las 16 cargas en inglés (`textos3/t3-*-en-escritorio-*.txt`) y las 3 móviles; detector automático más lectura de los textos. Ya no aparecen: títulos y «alimenta» de las fuentes de Entorno, el hilo con tierra (4 mensajes), el informe creado en inglés, `/about`, Dispositivo (incluidos los cuatro pasos, la instrucción y la caja de vínculo), Alertas, Tendencias, Registro, Cuerpo.

**Entorno (`/environment`, demo y real)** [API `/paneles`, no i18n]
- `Cada serie es una medición real reanclada a la línea de tiempo de misión. Que series de fechas reales distintas coincidan en un día de misión es una decisión del escenario, no un hecho observado (informe §3.4).`

**Informes (`/reports`, demo)** [contenido guardado en `reportes` id 1, sembrado]
- `Informe diario · Día 23`
- `Estado general ámbar. Continúa la deriva de FC, sueño corto.`
- `Recibido. Sigue con la ventana de sueño ampliada y vuelve a medir la FC mañana.` (en la tarjeta, bajo «Reply from ground»; en el hilo sí sale en inglés)
- `FC en reposo 68 lpm, sueño 5.8 h, SpO2 97 %`
- `Banda de FC en vuelo 56-64 lpm`
- `Flujo de protones 64 pfu (en descenso), CO2 1.4 mmHg`
- `Refugio de 6 h el día 22. Ventana de sueño ampliada planificada.`

**Informes (`/reports`, real):** ninguno (el informe se creó en inglés: «Daily report · Day 2», «No check-in for this day», «Personal baseline still being established», «CO2 2.01 mmHg @ 760 mmHg (Real · EDA RR-1 (NASA OSDR) · 2014-09-22)», «No active alerts; following the day's plan»).

**Sin hallazgos en inglés:** `/`, `/check-in`, `/trends`, `/alerts`, `/device`, `/about` (demo y real, escritorio y móvil).

## 4. Errores de consola y de red

Se ignoran HMR/Fast Refresh de Next dev (esta vez no hubo ninguno: no se editó el repo durante la corrida).

- **Recorrido** (41 cargas: 8 rutas × real-es, real-en, demo-es, demo-en a 1280×800 + `/`, `/check-in`, `/alerts` a 390×844 en real-es, demo-es, demo-en): 0 `console.error`/`warn`, 0 `pageerror`, 0 hidratación, 0 `AudioContext`/`vibrate`, 0 respuestas ≥ 400, 0 peticiones fallidas (`resultados-t3-tour.json`).
- **Móvil** (9 cargas de `t3-movil.js` + 2 de `t3-banda.js`): 0 errores, 0 ≥ 400.
- **Dispositivo** (3 contextos, Conectar + espera + recarga + navegación): 0 errores, 0 ≥ 400 (las lecturas de `/tripulantes/1/reloj` cada 1,5 s responden 200).
- **Informes** (6 cargas, 1 `POST /reportes`): 0 errores, 0 ≥ 400.
- **Presentación** (9 cargas + clicks): 0 errores, 0 ≥ 400.

## 5. Registros dejados en la base (para que el coordinador los limpie)

Base `apps/api/data/vigia.db` servida por :8000 (respaldos previos `vigia.db.respaldo-20261115-0207` y `-0241`). Tripulante 1:

- `reportes` id 2: real (`contenido.demo` ausente), perfil Tránsito, `retardo_min 12`, `creado_t_real 2026-11-15T11:04:01Z`, `llega_t_real 2026-11-15T11:16:01Z`, `estado en_cola` al cerrar (pasará a `entregado` solo), título «Daily report · Day 2», resumen «Overall status OK. Sent from Mars transit with the profile one-way delay (12 min).». El id 1 es el sembrado de demo.
- `lecturas`, `alertas`, `sintomas`, `escalamientos`: **ninguno** (no se hizo ningún registro en esta iteración).
- Vínculo del reloj: **sin cambios** (`vinculado:false`; no había nombre libre que vincular, así que no hay nada que deshacer con `DELETE`).
- Navegador: nada (contextos efímeros).

## 6. Capturas para la presentación

Demo, inglés, 1280×800, tema claro (por defecto), día de misión 27 (el que trae el escenario demo), toast de recordatorio cerrado en `/`:

- `t3-deck-home-zona-ambar.png`: Cuerpo con «Something to watch», 82 bpm y la zona «Heart and vessels · WATCH» abierta (C · Slow drift, CUSUM 5.1).
- `t3-deck-check-in-paso.png`: Registro en «Step 1 of 9 · Resting heart rate», 82 bpm precargados (`t3-deck-check-in-paso2.png`: paso 2 tras confirmar).
- `t3-deck-environment.png`: Entorno, «The environment asks for no action today», 0.309 pfu, 2.31 mmHg, 3.873 mSv.
- `t3-deck-alerts.png`: Alertas, «2 Watch», tarjeta CUSUM 5.1 con «What to do now».
- `t3-deck-reports.png`: Informes, cola con el informe de demo (en español, T3-03) y el hilo en inglés.
- `t3-deck-device.png`: Dispositivo tras «Connect»: «Connecting…» y los cuatro pasos con el 3 marcado.
- `t3-deck-trends.png`: Tendencias, pulso en reposo 81.5 bpm con banda personal 60.4–86.4.
- Versiones de página entera: `t3-deck-*-completa.png`.
- Nota: el círculo «N» de la esquina inferior izquierda es el indicador de `next dev`; no aparece en un build de producción. Si se quiere una captura sin él, hay que tomarla contra `next start` o recortarla.

## 7. Qué no se pudo probar

- «Este es mi reloj» y el paso de `vinculado` a `true`: `GET /reloj/tripulacion` devolvió `[]` toda la corrida (ningún reloj transmitiendo a smart-monitor), así que la lista salió vacía con el texto previsto y no hubo botón que pulsar.
- Los pasos 1 y 2 en fallo (API caída / smart-monitor apagado): no se apagaron servicios por indicación del encargo.
- `/device` real-en tras recargar: la recarga coincidió con una recompilación de `next dev` y la captura salió en la pantalla de carga; los casos real-es y demo-es sí verificaron la reconexión automática.
