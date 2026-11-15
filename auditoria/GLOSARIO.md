# Glosario de VIGÍA · VIGÍA glossary

Qué significa cada término que aparece en la app, el informe y el formulario. Español primero, inglés después. Pensado para el jurado, el equipo y quien lea el repositorio sin contexto.

## Misión y reto · Mission and challenge

| Término | Qué es (es) | What it is (en) |
| --- | --- | --- |
| **VIGÍA** | «Vigía» es quien vigila desde lo alto. Nombre del software: el astronauta vigila su propia salud a bordo. | Spanish for "lookout". The astronaut watches over their own health on board. |
| **EIMO** (Earth-Independent Medical Operations) | Concepto de la NASA: en misiones lejanas la decisión médica pasa de tierra a la tripulación, porque la comunicación tarda y no hay evacuación. | NASA concept: on distant missions medical decisions move from the ground to the crew, because communication is delayed and evacuation is impossible. |
| **Cinco peligros del vuelo espacial** (HRP) | Radiación, aislamiento y confinamiento, distancia a la Tierra, campos de gravedad y entorno cerrado hostil. Estructuran la figura humana y las etiquetas de alerta. | NASA HRP's five hazards: radiation, isolation and confinement, distance from Earth, gravity fields, hostile closed environment. They structure the body figure and alert labels. |
| **HRP** (Human Research Program) | Programa de la NASA que estudia cómo el vuelo espacial afecta al cuerpo. Fuente de las fichas de indicador. | NASA program studying how spaceflight affects the body. Source of the indicator fact sheets. |
| **Retardo de comunicación / de ida** | Lo que tarda una señal en llegar de la nave a la Tierra: menos de 1 s en la ISS, ~1,3 s en la Luna, de 3 a 22 min en Marte. Los informes de VIGÍA viajan con ese retardo. | One-way light-time delay: <1 s on the ISS, ~1.3 s at the Moon, 3–22 min at Mars. VIGÍA's reports travel under that delay. |
| **Perfil de misión** | Dónde está la tripulación: estación (760 mmHg), tránsito (760), tránsito acoplado tipo Gateway (527), superficie lunar (424) o marciana (424). Cambia la presión de cabina, el retardo y las instrucciones de medición. | Where the crew is: station, transit, docked transit (Gateway-like), lunar surface, Mars surface. It sets cabin pressure, delay and measurement instructions. |
| **Día de misión** (t_mision) | Día contado desde el inicio de la misión (D001…). Las mediciones reales de distintas fechas se «reanclan» a esta línea de tiempo. | Day counted from mission start. Real measurements from different dates are re-anchored to this timeline. |
| **t_real** | Hora real en UTC ISO 8601 (`2026-11-15T03:00:00Z`) en la que se midió o envió algo. Siempre acompaña al día de misión. | Real UTC timestamp of a measurement or message, always kept next to the mission day. |

## Indicadores y medición · Indicators and measurement

| Término | es | en |
| --- | --- | --- |
| **Registro diario** (check-in) | Toma guiada de menos de 90 s: pulso en reposo, presión arterial, SpO2, temperatura, sueño, ánimo y síntomas; glucosa y masa semanales. Una medida no tomada se guarda como «sin dato», nunca como 0. | Guided daily entry under 90 s. A measurement not taken is stored as "no data", never 0. |
| **FC en reposo** (lpm / bpm) | Latidos por minuto con el cuerpo en calma, valor del día, nunca un pulso suelto. | Resting heart rate, beats per minute: the day's resting value, never an instant pulse. |
| **PAS / PAD** (mmHg) | Presión arterial sistólica y diastólica en milímetros de mercurio. | Systolic and diastolic blood pressure. |
| **SpO2** (%) | Saturación de oxígeno en sangre medida con oxímetro de pulso (dedo o muñeca). | Blood oxygen saturation measured by pulse oximetry. |
| **Temperatura central** (°C) | Temperatura corporal interna con método declarado (oral, etc.), no de la piel. | Core body temperature with a declared method, not skin temperature. |
| **Ánimo** (1 a 10) | Autoevaluación diaria del estado de ánimo a la misma hora. | Daily self-reported mood on a 1–10 scale. |
| **Síntomas** | Lista cerrada: cefalea, náusea, mareo, cambio de visión, erupción. | Closed list: headache, nausea, dizziness, vision change, rash. |
| **Glucosa** (mg/dL) | Azúcar en sangre, medición semanal con tira reactiva. | Blood sugar, weekly fingerstick. |
| **Ficha de indicador** | Para cada indicador: qué es, cómo se mide en vuelo según el perfil, por qué importa, qué peligro lo altera, cuándo avisar y qué prevención existe, con fuentes. | Fact sheet per indicator with six fields and cited sources. |
| **Cambio de instrumento** | Pasar de medir a mano a medir con reloj (o cambiar de reloj). El motor reinicia la ventana de línea base de la FC y pausa 8 días las capas B y C para ese indicador. | Switching the measuring instrument resets the HR baseline window and pauses layers B and C for 8 days. |

## Motor híbrido · Hybrid engine

| Término | es | en |
| --- | --- | --- |
| **Motor híbrido de tres capas** | A (seguridad clínica), B (desviación personal) y C (deriva lenta), más reglas de contexto ambiental. Está escrito dos veces (Python de referencia y TypeScript de la app) con un test de paridad. | Three layers plus context rules; written in Python (reference) and TypeScript (app) with a parity test. |
| **NEWS2** (National Early Warning Score 2) | Escala clínica del Royal College of Physicians (2017) que puntúa 0–3 cada signo vital por tramos. VIGÍA usa sus **tramos por parámetro** en pulso, presión, SpO2 y temperatura, con **cortes de agregación propios** (3 en un parámetro o suma ≥5 = rojo; 3–4 = ámbar), más conservadores que los del RCP. | Royal College of Physicians early-warning score. VIGÍA uses its per-parameter bands with its own, more conservative aggregation cut-offs. |
| **Tramo / banda** | Rango de valores de un indicador con su puntuación NEWS2 (0, 1, 2 o 3). «Tramo extremo» = 3 puntos. | Value range with its NEWS2 score; "extreme band" = 3 points. |
| **Línea base personal** | Lo normal *para esa persona*: mediana y MAD de sus propias lecturas. De tierra (prevuelo) en los días 1–14, mezcla en 15–20 y en vuelo desde el 21 (ventana de hasta 14 lecturas con 3 días de rezago, sin los días con alerta). | The person's own normal: median and MAD of their readings, moving from pre-flight to in-flight. |
| **Mediana y MAD** | Mediana: valor central. MAD (desviación absoluta mediana): dispersión robusta a valores atípicos. Sustituyen a media y desviación típica para que una lectura rara no deforme la referencia. | Median and median absolute deviation: robust center and spread that outliers do not distort. |
| **z modificada** | (valor − mediana) / (1,4826 × MAD). Cuántas «MAD» se aleja la lectura de la línea base; alerta B con |z| ≥ 3,5 dos días seguidos. | Modified z-score; layer B alerts at |z| ≥ 3.5 two days in a row. |
| **Adaptación** (días 1–14) | Primeras dos semanas en vuelo: el cuerpo cambia por diseño, así que la capa B se calcula pero solo informa, no alerta. | First two weeks: layer B is informative only. |
| **CUSUM** (suma acumulada) | Capa C: acumula pequeñas desviaciones en una dirección (FC al alza; sueño y ánimo a la baja) y alerta cuando la suma supera h = 5 (k = 0,75). Detecta derivas lentas que ningún umbral ve. Se reinicia tras alertar. | Cumulative sum detecting slow one-sided drifts; resets after an alert. |
| **Deriva lenta** | Cambio pequeño y sostenido día a día (por ejemplo −0,2 h de sueño/día) que no cruza ningún límite pero acumula. | Small sustained day-to-day change that never crosses a limit but accumulates. |
| **Regla de contexto** | Cruce de un síntoma con el entorno: cefalea con CO2 > 3 mmHg = alerta de entorno para la tripulación; flujo de protones ≥ 10 pfu o evento SEP = modo tormenta. | Symptom-environment rule: headache with CO2 above 3 mmHg; storm mode on proton flux or SEP. |
| **Informativa** | Alerta que se muestra pero no cambia el estado ni avisa (capa B en adaptación). | Shown but does not change status or notify. |
| **Verde / ámbar / rojo** (ok / watch / act) | Estado: todo en orden / hay algo que vigilar / actúa ahora. | Status: in range / something to watch / act now. |
| **Ámbito** personal / tripulación | A quién concierne la alerta: a la persona (médica) o a toda la tripulación (entorno). | Who the alert concerns: the person or the whole crew. |
| **Escalamiento (automático)** | Solo un rojo de la capa A sale del dispositivo: va al oficial médico con el dato mínimo (indicador, valor, hora, tramo). El astronauta ve lo enviado y puede añadir contexto una vez. | Only a layer-A red leaves the device, to the medical officer, with the minimum data. |
| **Paridad** | Test que exige que el motor TypeScript reproduzca alerta por alerta el caso de referencia del motor Python. | Test forcing the TypeScript engine to reproduce the Python reference alert by alert. |

## Entorno y datos abiertos · Environment and open data

| Término | es | en |
| --- | --- | --- |
| **OSDR** (NASA Open Science Data Repository) | Repositorio abierto de la NASA con datos biológicos y ambientales del vuelo espacial. Aloja RadLab y EDA. | NASA's open repository of spaceflight biological and environmental data. |
| **RadLab** | Portal y API de OSDR con la radiación medida por detectores en la ISS y en el espacio profundo. VIGÍA usa ALTEA-Survey (ISS, 2011): tasa de dosis absorbida y equivalente. | OSDR radiation portal; VIGÍA uses the ALTEA-Survey detector (ISS, 2011). |
| **EDA** (Environmental Data Application) | Aplicación de OSDR con telemetría de cabina de la ISS por misión: CO2 (ppm), temperatura y humedad. VIGÍA usa Rodent Research-1 (2014), cada 5 min. | OSDR cabin telemetry: CO2, temperature, humidity. VIGÍA uses Rodent Research-1 (2014). |
| **CO2 en mmHg (presión parcial)** | El CO2 llega en ppm y se convierte con la presión total de cabina del perfil: ppCO2 = ppm × P_total / 10⁶. El límite de la NASA (NASA-STD-3001) es 3 mmHg de promedio horario. | CO2 arrives in ppm and is converted to partial pressure with the profile's cabin pressure; NASA limit 3 mmHg (1-h average). |
| **DONKI** | Base de datos de la NASA (CCMC) con eventos de clima espacial. VIGÍA toma los **SEP** (eventos de partículas energéticas solares). | NASA CCMC space-weather event database; VIGÍA takes SEP events. |
| **SEP** (Solar Energetic Particle event) | Lluvia de partículas de alta energía tras una erupción solar. Enciende el modo tormenta. | High-energy particle burst after a solar eruption; switches storm mode on. |
| **GOES** / **flujo de protones** (pfu) | Satélites de la NOAA en órbita geoestacionaria. El flujo de protones ≥10 MeV se mide en pfu (partículas/cm²·s·sr). 10 pfu = tormenta de radiación S1 en la escala de la NOAA. | NOAA geostationary satellites; proton flux ≥10 MeV in pfu; 10 pfu = NOAA S1 radiation storm. |
| **Modo tormenta** | Estado de la tripulación cuando hay SEP o flujo ≥ 10 pfu: se recomienda refugio y la alerta es de entorno, no médica. | Crew state during a SEP or flux ≥ 10 pfu: shelter recommended; environment alert, not medical. |
| **Dosis ambiental** (mSv) | Radiación medida por un detector de área, no en la persona. VIGÍA la muestra con esa aclaración. | Area-detector dose, not personal dose. |
| **Real / Simulado** | Rótulo de procedencia de cada dato: medición de NASA/NOAA o del tripulante (Real) frente a escenario del modo demo (Simulado). | Provenance label on every value. |
| **Reanclaje** | Colocar series reales de fechas distintas en una misma línea de tiempo de misión mediante un escenario explícito. La coincidencia no se presenta como hecho observado. | Placing real series from different dates on one mission timeline by an explicit scenario. |
| **Datalake raw → curated → gold** | Patrón medallón: crudo (tal cual llega, nunca se sobrescribe), limpio y validado, y publicado para las apps (con manifiesto y SHA-256). | Medallion data-lake pattern with manifest and checksums. |
| **Manifiesto** | Archivo con la huella (SHA-256), fecha y resumen de cada archivo gold; la API verifica la huella antes de servir. | Manifest with checksum, date and summary of each gold file; the API verifies it. |

## Producto y operación · Product and operations

| Término | es | en |
| --- | --- | --- |
| **Modo real** | Por defecto. Solo lo que el tripulante registra o el reloj mide, más el entorno medido. Nada se inventa; sin fuente se muestra «sin datos». | Default mode: only user or watch data plus measured environment; nothing invented. |
| **Modo demo** | Tripulante simulado de 30 días con tres anomalías inyectadas (deriva lenta, pico de CO2 con cefalea, tormenta de 200 pfu), rotulado en todas las pantallas; almacén separado; nunca se sube ni escala. | Simulated 30-day crew member with three injected anomalies, labelled everywhere, never uploaded. |
| **Roles** | Astronauta, oficial médico de la tripulación (CMO) y cirujano de vuelo en tierra. Cada uno ve lo que le corresponde. | Astronaut, crew medical officer, flight surgeon. |
| **Cola con retardo** | Los informes a tierra esperan el retardo de ida del perfil antes de «llegar»; el cirujano responde desde su vista. En demo se acorta a 1 min. | Reports wait the one-way delay before arriving; shortened to 1 min in demo. |
| **PWA / sin conexión** | Aplicación web instalable que funciona sin red gracias a un service worker (guarda la carcasa y el modelo 3D) y a copias locales del catálogo; registros y escalamientos se encolan y se envían al volver el enlace. | Installable web app that works offline via a service worker and local copies; queues sync when the link returns. |
| **Service worker** | Script del navegador que intercepta las peticiones y sirve la copia guardada cuando no hay red. Solo se registra en producción. | Browser script serving cached files offline; registered in production only. |
| **Cuerpo 3D / BodyParts3D** | Modelo anatómico (BodyParts3D, CC BY 4.0, DBCLS) que colorea órganos por sistema y late al pulso medido. Sin WebGL hay figura 2D. | Anatomical 3D model lighting organs by system; 2D fallback without WebGL. |
| **Galaxy Watch4 / smart-monitor** | Reloj del equipo que aporta FC en tiempo real, FC en reposo del día y SpO2 a demanda a través del servidor smart-monitor; VIGÍA lo consume por la API (`puente_reloj`). Nunca guarda el pulso a 1 Hz. | Team's watch providing live HR, daily resting HR and on-demand SpO2 through the smart-monitor server. |
| **Simulador (de pulso)** | Generador de pulso de demostración en `/device`; solo funciona en modo demo. | Demo pulse generator; demo mode only. |
| **Prototipo, no dispositivo médico** | VIGÍA apoya la decisión; sus umbrales son reglas de prototipo con fuente, no límites clínicos validados para vuelo. | Decision support; thresholds are prototype rules, not validated flight limits. |
| **KPI de simulación** | Resultados de 500 misiones con anomalías y 500 de control: detección de deriva 99,8 % (mediana 8 días), umbral fijo nunca, falsas alarmas < 0,001 por tripulante y semana. Son simulación, no rendimiento clínico. | Simulation KPIs, not clinical performance. |
| **SI / IA** (Super Intelligence en el formulario) | Herramientas de IA usadas: Claude Code y Codex para investigación, documentación y revisión de código; sin imágenes ni vídeo generados. | AI tools used; no generated media. |
