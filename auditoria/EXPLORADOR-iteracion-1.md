# Explorador, iteración 1 (2026-11-15 01:48 UTC-3): requisitos frente a código

Informe del agente Explorador (solo lectura sobre `main` = `20a311f`). Rutas relativas a la raíz del repo.

**Lo más grave:** el modo real, que el readme anuncia con «Nothing is simulated», puede guardar y subir a la API datos que nadie midió, por tres vías: el pulso del simulador, el ánimo por defecto (7) y la respuesta de tierra que siembra `sembrar`. Ningún test lo detecta.

## 1. Matriz requisito → implementación → verificación → estado

| # | Afirmación (fuente) | Implementación | Verificación | Estado |
|---|---|---|---|---|
| 1 | Registro diario <90 s con unidad, «cómo medir en este perfil» y «por qué importa» (readme; informe §1, §7.1) | `apps/web/components/checkin/checkin-form.tsx:27` (META_S=90), `:61-90` (cronómetro), `:666-669` | Sin test de UI ni del tiempo; medidas con personas pendientes | PARCIAL |
| 2 | «Only what the crew member enters… Nothing is simulated» en modo real (readme; `es.json:716`) | Simulador de FC (`app-context.tsx:202`) aceptado en real (`checkin-form.tsx:123,172,191`) y subido como `naturaleza:"Real"` (`lib/api-registro.ts:33,45`); ánimo 7 por defecto siempre guardado (`checkin-form.tsx:34,139,270`) | Ningún test | **CONTRADICE** |
| 3 | Capa A NEWS2: rojo con tramo extremo o suma ≥5, ámbar 3–4 | `packages/engine/engine.ts` | `paridad-referencia.test.ts`, `engine.test.ts` | CUMPLE |
| 4 | Capa B: z modificada (mediana y MAD), dos días seguidos; glucosa dos lecturas | `engine.ts:22-28` | tests de capa B | CUMPLE |
| 5 | Capa C: CUSUM desde el día 21, k=0,75, h=5 | `engine.ts:22-24,258` | paridad; `gold/barrido.json` | CUMPLE |
| 6 | Línea base de prevuelo a vuelo (1–14, 15–20, 21+, rezago 3 días) | `engine.ts` (w(d) y ventana) | tests | CUMPLE |
| 7 | CO2 + cefalea = alerta de entorno; ppm→mmHg por perfil; tormenta SEP | `lib/engine.ts:48,65-68`; `rutas_dashboard.py:89-118` | tests web y API | CUMPLE (en real la cabina solo cubre los días 1–5 y DONKI dio 0 eventos en 30 días) |
| 8 | Figura del cuerpo clicable; §4.2 dice «SVG» | `body-view.tsx`, `escena.ts` (3D), respaldo `body-figure.tsx` | Sin test | CUMPLE en función; §4.2 desactualizado |
| 9 | Fichas de indicador con fuente | `rutas_dashboard.py:43-71`; `lib/catalogo.ts:110-146` | `test_fichas_lista_y_una`; `catalogo.test.ts` | CUMPLE |
| 10 | Privacidad: solo el rojo de capa A sale, con dato mínimo | `lib/alertas-sync.ts`, `lib/sincronizacion.ts`, `alerts-view.tsx`; `almacen/alertas.py` | 3 tests web + 3 API | CUMPLE |
| 11 | Ámbar: a los 3 días recomienda compartir | `lib/engine.ts:152-157`; `alerts-view.tsx:368` (solo localStorage) | `engine.test.ts` | PARCIAL: «compartir» no sale del dispositivo |
| 12 | Funciona sin conexión; cola local | `public/sw.js`, `sw-register.tsx:11`, `catalogo.ts:181-203`, `manifest.ts` | Sin test; prueba manual pendiente | PARCIAL: primera apertura exige API (`app-context.tsx:80`); informes no se encolan sin red (`reports-view.tsx:180-189`) |
| 13 | Informes con el retardo del día de misión (readme; §4.2; §8.3) | `reports-view.tsx:179-180`: `Math.min(retardoMin(profile.id), 1)` también en real | tests no prueban el tope | **CONTRADICE** |
| 14 | Vista de tierra: el cirujano responde | `reports-view.tsx:85-95`; API | test | CUMPLE (sin autenticación) |
| 15 | 5 perfiles (readme) / «Tres perfiles» (informe) | `lib/catalogo.ts:91-94`; `packages/schemas/perfiles.json` | `catalogo.test.ts` | CUMPLE (informe dice 3) |
| 16 | Recordatorios de medición | `rutas_dashboard.py:212-215`, `demo/recordatorios.json`; `body-view.tsx:427` | `test_recordatorios_y_mensajes` | PARCIAL: texto fijo de demo sin rótulo en real |
| 17 | Motor TS reproduce el caso de referencia | `paridad-referencia.test.ts` | ese test | CUMPLE |
| 18 | KPI 99,8 %, 8 días, 17,8 %, <0,001 FA | `gold/kpi.json` coincide; UI fija en `es.json:737-741` | `test_simulacion.py` | CUMPLE (About no se actualiza solo) |
| 19 | Todo dato ambiental dice Real/Simulado con fuente y fecha | `environment-view.tsx:200-209,322-358` | test API | PARCIAL: etiquetas «Real» visibles sin datos (`:322,349,358`) |
| 20 | La app no guarda datos de ejemplo en el cliente (MODULE web) | `app-context.tsx:201-202` (Math.random) | — | CONTRADICE (simulador en el cliente) |
| 21 | En demo nada se sube ni escala | `sincronizacion.ts:17,40` lo bloquean; `reports-view.tsx:180-188` hace POST de informes en demo | Sin test de guardas | PARCIAL / CONTRADICE para informes |
| 22 | §7.1 «funciones imprescindibles cubiertas por pruebas» | — | Sin pruebas de offline, cuerpo, separación demo/real | CONTRADICE |
| 23 | §8.1 y §8.2 «fisiología simulada» frente a readme (modo real por defecto) | — | — | CONTRADICE (entre documentos) |
| 24 | Interfaz en español e inglés | 760 claves en cada catálogo, 0 faltan | tests i18n | PARCIAL (textos en español, ver §5) |
| 25 | PLAN etapa 6.5: quitar `@vercel/analytics` | `package.json` aún lo declara (no se importa; tampoco `recharts`) | — | PARCIAL |
| 26 | API MODULE: CORS «solo lectura (GET)» (`:24`) frente a «GET, POST y PUT» (`:20`) | — | `test_cors_permite_escribir_desde_la_interfaz` | CONTRADICE (texto interno) |

## 2. Datos falsos que pueden aparecer en modo real

| Hallazgo | Qué hace | ¿Solo en demo? | Test |
|---|---|---|---|
| `app-context.tsx:201-202` | Simulador emite FC `66 + random*6` cada 1,5 s | **No**: interruptor en `/device` sin comprobar modo (`device-view.tsx:310-311`) | No |
| `checkin-form.tsx:123,172,191,265-266`; `api-registro.ts:33,45` | Con simulador encendido la FC simulada se guarda sin confirmar (`hrDelReloj`) con `hrInstrument:"simulador"` y sube como `origen:"sensor"`, `metodo:"simulador"`, `naturaleza:"Real"`. El esquema tiene `origen 'simulado'` sin usar | **No** | No |
| `body-view.tsx:300-308`; `checkin-form.tsx:645` | Pulso simulado rotulado «En vivo» y «del reloj» | **No** | No |
| `checkin-form.tsx:34,139,210,270` | Ánimo arranca en 7 y «siempre se guarda» (`SIN_OMITIR`) | **No** | No |
| `checkin-form.tsx:41-50` | Valores base de los diales; no se guardan sin confirmar | Sí (seguro) | No |
| `almacen/tripulacion.py:72-96`, `__main__.py:16`, `demo/informes.json` | `sembrar` crea un informe demo ya respondido para el tripulante 1 (el del modo real) | — | `test_sembrar_informes_demo_es_idempotente` |
| `rutas_dashboard.py:218-230` | `mensajes?modo=real` añade todas las respuestas sin filtrar `contenido.demo`; la respuesta de ejemplo sale en el hilo real desde el día 23 | **No** | No prueba la exclusión |
| `rutas_dashboard.py:212-215`, `body-view.tsx:427` | Recordatorios fijos de demo en real sin rótulo | **No** | — |
| `rutas_dashboard.py:74-77` | `dosis_previa_carrera_msv: 212` (Simulado), no se usa en UI | — | — |
| `rutas_dashboard.py:23,25`; `tripulacion.py:8` | En real, día 1 = `DEMO_DIA1 2026-11-14` de la misión «demo» | Ambos (identidad provisional) | — |
| `etl-client.ts:4-5` | Comentario obsoleto («resumen embebido») | — | — |
| Respaldos silenciosos | `catalogo.ts:196-203` → caché con aviso (correcto); `etl-client.ts:122-124` → caché rotulada; `api-registro.ts:94-96` `listarReportes` → `[]` sin aviso. Ninguno inventa datos | — | — |
| `escena.ts:266,605` Math.random | Solo animación | Inocuo | — |

## 3. Interruptor demo

- Activación: `?modo=demo|real` (se guarda, `storage.ts:29-38`); selector «Datos» (`app-shell.tsx:164-169`); `NEXT_PUBLIC_VIGIA_MODO=demo` al compilar. Por defecto real.
- Banda «Modo demo…» en `AppShell` (`app-shell.tsx:196-201`), visible en las 8 rutas; rótulos propios en `/`, `/check-in`, `/trends`, `/environment`, `/alerts`, `/device`. `/reports` sin rótulo por informe. Excepción: pantalla de error sin API (`app-context.tsx:80`) sin barra ni banda.
- Mezcla: almacenes locales separados (`vigia:` / `vigia:real:`); registros y rojos no suben en demo; **los informes de demo sí van a la API** y sus respuestas se cuelan en el hilo real. Sin tests de guardas.

## 4. Aviso «prototipo, no es dispositivo médico»

Pie de `AppShell` en las 8 pantallas (`app-shell.tsx:254-256`), `/about` (`about-view.tsx:66,207`), manifiesto, readme. Falta en la pantalla de error sin API.

## 5. Inglés

- Catálogo completo (760/760). Quedan en español con `lang=en`: unidades de las fichas («lpm», «puntos (1 a 10)», `fichas_en/*` sin `unidad`, `catalogo.ts:113`); literales `reports-view.tsx:165` «lpm», `device-view.tsx:149` «bpm» fijo, `checkin-form.tsx:26,492,508,616` («Muñeca», «Dedo», «Oral», «Inercial» como `metodo`), `ui/dialog.tsx:75` y `ui/sheet.tsx:75` «Close»; `layout.tsx:12-14,33` y `manifest.ts:13` (`lang:"es"`).
- API en español: autor «Cirujano de Vuelo» (`rutas_dashboard.py:227`), hilo e informe demo, `fuentes[].alimenta/detalle`, `aviso` del panel gold, errores (`i18n.py:43-55` usa `VIGIA_LANG`, no el `lang` de la petición), bandeja del oficial con id crudo (`alerts-view.tsx:147-148`).

## 6. Cómo se ejecuta

Datos: `pipelines/datalake` → `index.py ingest …`; `pipelines/reanclaje` → `index.py panel escenarios/mision-real.json`, `…/mision-vigia.json`, `index.py simular`. API: `apps/api`, `pip install -r requirements.txt`, `python -m almacen sembrar`, `uvicorn main:app --port 8000`. Web: `apps/web`, `npm install`, `npm run build && npm start`. `typescript.ignoreBuildErrors: true` (`next.config.mjs:6-8`); el CI no compila la web. Gold (fuera de git) generado 2026-11-15 01:51–02:32 UTC; `mision-real` fija GOES y DONKI desde 2026-11-14 (0 eventos SEP en 30 días).

## 7. Huecos y riesgos, de más a menos grave

1. Modo real puede guardar y subir FC del simulador y ánimo 7 por defecto como Real.
2. Respuesta de tierra de demo y respuestas a informes de demo en el hilo real; `sembrar` siembra demo sobre el tripulante del modo real.
3. §8.1/8.2 «fisiología simulada» frente a readme; §7.1 «cubiertos por pruebas» sin tests de offline, cuerpo y modos.
4. Retardo de informes recortado a ≤1 min también en real.
5. Sin conexión: primera apertura exige API; informes no se encolan; prueba manual pendiente.
6. Sin red `listarReportes` devuelve `[]` sin aviso.
7. Etiquetas «Real» sin datos en Entorno.
8. `retardo_min.transit-docked = 12` (`vocabulario.json:78`) frente a `retardo_demo_min = 0.03` (`perfiles.json:47`).
9. «Compartir» un ámbar es solo local.
10. Errores TS ocultos (`ignoreBuildErrors`); CI sin build web.
11. Perfil UI arranca en `transit` (`app-context.tsx:100`) y la misión sembrada es `estacion` (`tripulacion.py:90`).
12. Unidades y textos de la API en español con `lang=en`; `lang="es"` en HTML y manifiesto.
13. Recordatorios de demo sin rótulo en real.
14. KPI fijos en i18n.
15. §4.2 «SVG» y «Tres perfiles» desactualizados.
16. Dependencias sin uso (`@vercel/analytics`, `recharts`, `shadcn`).
17. Comentario obsoleto `etl-client.ts:4-5`.
18. CORS contradictorio en `apps/api/MODULE.md`.
