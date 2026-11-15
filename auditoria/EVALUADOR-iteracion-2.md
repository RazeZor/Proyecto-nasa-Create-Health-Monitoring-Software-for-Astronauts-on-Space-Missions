# Evaluador independiente, iteración 2 — 2026-11-15 (UTC-3)

Material: `RUBRICA.md` (sin cambios), `readme.md`, `ENVIO.md`, `FINAL-PROJECT-REPORT.md`, `TESTER-iteracion-2.md` y sus 118 capturas `t2-*`, `BITACORA.md`, `FUENTES.md`, `LICENSE`, `.github/workflows/context.yml`, `DEMO.md` y `VIGIA-demo-7-slides.pptx`. `EVALUADOR-iteracion-1.md` solo se usó para comprobar qué se corrigió. Comprobaciones propias de solo lectura sobre el árbol actual (`fix/auditoria-final`, commit `a5e40ee`; en `origin` figura `d6529d6` con el mismo mensaje): tests Python (apps/api 123, i18n 8, schemas 15, reanclaje 32, datalake 10, contextgen 9, validar-referencias 7 = **204 OK**), `node --test` (**59 OK**), `contextgen --check` limpio, `i18n.py` sin pendientes, `GET` a la API local (:8000) y a la app local (:3000), dos recorridos con Chrome sin cabeza sobre el código actual (móvil 390×844 y escritorio 1280×800: chips de sistemas, selector de rol, solape de avisos), y `GET` al sitio público y al repositorio. No se escribió nada en la base ni en el repo.

**Riesgo transversal:** el sitio público https://vigia.smoraleslo.dev sigue con la versión anterior (`<title>` solo en español, caché `vigia-carcasa-v1`; el código actual usa `v2`). Todo lo que sigue puntúa el repositorio/local como lo que se desplegará; si no se redespliega antes del envío, Validity, Relevance y Presentation bajan a lo que vio el evaluador 1.

# VIGÍA: **84/100** (Impact 16 · Creativity 20 · Validity 16 · Relevance 20 · Presentation 12)

## 1. Puertas de elegibilidad

| Puerta | Estado | Motivo |
| --- | --- | --- |
| E1 | **UNKNOWN** | Reto correcto. Nombre del equipo, integrantes y evento siguen como `[TEAM NAME]` en `ENVIO.md`, en el informe y en la diapositiva 1 del pptx. |
| E2 | **FAIL (hoy)** | `Link to Project Demo` es un marcador en `ENVIO.md:21`. El resto de campos está redactado. |
| E3 | **PASS (formato)** | `VIGIA-demo-7-slides.pptx`: exactamente 7 `slideN.xml`, en inglés, con 5 capturas de la app (sin medios generados). Falta el enlace público (E5). |
| E4 | **FAIL (público) / casi PASS (local)** | Público: `/about` en español y `<title>` solo en español. Local: README, informe final, formulario y app en inglés; quedan en español con `lang=en` el contenido sembrado de los informes y la respuesta de tierra en `/reportes` (vista Cirujano de Vuelo), y el README enlaza el informe técnico en español como material complementario. |
| E5 | **FAIL (hoy)** | Sitio y repositorio responden 200 sin registro; no existe aún enlace público de la demo. |
| E6 | **PASS** | Campo NASA Data con OSDR RadLab y EDA, DONKI y HRP, y su papel; ingestas reales en `manifest.json` (`FUENTES.md` §6). |
| E7 | **PASS** | IA declarada en README, informe §11 y campo SI; sin imágenes/vídeo/audio generados; sin marcas NASA en app ni pptx. |
| E8 | **PASS** | Referencias con DOI, licencias de software, fuentes, BodyParts3D (CC BY 4.0, atribución visible en la app), smart-monitor. |
| E9 | **PASS** | Sin personas en app, capturas ni diapositivas. |
| E10 | **UNKNOWN** | Lista de comprobación de `ENVIO.md` sin marcar; el envío lo hace el equipo. |

## 2. Puntuación por subcriterio

| Impact | Pts | Evidencia |
| --- | ---: | --- |
| I1 Problema cuantificado | 4 | 22 min, 5 peligros HRP, EIMO, Law 2014, Norsk 2015 con fuente en readme, informe §3 y About (`t2-real-en-escritorio-about.png`); `FUENTES.md` los respalda. |
| I2 Tres roles | 4 | Selector `View as` con Astronaut / Crew Medical Officer / Flight Surgeon (recorrido propio): la vista CMO filtra a compartidas, escaladas y de entorno; la vista Cirujano muestra «Report received» y la respuesta. Escalamiento mínimo verificado por el Tester (`GET /escalamientos` id 1 → destinatario 2). |
| I3 Efecto medido | 2 | Detección y falsas alarmas reproducibles: `packages/engine/fixtures/kpi.json` (semilla 2026 y 2027), `barrido.json`, `GET /simulacion/kpi`, límites declarados. **Falta el tiempo de registro**: el informe §10 reconoce que los 90 s son objetivo sin cronometrar con nadie externo. |
| I4 Alcance | 2 | Cinco perfiles funcionales (retardo 12 min → 1 s verificado por el Tester; conversión ppm→mmHg por presión). Impacto en Tierra: solo una frase genérica (Antártida, rural) sin caso concreto ni fuente (informe §9). |
| I5 Reutilizable | 4 | `LICENSE` MIT con terceros declarados; README `Run it` ejecutable; `packages/schemas` como contrato; atribución del modelo. |
| **Impact** | **16/20 (4/5)** | |

| Creativity | Pts | Evidencia |
| --- | ---: | --- |
| C1 Más que umbrales fijos | 4 | Capas A/B/C y contexto en `engine.ts`; 59 tests Node incluida la paridad con el caso Python; umbral fijo 91 lpm nunca dispara en `kpi.json`. |
| C2 Entorno en el razonamiento | 4 | Reglas CO2+cefalea y tormenta en motor y tests («son alertas de entorno, no médicas»); pantalla Entorno con fuente y fecha real por valor; alertas «Crew» de tormenta por eventos DONKI reanclados (vista CMO). |
| C3 Diseño operativo | 4 | Verde/ámbar privadas con «Share», roja escalada con «Ver lo enviado» (`t2-flujo-rojo-alerts.png`); cola con el retardo real del perfil (`t2-reports-real-encolado.png`, API `retardo_min 12`); sin conexión verificado en it. 1 sobre el sitio (sw v1); `sw.js` v2 no reverificado. |
| C4 Interfaz propia | 4 | Cuerpo 3D BodyParts3D con zonas clicables, diales sin teclado, identidad propia (capturas home, check-in). |
| C5 Validación creativa | 4 | `simulacion.py`, 500+500 misiones, anomalías inyectadas, control, segunda semilla, barrido de parámetros publicado. |
| **Creativity** | **20/20 (5/5)** | |

| Validity | Pts | Evidencia |
| --- | ---: | --- |
| V1 Umbrales con fuente | 4 | NEWS2 por parámetro, CO2 3 mmHg, S1 = 10 pfu y presiones de cabina RESPALDADAS en `FUENTES.md`; las correcciones exigidas se aplicaron (agregación «cortes propios de VIGÍA» en alerta y About; ficha SpO2 «pendiente»; supuestos del simulador declarados como escenario de estrés). Plazos 14/21 días declarados como diseño. |
| V2 Texto = código | 2 | Corregido: modo real sin simulador ni ánimo por defecto, retardo real, cola de demo filtrada (`reports-view.tsx:145,225`). **Persisten:** i18n `instrumentChange` dice «7 logged days» y motor/informe dicen 8 (`DIAS_VENTANA_REINICIO = 5 + 3`); `ENVIO.md:50` «248 tests» frente a 263 reales y a «192 + 2 / 57» del informe §7; la bitácora da por cerrado T2-04 pero `GET /tripulantes/1/reportes?lang=en` devuelve `respuesta` y contenido en español (solo el hilo `mensajes` se tradujo). |
| V3 Modo real honesto | 4 | «No check-in yet today», chips «Not measured today» (recorrido propio), simulador `disabled` en real, ánimo opcional (`animo_1_10: null`), error visible sin API, DONKI vacío sin etiqueta «Real»; 2 tests de guarda. |
| V4 Calidad técnica | 4 | 204 + 59 tests OK, `contextgen --check` OK, 0 errores de consola/red en 63 cargas (Tester 2), CI con ruff, tsc y `next build`. No ejecuté el build; lo cubre el workflow. |
| V5 Usabilidad | 2 | Aviso «Not a medical device» en pie, About y manifiesto; controles de 56–80 px. **Defectos vigentes:** los avisos tapan el botón «+» del dial de registro (caja 1008–1088 × 495–575 bajo el aviso 652–1260 × 519–658, recorrido propio y `t2-demo-en-escritorio-check-in.png`); a 390 px la banda «You have no check-ins yet» se parte en una palabra por línea y el contenido empieza a 1136 px de 844 (`evaluador/ev-movil-home-viewport.png`); contraste de texto pequeño verde/ámbar en tema claro ≈ 4,1:1 (< 4,5, tokens `#0C8F5B` / `#B06F00` sin cambio desde it. 1); sin cronometraje del registro. |
| **Validity** | **16/20 (4/5)** | |

| Relevance | Pts | Evidencia |
| --- | ---: | --- |
| R1 Reunir | 4 | 9 pasos con unidad: FC, PA, SpO2, temperatura, sueño, ánimo, síntomas, glucosa y masa semanales; «How to measure» por perfil y «why it matters» de las fichas (API `fichas?lang=en`). |
| R2 Evaluar | 4 | Cuerpo clicable con estado por sistema, razón y acción; tendencias con banda personal; el estado vacío ya no dice «Todo en orden» (chips «Not measured today»). |
| R3 Actuar | 4 | «What to do now» en cada alerta; recordatorio «Daily check-in pending» y lista de rutina; escalamiento automático verificado con rojo real. |
| R4 Datos NASA integrales | 4 | RadLab, EDA, DONKI (+ GOES) ingeridos con SHA-256, reanclados y mostrados con fuente y fecha real; CO2 de EDA y SEP de DONKI entran en las reglas; «Where this data comes from» ya en inglés por API. |
| R5 Consideraciones | 4 | Cinco perfiles, recordatorios, gráficas con banda, fichas con «why», modo adaptación explicado. Sin rachas (declarado). |
| **Relevance** | **20/20 (5/5)** | |

| Presentation | Pts | Evidencia |
| --- | ---: | --- |
| P1 Demo oficial | 2 | **Pendiente de enlace.** pptx de 7 diapositivas en inglés con reto, imagen, experiencia y datos abiertos; faltan equipo e integrantes (placeholders) y el enlace público probado. |
| P2 Resumen en inglés | 4 | `ENVIO.md` High-Level Summary ≈ 150 palabras: problema, reunir/evaluar/actuar, datos, límite. Legible en 60 s. |
| P3 Primera pantalla | 2 | Escritorio: «No check-in yet today», «Do my check-in / View demo mode», línea «You log → VIGÍA compares → You know what to do» (recorrido propio). Móvil: dos filas de pestañas (regresión T2-01 corregida), pero la primera pantalla es cabecera + controles + banda rota; nada del flujo visible sin desplazar. |
| P4 Coherencia | 2 | Cifras KPI iguales en readme, informe, About, pptx y `kpi.json`. Discrepancias: recuento de tests (248 / 194+57 / 263), 7 frente a 8 días tras cambio de instrumento, y el sitio público difiere de toda la documentación hasta el redespliegue. |
| P5 Público y en inglés | 2 | Repo y sitio públicos sin registro (200), identidad propia sin logotipos NASA. Pero el sitio público sirve hoy la versión en español; README enlaza un informe en español como complementario. |
| **Presentation** | **12/20 (3/5)** | |

**Total: 16 + 20 + 16 + 20 + 12 = 84/100.** Respecto a la iteración 1 (62) se recuperaron: I5 licencia, I2 roles, V3 modo real, V4 evidencia de tests, R2 estado vacío, P2 resumen, C2/C3/R4 con pruebas propias; la demo y el despliegue siguen sin cerrar.

## 3. Recuperación de los 16 puntos perdidos (ordenada por puntos por hora)

| # | Subcriterio | Qué falta exactamente | Cambio concreto | h | pts/h |
| --- | --- | --- | --- | ---: | ---: |
| 1 | I3 +2 | Métrica de tiempo de registro | Cronometrar 5 registros completos (3 personas, incluida una ajena al equipo), anotar mediana y rango en README «Results» e informe §7; sin tocar código. | 0,5 | 4 |
| 2 | P5 +2 | Sitio público con la versión anterior | Redesplegar `main` tras el merge (necesita el permiso `ssh`); comprobar en ventana privada `?lang=en` en `/about`, `sw.js` = `v2`, `/vigia-api/entorno/referencia?lang=en`. Cierra también E4/E5 público. | 0,5 | 4 |
| 3 | P1 +2 | Enlace público y equipo | Rellenar `[TEAM NAME]`, integrantes y evento en la diapositiva 1 (y en `ENVIO.md`, informe), exportar a PDF, subir a Drive «cualquiera con el enlace», probar en ventana privada, pegar en `Link to Project Demo`. | 0,5 | 4 |
| 4 | P4 +2 | Cifras distintas entre documentos | Poner «263 tests (204 Python, 59 Node)» en `ENVIO.md:50` e informe §7; cambiar «7 logged days / 7 días registrados» por 8 en `es.json:624` y `en.json:624`. | 0,5 | 4 |
| 5 | V2 +2 | Textos de la API en español con `lang=en`; i18n 7 ≠ 8 días | Añadir `titulo_en`, `resumen_en`, `lectura_en`, `linea_base_en`, `entorno_en`, `accion_en` al sembrado `informes.json` y servirlos en `/tripulantes/{id}/reportes?lang=en` como ya se hace con `respuesta_en` en `mensajes` (`rutas_dashboard.py:228`); el punto 4 cubre los 8 días. | 1 | 2 |
| 6 | P3 +2 | Primera pantalla móvil casi sin contenido | En la banda «no check-ins» y en la barra de controles usar `flex-col` bajo `sm` (texto a ancho completo, botones debajo); plegar «View as» y el día de misión en un desplegable en móvil. Verificar que `main` empiece antes de 600 px a 390×844. | 1 | 2 |
| 7 | V5 +2 | Avisos tapan el dial; banda móvil; contraste | Mover los avisos a la esquina inferior izquierda o no mostrarlos en `/check-in` (ya quedan en Alertas); el punto 6 arregla el móvil; subir tokens claros a `--status-ok: #0A7A4E` y `--status-watch: #8F5A00` (≥ 4,5:1) en `globals.css`. | 1,5 | 1,3 |
| 8 | I4 +2 | Impacto en Tierra sin casos concretos | Añadir a informe §9 y About dos casos con fuente (estación antártica Concordia/ESA con un solo médico y evacuación imposible en invierno; comunidades remotas con Bio-Monitor según CSA) y la decisión que cambia; mostrar en About la misma lectura de 4 000 ppm como 3,04 mmHg en ISS y 1,7 mmHg en superficie. | 1,5 | 1,3 |

Hallazgo sin descuento, conviene revisar antes de la demo: en la vista CMO las alertas de tormenta de los días 18–20 se titulan «Solar storm · 0,276 pfu» (flujo real de GOES bajo el umbral) porque las dispara el evento SEP de DONKI reanclado; el título debería nombrar el evento DONKI y no el flujo, o un juez verá una alerta de tormenta con 0,3 pfu.

## 4. Dictamen

> VIGÍA responde de lleno al reto: reunir, evaluar y actuar a bordo, con datos NASA dentro del razonamiento y con límites declarados con una honestidad poco habitual.
> El código actual sostiene lo que el texto promete: 263 tests en verde, modo real sin datos inventados, tres roles, cola con retardo real y escalamiento mínimo verificados.
> Lo que resta son cierres de entrega, no de fondo: enlace público de la demo con el equipo, redespliegue del sitio, cifras coherentes entre documentos.
> Quedan tres defectos de uso visibles para un juez: avisos que tapan el dial, primera pantalla móvil rota y contraste bajo en tema claro.
> Otorgo **84/100** al repositorio actual; el sitio público, sin redesplegar, vale hoy menos que eso y no acredita E4 ni E5.
