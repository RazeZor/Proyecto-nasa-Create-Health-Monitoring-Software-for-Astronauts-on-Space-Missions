# VIGÍA — Informe final del proyecto

**Equipo:** `[NOMBRE DEL EQUIPO]`
**Reto:** *Create Health Monitoring Software for Astronauts on Space Missions* — NASA Space Apps Challenge 2026 (nivel intermedio; Exploración Humana, Software, Exploración Espacial; agencia asociada: Agencia Espacial Canadiense, CSA)
**Aplicación en línea:** https://vigia.smoraleslo.dev — escenario demo en inglés: https://vigia.smoraleslo.dev/?modo=demo&lang=en
**Repositorio:** https://github.com/RazeZor/Proyecto-nasa-Create-Health-Monitoring-Software-for-Astronauts-on-Space-Missions
**Informe técnico (español, detalle completo):** `documentacion/VIGA-informe-tcnico-para-el-reto-Health-Monitoring-Software-NASA-Space-Apps-2026.md`
**Fecha:** 15 de noviembre de 2026

**Resumen.** A mitad de camino a Marte, un mensaje al cirujano de vuelo tarda hasta 22 minutos en cada sentido y la evacuación no es posible, así que la tripulación debe detectar, interpretar y actuar sobre su propia salud por sí misma. VIGÍA (la vigía es quien vigila desde lo alto) es una aplicación web que funciona primero sin conexión y permite a cada astronauta hacer exactamente eso a bordo. Un registro diario guiado de menos de 90 segundos recoge la frecuencia cardiaca en reposo, la presión arterial, la SpO2, la temperatura, el sueño, el ánimo y los síntomas (glucosa y masa corporal, semanales). Un motor híbrido de tres capas compara cada lectura con tramos clínicos de seguridad (tramos por parámetro de NEWS2 con cortes de agregación propios del equipo, más conservadores), con la línea base en vuelo del propio astronauta (z modificada con mediana/MAD) y con derivas lentas (CUSUM unilateral), y cruza el resultado con datos reales de entorno de la NASA y la NOAA: dosis de radiación en la ISS (RadLab de OSDR), CO2, temperatura y humedad de cabina (EDA de OSDR), eventos de partículas solares (DONKI del CCMC) y flujo de protones GOES (NOAA SWPC). Un cuerpo 3D clicable muestra verde, ámbar o rojo por sistema corporal con el motivo y el siguiente paso; solo una alerta roja de seguridad sale del dispositivo, hacia el oficial médico de la tripulación, con el dato mínimo; los informes a la Tierra viajan con el retardo de comunicación real del perfil de misión. En 500 misiones simuladas el motor detectó una deriva lenta inyectada en el 99,8 % de los casos (mediana de 8 días tras el inicio), mientras que un umbral terrestre fijo nunca se disparó; son resultados de simulación, no rendimiento clínico. VIGÍA es un prototipo de apoyo a la decisión, no un dispositivo médico.

---

## 1. Resumen ejecutivo

**Problema.** El concepto *Earth-Independent Medical Operations* (EIMO) de la NASA establece que en misiones de clase Marte no hay evacuación, ni retorno de muestras, ni apoyo de tierra en tiempo real: las decisiones médicas pasan de tierra a la tripulación. El software de salud en órbita actual está hecho para enviar datos a la Tierra para su interpretación. Los cinco peligros del vuelo espacial (radiación, aislamiento y confinamiento, distancia a la Tierra, gravedad alterada, entorno cerrado hostil) interactúan entre sí, y el cuerpo en vuelo se aleja de los rangos de referencia terrestres, así que un panel que aplica umbrales de la Tierra a señales aisladas pasa por alto tanto la interacción como la deriva.

**Solución.** VIGÍA cierra el ciclo a bordo en tres pasos: **recoger** (registro diario guiado con unidades, «cómo medir en este perfil de misión» y «por qué importa» para cada indicador), **evaluar** (motor híbrido: piso clínico, desviación personal, deriva lenta, más reglas de contexto que leen el entorno medido) y **actuar** (estado por sistema corporal con explicación y siguiente paso, escalamiento con privacidad por defecto, informes con retardo al cirujano de vuelo). Todo corre en el navegador y en la API de a bordo; la red solo precarga datos de entorno y sincroniza informes.

**Qué es real y qué es simulado.** El entorno es real: flujo de protones GOES y eventos SEP de DONKI en sus fechas reales; dosis de RadLab (ALTEA-Survey, ISS, noviembre de 2011) y telemetría de cabina de EDA (Rodent Research-1, ISS, septiembre de 2014) reancladas a la línea de tiempo de la misión, cada valor rotulado con su fuente y su fecha real. La fisiología de la tripulación nunca es pública: en **modo real** (por defecto) la app muestra solo lo que el tripulante registra o el reloj mide; en **modo demo** se muestra un tripulante simulado de 30 días con tres anomalías inyectadas, rotulado «Simulado» en todas las pantallas.

**Resultados principales (simulación, semilla 2026, 500 misiones con anomalías + 500 misiones de control).**

| KPI | Resultado |
| --- | --- |
| Deriva lenta detectada (sueño −0,2 h/día, FC +1 lpm/día, ánimo −0,15/día) | 99,8 %, mediana de 8 días tras el inicio |
| La misma deriva a media intensidad | 17,8 %, mediana de 9 días |
| Umbral terrestre fijo (FC ≥ 91 lpm) | nunca se disparó |
| Regla CO2 + cefalea; regla de tormenta solar | 100 % (reglas deterministas) |
| Falsas alarmas por tripulante y semana (misiones de control) | 0,0003 (días 1–14, solo capa A); 0,000 (días 15–30) |
| Repetición independiente con semilla 2027 | 99,8 % de detección, 8 días; 0 falsas alarmas |

El motor TypeScript de la app reproduce alerta por alerta el caso de referencia en Python (test de paridad), así que las cifras describen también el motor que ejecuta el usuario.

**Límites en un párrafo.** No se usa fisiología real de astronautas. Los tramos de la capa A provienen de NEWS2, un estándar hospitalario terrestre, aplicado a 4 de sus 7 parámetros con cortes de agregación propios del equipo; cada umbral es una regla de prototipo con fuente citada, pendiente de revisión por un cirujano de vuelo. El ruido simulado es gaussiano y el generador lo escribió el mismo equipo, así que los KPI son optimistas. La radiación es dosis ambiental de un detector de área, no dosis personal; GOES mide en órbita geoestacionaria e indica severidad y momento, no la dosis de la tripulación. No implementado: masa corporal en la capa C, corrección metrológica en vuelo de la capa A, el test de vigilancia PVT-B, entrada por cámara, cifrado del almacenamiento y autenticación de la tripulación.

---

## 2. El reto y cómo lo responde VIGÍA

El reto oficial pide un software que recoja indicadores de salud y permita al astronauta evaluar su estado y actuar. Sus cinco recursos listados son material de referencia de NASA HRP y de la CSA, no conjuntos de datos. Trazabilidad de cada objetivo y consideración:

| Qué pide el reto | Tipo | Cómo lo responde VIGÍA | Estado en el prototipo |
| --- | --- | --- | --- |
| Herramienta visual para que el astronauta evalúe su propia salud y reciba orientación sobre tratamiento y mejora | Objetivo | Estado por sistema corporal en un cuerpo 3D clicable, con el motivo y una tarjeta de acción («qué hacer ahora») | Implementado |
| Datos por cualquier entrada (teclado, clics, imágenes de cámara) que representen un indicador con su unidad | Objetivo | Registro diario con unidades visibles (mmHg, lpm, %, °C, h, mg/dL, kg); entrada con diales y deslizadores diseñada para pantalla táctil; el Galaxy Watch4 prellena la FC en reposo y la SpO2 | Implementado sin entrada por cámara (hoja de ruta) |
| Usar recursos públicos para decidir qué indicadores importan, cuáles se miden en el espacio, por qué es necesario el examen, cómo los afectan los peligros, cuándo avisar a la tripulación o al cirujano de vuelo y qué prevención existe | Objetivo | Una ficha por indicador con esos seis campos y una fuente citada para cada uno; el texto «cómo medir en vuelo» cambia con el perfil de misión | Implementado (10 fichas, en español e inglés) |
| Interfaz clara; se sugiere una figura humana clicable que muestre la función y el estado de cada parte | Objetivo | Cuerpo anatómico 3D (BodyParts3D, CC BY 4.0) coloreado por sistema, que late a la frecuencia cardiaca medida; figura 2D en SVG de respaldo sin WebGL | Implementado |
| Información para distintos entornos: nave, estación, róver, base planetaria | Consideración | Cinco perfiles de misión (estación, tránsito, tránsito acoplado tipo Gateway, superficie lunar, superficie marciana) que cambian la presión de cabina, la gravedad, el retardo y las instrucciones de medición | Implementado |
| Recordar al astronauta tomar mediciones o completar acciones rutinarias | Consideración | Recordatorios del registro diario y de las mediciones semanales | Implementado (contenido fijo de los recordatorios; el contenido demo está rotulado) |
| Gamificación, gráficas de indicadores en el tiempo, código de colores | Consideración | Gráficas de tendencia con la banda personal; verde/ámbar/rojo en todas partes; temporizador de 90 segundos y barra de progreso en el registro | Gráficas y colores implementados; rachas no implementadas |
| Instrucciones y explicaciones sencillas de mediciones, indicadores y riesgos | Consideración | «Cómo medir» y «por qué importa» en cada indicador; una sección «Marco de riesgos» en Acerca de | Implementado |

Los seis indicadores de ejemplo que nombra el reto (presión arterial, frecuencia cardiaca, glucosa en sangre, temperatura corporal, horas de sueño, ánimo) entran todos en el registro diario. Lo que VIGÍA añade más allá del enunciado: un motor híbrido de tres capas, el entorno medido dentro del razonamiento y la operación bajo retardo de comunicación. La orientación de los mentores recibida en Space Apps Connect (datos reales híbridos más sintéticos rotulados, una línea base individual, tres niveles de alerta transparentes) dio forma a estas decisiones.

---

## 3. Problema y evidencia

**EIMO y el retardo.** En la ISS el retardo de ida es del orden de 0,25 s a través del relé TDRS, y una cápsula de retorno está a horas de distancia. Hacia Marte el retardo de ida alcanza unos 22 minutos (NASA Ames, Parisi 2024; estudio de retardo de comunicación de NASA ASCEND), más de 40 minutos de ida y vuelta; la evacuación y el retorno de muestras son imposibles. Por eso el Concepto de Operaciones de EIMO (NASA NTRS, 2024 y revisión de 2025) traslada progresivamente la atención médica y la toma de decisiones a la tripulación. La Luna queda en medio: 1,3 s de tiempo luz, y la NASA prevé 5–12 s de retardo operativo en Artemis por el relé y el procesamiento.

**Cinco peligros, más de 30 riesgos.** NASA HRP agrupa los riesgos del vuelo espacial humano en cinco peligros (RIDGE: Radiation, Isolation and confinement, Distance from Earth, Gravity fields, hostile closed Environment; es decir, radiación, aislamiento y confinamiento, distancia a la Tierra, campos de gravedad y entorno cerrado hostil) y afirma que se retroalimentan entre sí. Patel et al. (2020) cuentan más de 30 riesgos de salud documentados ligados a ellos. La figura corporal, las etiquetas de alerta y las fichas de VIGÍA usan esa taxonomía; el informe técnico (§3.2) mapea los 17 riesgos listados por HRP a indicadores y declara cuáles se cubren por completo, parcialmente o no se cubren (enfermedad por descompresión, lesiones en EVA, interacciones huésped–microorganismo, trabajo en equipo y cargas dinámicas quedan fuera del alcance).

**La fisiología en vuelo no es la fisiología terrestre.** Cifras que fijan el diseño, cada una de una fuente primaria verificada por el equipo:

| Hallazgo | Fuente | Consecuencia para VIGÍA |
| --- | --- | --- |
| La presión arterial braquial ambulatoria de 24 h baja (sistólica −8 mmHg) por una caída del 39 % de la resistencia vascular sistémica; la frecuencia cardiaca de 24 h no cambia (n = 8 hombres, 3–6 meses en la ISS) | Norsk et al., *J Physiol* 2015 | Una línea base en vuelo es obligatoria; un valor terrestre «normal» no es normal en órbita. La presión arterial de muñeca sin manguito, calibrada en la Tierra, no es fiable en vuelo |
| Los astronautas duermen unas 6 h por noche en vuelo (6,09 h en la ISS); en 24 astronautas en misiones de 6 meses, dormir menos se asoció a una velocidad de respuesta menor y a más estrés | Barger et al., *Lancet Neurol* 2014; Jones et al., *Sleep* 2022 | La duración del sueño es un indicador central; solo se usa la duración total (la actigrafía estima bien la duración y mal la eficiencia) |
| La temperatura central en reposo sube cerca de 1 °C a lo largo de 2,5 meses y superó los 40 °C durante el ejercicio en algunas personas | Stahn et al., *Sci Rep* 2017 | Un umbral de fiebre terrestre da falsos positivos en vuelo; la temperatura de la piel de un reloj no sustituye a la temperatura central |
| El volumen plasmático cae cerca de un 17 % en las primeras 24 h; el mareo espacial aparece durante los primeros 1–2 días | Williams et al., *CMAJ* 2009 | Los primeros días no son una referencia válida: las capas B y C son solo informativas durante un modo de adaptación de 14 días |
| Pérdida ósea del 1 %/mes (columna) y del 1,5 %/mes (cadera) | Lang et al., *J Bone Miner Res* 2004 | Se registran el cumplimiento del ejercicio y la masa corporal semanal; la densidad ósea en sí no puede medirse en vuelo |
| Pérdida de masa corporal medida como −4,4 % (BMMD) y −2,8 % (SLAMMD) en los mismos 25 tripulantes | Zwart et al., *Aviat Space Environ Med* 2014 | El dispositivo de medición se guarda junto con el valor; masas de instrumentos distintos no se comparan en silencio |
| Por cada 1 mmHg de aumento del CO2 de cabina, la probabilidad (odds) de cefalea reportada se duplicó; un promedio de 7 días por debajo de 2,5 mmHg mantiene el riesgo por debajo del 1 % | Law et al., *J Occup Environ Med* 2014 | La cefalea se lee junto con el CO2 de cabina |
| NASA-STD-3001 Vol. 2 Rev D [V2 6004] limita el promedio de 1 hora de ppCO2 a 3 mmHg, lo que mantiene la incidencia de cefalea por debajo del 1,4 % | Informes técnicos de NASA OCHMO sobre ECLSS y CO2 | La regla de contexto de CO2 usa el máximo diario del promedio horario frente a 3 mmHg |
| La dosis efectiva en la ISS se acumula a unos 0,2–0,5 mSv/día, 40–90 mSv en una misión de seis meses; límite de carrera de 600 mSv; 250 mSv por evento de partículas solares | Simonsen, NASA ASCEND 2025; NASA OCHMO-TB-020 | El contador de dosis se muestra frente a estos límites de referencia |
| Los neutrones aportan cerca del 30 % de la dosis de radiación en la ISS | CSA, *Monitoring radiation for astronaut health* (2026) | Límite declarado del módulo de dosis: el detector de silicio usado no separa esa componente |
| Una tormenta de radiación solar comienza cuando el flujo de protones ≥10 MeV alcanza 10 pfu (S1 en la escala de la NOAA) | NOAA SWPC Space Weather Scales | Umbral del modo tormenta |
| El síndrome neuro-ocular asociado al vuelo espacial (SANS) afecta a una gran parte de la tripulación de larga duración | Lee et al., *npj Microgravity* 2020 | Los síntomas visuales se autorreportan; el diagnóstico requiere fundoscopia u OCT, así que la cobertura se declara parcial |

**Por qué las herramientas existentes no cierran la brecha.** El kit de presión arterial/ECG de la ISS es voluminoso y consume mucha energía según la propia NASA ExMC; la prenda Bio-Monitor de la CSA (ECG, presión arterial, respiración, temperatura de la piel, SpO2, en la ISS desde 2018) está diseñada para enviar datos a tierra; las conferencias médicas privadas asumen una comunicación casi instantánea; EIMO es un marco, no un producto que la tripulación use hoy; otros prototipos de este reto son paneles de signos vitales con umbrales poblacionales fijos, con el entorno, cuando existe, en un panel aparte. VIGÍA llena la capa que convierte los datos en una decisión a bordo, sin la Tierra y con contexto.

---

## 4. Datos: fuentes de la NASA y de agencias asociadas

Todos los datos de entorno provienen de API públicas, entran en un datalake, se reanclan a la línea de tiempo de la misión mediante un escenario explícito y se muestran en la app con su fuente y su fecha real. La fisiología de la tripulación no es pública: los datos médicos individuales de los astronautas están protegidos por la Privacy Act y se acceden bajo solicitud a través de NASA LSAH/LSDA; no existe telemetría biomédica pública en tiempo real. Por eso la fisiología de la tripulación en VIGÍA la introduce el usuario (o el reloj) o se simula y se rotula.

| Conjunto de datos | Agencia / API | Qué ingiere VIGÍA (verificado el 14–15 de noviembre de 2026) | Qué alimenta |
| --- | --- | --- | --- |
| **RadLab** (portal de radiación y Data API) | NASA OSDR | Detector ALTEA-Survey, US Lab, ISS: tasas de dosis absorbida y equivalente, 12–16 de noviembre de 2011 (6 157 filas, cadencia de 60 s) | Dosis ambiental en la pantalla Entorno y contexto de dosis de cada alerta; se usa la dosis equivalente porque los límites de la NASA están en mSv |
| **Environmental Data Application (EDA)** | NASA OSDR | Rodent Research-1, ISS: CO2 de cabina (ppm), temperatura, humedad relativa, 21–25 de septiembre de 2014, telemetría cada 5 minutos (1 440 filas) | Perfil de cabina; el CO2 entra en la regla «cefalea + CO2» tras convertirlo a presión parcial |
| **DONKI** (Space Weather Database Of Notifications, Knowledge, Information) | NASA CCMC, vía api.nasa.gov y ccmc.gsfc.nasa.gov | Eventos de partículas energéticas solares (SEP) del periodo de tormentas de mayo de 2024 (14 eventos); consulta en vivo de los últimos 30 días | Un evento SEP activa el modo tormenta para toda la tripulación en su hora real de inicio |
| **Flujo integral de protones GOES** | NOAA SWPC | Últimas 24 h, promedios de 5 minutos (858 filas); se conservan tres de los ocho canales (≥10, ≥50, ≥100 MeV) | Severidad de la tormenta; umbral S1 de 10 pfu a ≥10 MeV |
| **Recursos de HRP** (5 Hazards, Risks, Ongoing HRP Research) | NASA HRP | Material de referencia | Estructura de la figura corporal, etiquetas de alerta, contenido y fuentes de las fichas, tabla de cobertura de los 17 riesgos |
| **Inspiration4** (OSD-569, OSD-575) | NASA OSDR | Química sanguínea de 4 tripulantes | La única referencia clínica humana real que usamos, citada por la variabilidad intrapersonal; no está integrada como dato en vivo |
| **Bio-Monitor** | CSA | Lista de señales (ECG, PA, respiración, temperatura de la piel, SpO2, actividad) | Esquema de señales del modelo de datos; el Galaxy Watch4 lo sustituye en la demo |

**Reanclaje a la línea de tiempo de la misión.** Las series reales provienen de misiones y años distintos y no pueden superponerse por fecha. De cada fuente se elige una ventana real continua; su primera marca de tiempo se asigna a un día de misión y el resto se desplaza con el mismo corrimiento. Los valores nunca se escalan, suavizan ni interpolan. Cada punto conserva su hora real en UTC (`t_real`) junto a su tiempo de misión (`t_mision`). Las series se agregan a una rejilla común de 5 minutos y a resúmenes diarios (flujo de protones máximo, máximo del promedio horario de CO2, dosis del día). La coincidencia entre una ventana de CO2 de 2014 y una tormenta de 2024 en el mismo día de misión es una decisión de escenario; la app nunca la presenta como un hecho observado. Cuando DONKI, GOES y RadLab se consultan para las mismas fechas reales (por ejemplo, mayo de 2024) la relación es real y así se indica.

**Rótulos de procedencia.**

| Elemento | Naturaleza | Rótulo en la app |
| --- | --- | --- |
| Dosis, flujo de protones, eventos SEP, telemetría de cabina | Medición real, reanclada | «Real», con fuente y fecha original |
| Calendario de misión y el día en que cae cada ventana | Escenario | «Escenario» |
| Signos vitales, sueño, ánimo y síntomas de la tripulación en modo demo | Simulación con supuestos declarados | «Simulado» (solo en modo demo) |
| Anomalías inyectadas (deriva, pico de CO2, tormenta de 200 pfu) | Simulación | «Simulado» (solo en modo demo) |
| Lecturas que el tripulante registra en modo real | Medición del usuario | «Medido» |

**Perfiles de misión y conversión de CO2.** EDA y la mayoría de los sensores reportan el CO2 en ppm, pero el límite fisiológico es una presión parcial, así que la misma lectura en ppm significa presiones distintas en hábitats distintos: `ppCO2 (mmHg) = ppm × P_cabina (mmHg) / 10^6`.

| Perfil | Presión de cabina | O2 | Gravedad | 3 mmHg de CO2 equivalen a | Retardo de ida en el perfil |
| --- | --- | --- | --- | --- | --- |
| Estación (ISS) | 14,7 psia (760 mmHg) | 21 % | 0 g | 3 950 ppm | 0–1 s |
| Tránsito a Marte | 14,7 psia (760 mmHg) | 21 % | 0 g | 3 950 ppm | 180–1 320 s (3–22 min) |
| Tránsito acoplado / tipo Gateway (atmósfera de preparación para EVA) | 10,2 psia (527 mmHg) | 26,5 % | 0 g | 5 690 ppm | 1–3 s (tiempo luz) |
| Superficie lunar (atmósfera de exploración) | 8,2 psia (424 mmHg) | 34 % | 0,165 g | 7 070 ppm | 1–3 s (tiempo luz) |
| Superficie marciana (atmósfera de exploración propuesta) | 8,2 psia (424 mmHg) | 34 % | 0,38 g | 7 070 ppm | 180–1 320 s |

Fuentes: NASA HRP Evidence Report sobre hipoxia hipobárica (NTRS 20150021491), ICES-2022-196 e ICES-2023 (NTRS 20230009095), NASA/TP-2010-216134. La atmósfera nominal de Gateway es de 14,7 psia; 10,2 psia / 26,5 % aplica en la preparación para EVA. Ninguna misión de superficie tiene aún una atmósfera fija; los valores son los nominales recomendados o planificados por la NASA y se guardan en el archivo de perfiles, no en el código. 3 950 ppm es el límite en la ISS, pero a 8,2 psia la misma lectura es solo 1,7 mmHg: un umbral fijo en ppm daría falsas alarmas en la superficie y dejaría pasar 5,4 mmHg en la estación.

**Por qué los datos de la NASA son indispensables.** Sin RadLab no hay contador de dosis; sin DONKI y GOES no hay modo tormenta; sin EDA el motor no puede separar un síntoma ambiental de uno fisiológico; sin las páginas de HRP las fichas no tienen fundamento.

---

## 5. Arquitectura

Monorepo organizado por unidad desplegable (`apps/`, `pipelines/`, `packages/`, `tools/`); `apps` y `pipelines` nunca se importan entre sí y se comunican solo mediante los contratos de datos de `packages/schemas`.

| Capa | Componente | Qué hace | Decisiones clave |
| --- | --- | --- | --- |
| Ingesta | `pipelines/datalake` (Python, solo biblioteca estándar) | Sondea GOES, DONKI, RadLab y EDA, valida el estado HTTP y la estructura, limpia y guarda la respuesta cruda y las filas limpias con URL, hora de consulta y SHA-256 en `manifest.json` (patrón medallón raw → curated → gold) | `data/raw/` nunca se sobrescribe; una estructura inesperada lanza `EstructuraInesperada` y no se escribe nada |
| Reanclaje y simulación | `pipelines/reanclaje` | Coloca las ventanas reales en la línea de tiempo de la misión, publica la zona gold (paneles para los escenarios real y demo), ejecuta el simulador y el barrido de parámetros | Doble marca de tiempo en cada punto; salidas versionadas en git como fixtures (`kpi.json`, `barrido.json`, `caso-referencia.json`) |
| API de a bordo | `apps/api` (FastAPI + SQLite, almacenamiento con biblioteca estándar) | Sirve la zona gold verificada (SHA-256 comprobado contra el manifiesto antes de cada respuesta; falla cerrado), guarda el registro de la tripulación (lecturas, síntomas, línea base, alertas, escalamientos, cola con retardo, auditoría), hace de puente con el reloj | Representa el cómputo local de la nave, no una nube; las tablas `alerta`, `escalamiento` y `auditoria` son de solo inserción (triggers); reenviar la misma alerta devuelve el id existente |
| Aplicación web | `apps/web` (Next.js 16, React 19, TypeScript, Tailwind CSS 4, three.js) | Ocho pantallas: Cuerpo, Registro, Tendencias, Entorno, Alertas, Informes, Dispositivo, Acerca de; español e inglés | PWA instalable; el motor corre en el navegador; la app solo conoce la API y abre sin ella tras la primera visita |
| Motor | `packages/engine` (TypeScript puro, sin IO) | Capas A, B, C y reglas de contexto; port 1:1 de `evaluar_tripulante` del simulador en Python con un test de paridad | Si una regla cambia, cambia en ambos lados; la fixture se regenera desde la referencia en Python |
| Contratos | `packages/schemas` | JSON Schema para lecturas, alertas, gold de entorno y el caso de referencia; perfiles de misión; fichas de indicador con fuentes (español e inglés) | Los pipelines, la API y la app validan contra ellos |
| Traducciones | `packages/i18n` | Español principal, inglés secundario; cada cadena visible sale del catálogo | Los tests fallan ante una clave presente en inglés pero ausente en español |
| Herramientas | `tools/` | Generador de contexto para los archivos MODULE, procesamiento del modelo anatómico (BodyParts3D), validador de referencias (Crossref/Europe PMC), notas de sincronización del reloj | — |

**Sin conexión.** Un service worker escrito a mano (`public/sw.js`) guarda en caché la carcasa de la app (el HTML de las ocho pantallas, los recursos estáticos y el modelo 3D) al instalarse; la navegación va primero a la red, con la caché como respaldo; las llamadas a la API no se interceptan. El catálogo y el panel de entorno se copian localmente en la primera carga; si la API no responde, la app abre con la copia local, muestra «sin enlace» y reintenta cada 30 s y cuando vuelve la red. Los registros y los escalamientos rojos se encolan localmente y se sincronizan cuando vuelve el enlace. El service worker se registra solo en producción; el probador independiente verificó en el sitio público que la navegación y la recarga funcionan con la red apagada (caché `vigia-carcasa-v1`, 33 entradas). Solo la primera apertura en un dispositivo necesita enlace.

**Privacidad y roles.** Tres roles: astronauta, oficial médico de la tripulación (CMO) y cirujano de vuelo en tierra. El verde y el ámbar nunca salen del dispositivo. Solo una alerta roja de la capa A se escala automática e inmediatamente al CMO (o al comandante o al suplente designado si el CMO es el paciente) con el dato mínimo: indicador, valor, hora y tramo clínico; sin historial ni otros indicadores. El astronauta ve en pantalla que el aviso salió y qué contenía, no puede cancelarlo pero puede añadir contexto una vez; la regla se acepta antes del vuelo como parte del acuerdo de la tripulación. Las alertas de entorno y el modo tormenta se comparten con toda la tripulación como datos ambientales, nunca como síntomas individuales. Cada acceso de otro rol se escribe en la tabla de auditoría de solo inserción. Tras tres días ámbar consecutivos la app recomienda compartir, pero no comparte.

**Cola con retardo.** Los informes que el astronauta envía a tierra esperan el retardo de ida del perfil activo antes de «llegar»; un reloj del lado del servidor los marca como entregados con la hora real del servidor; el cirujano de vuelo lee y responde desde la vista de tierra, y la respuesta viaja de vuelta con el mismo retardo. En modo demo la cola se acorta a cerca de un minuto y así lo indica; en modo real aplica el retardo completo.

**Galaxy Watch4 vía smart-monitor.** El servidor propio del equipo (smart-monitor) recibe el flujo del reloj; la API se conecta a él como un panel y persiste solo valores válidos para el registro diario (frecuencia cardiaca en reposo y SpO2, `origin = sensor`, `method = galaxy_watch4`), nunca el flujo a 1 Hz. La app prellena la frecuencia cardiaca en reposo del día (mediana de la ventana de 5 minutos más baja con el reloj en la muñeca y sin movimiento; nunca un pulso instantáneo) y la SpO2 de las últimas 12 horas, muestra el pulso en vivo en el cuerpo 3D y una HRV de 5 minutos. El reloj no aporta presión arterial ni temperatura utilizables: su presión arterial es una estimación por onda de pulso calibrada contra un manguito cada 28 días, y esa calibración asume un estado vascular que el vuelo espacial cambia en un 39 %; no tiene sensor de temperatura, y la temperatura de la piel no representaría la temperatura central en microgravedad. Ambas siguen siendo manuales con método declarado. Un cambio de instrumento de medición se detecta y reinicia la ventana de línea base de ese indicador, pausando las capas B y C durante 8 días (5 lecturas mínimas más el rezago de 3 días). El reloj es electrónica de consumo presentada como sustituto de demostración de una prenda como Bio-Monitor, no como hardware de vuelo propuesto.

**Modo real y modo demo.** El modo real es el predeterminado: solo datos del usuario o del reloj más el entorno medido; una fuente no disponible muestra «sin datos» y, sin registro diario aún, el cuerpo dice «aún sin registro» en lugar de «todo en rango». El modo demo (`?modo=demo` o el selector de Datos) muestra el tripulante simulado de 30 días del caso de referencia (día 27 de la demo) con un aviso en todas las pantallas, un almacén local separado y sin subida ni escalamiento. La auditoría del 15 de noviembre encontró, y el equipo corrigió, tres vías por las que valores simulados o por defecto podrían haber llegado al almacén real (simulador de pulso activo fuera del modo demo, un ánimo por defecto de 7 guardado sin confirmación y el hilo de tierra de la demo filtrándose en el hilo real); ahora hay tests de regresión que las protegen.

---

## 6. El motor híbrido en detalle

El motor no diagnostica. Hace tres preguntas sobre cada registro diario y después lee el entorno. Ninguna capa basta por sí sola: un umbral estadístico solo es inseguro para las variables de seguridad, y un umbral clínico fijo es ciego a la deriva lenta.

| Capa | Variables | Regla | Salida |
| --- | --- | --- | --- |
| **A. Seguridad clínica** | SpO2, temperatura, PAS, FC en reposo | Tramos por parámetro de NEWS2 (RCP, 2017) en 4 de sus 7 parámetros; **cortes de agregación propios**: rojo si un parámetro está en su tramo extremo (3 puntos) o la suma es 5 o más; ámbar si la suma es 3 o 4 | Rojo (escalamiento automático) o ámbar. Activa desde el día 1, no necesita línea base |
| **B. Desviación personal** | FC en reposo, PAS, glucosa, sueño, ánimo | z modificada frente a la línea base vigente, dos días consecutivos (glucosa, semanal: dos lecturas consecutivas) | Ámbar; solo informativa en adaptación (días 1–14) |
| **C. Deriva lenta** | FC en reposo (al alza), sueño y ánimo (a la baja) | CUSUM unilateral, k = 0,75, h = 5, desde el día 21; la suma se reinicia tras cada alerta | Ámbar |
| **Contexto** | Síntomas y entorno | CO2 de cabina > 3 mmHg (máximo diario del promedio horario) con cefalea reportada; flujo GOES ≥10 MeV ≥ 10 pfu o un evento SEP de DONKI | Alerta de entorno de ámbito tripulación (ámbar, sin datos personales); modo tormenta. Un síntoma que el entorno no explica da un ámbar personal en su zona corporal |

**Tramos de la capa A usados.**

| Parámetro | Tramo extremo (3) | 2 puntos | 1 punto | Normal |
| --- | --- | --- | --- | --- |
| SpO2 (%) | ≤ 91 | 92–93 | 94–95 | ≥ 96 |
| Temperatura (°C) | ≤ 35,0 | ≥ 39,1 | 35,1–36,0; 38,1–39,0 | 36,1–38,0 |
| PAS (mmHg) | ≤ 90; ≥ 220 | 91–100 | 101–110 | 111–219 |
| Frecuencia cardiaca (lpm) | ≤ 40; ≥ 131 | 111–130 | 41–50; 91–110 | 51–90 |

Qué es de NEWS2 y qué es nuestro: los tramos por parámetro coinciden uno a uno con la tabla del RCP. La agregación no: el RCP define 0–4 como riesgo bajo, un único 3 como bajo-medio (revisión urgente en planta), 5–6 como medio y 7 o más como alto, sobre siete parámetros que incluyen la frecuencia respiratoria, el nivel de consciencia y el oxígeno suplementario, que VIGÍA no registra. Los cortes de VIGÍA son, por tanto, del equipo, deliberadamente más conservadores y aplicados a una suma sistemáticamente menor; son reglas de prototipo que un cirujano de vuelo debe revisar antes de cualquier uso real. Una corrección metrológica planificada (aplicar los tramos de 1 y 2 puntos solo cuando la lectura también se aparta de la línea base del perfil, porque la presión sistólica, la temperatura central y la SpO2 cambian en vuelo por razones físicas) **no está implementada** en ninguno de los dos motores; las fichas la declaran pendiente.

**Capa B.** Para una lectura *x* con la mediana y la desviación absoluta mediana (MAD) de la línea base vigente, `M = 0.6745 × (x − mediana) / MAD`. Umbral |M| ≥ 3,5 para las variables fisiológicas (Iglewicz y Hoaglin; NIST e-Handbook §1.3.5.17) y 3,0 para las conductuales autorreportadas (sueño, ánimo), dos días consecutivos en ambos casos. Cada variable tiene un piso de dispersión (`mad_min`: FC 2,5 lpm, sistólica 4 mmHg, glucosa 6 mg/dL, sueño 0,4 h, ánimo 1,0) para que una línea base muy estable no convierta el ruido en alertas. La SpO2 y la temperatura no pasan por esta capa. Un valor no medido es `null`: no puntúa, no alerta y rompe la persistencia de dos días (la glucosa semanal es la excepción).

**Línea base del prevuelo al vuelo.**

| Días de vuelo | Referencia | Capas activas |
| --- | --- | --- |
| Prevuelo (14 días) | Se registra la línea base de tierra | — |
| 1–14 (adaptación) | Línea base de tierra, solo informativa; desde el día 8 la ventana en vuelo empieza a llenarse sin usarse | A y alerta de contexto; B y C se calculan y se muestran, pero no alertan |
| 15–20 (mezcla) | Mezcla progresiva de tierra y vuelo, con peso `w = min(1, (d − 14) / 7)` en centro y dispersión | A, B y contexto |
| 21 en adelante | Línea base en vuelo | A, B, C y contexto |

La ventana en vuelo toma hasta 14 lecturas, empieza el día 8 y termina 3 días antes de la fecha evaluada, para que una deriva en curso no se absorba en su propia referencia; se excluyen los días con alerta o con cruce de umbral; se necesitan al menos 5 lecturas. El motor no conoce los corrimientos que usa el simulador: la referencia en vuelo sale solo de las lecturas. Un tripulante sin línea base de tierra se evalúa con la capa A desde el día 1 y con B y C cuando la ventana tiene 5 lecturas. El calendario de 14/21 días es una decisión de diseño conservadora, no un valor clínico validado (Mishra et al. 2020 usaron una línea base de 28 días con datos de wearables).

**Capa C.** CUSUM acumula desviaciones pequeñas y sostenidas en una dirección y alerta cuando la suma supera h = 5; k = 0,75 apunta a un corrimiento de 1,5σ y reduce las falsas alarmas respecto al k = 0,5 de los libros de texto. Ambos valores se ajustaron en simulación con un barrido de nueve combinaciones (`index.py barrer`, publicado como `barrido.json`), no se tomaron de la literatura. La capa solo empieza el día 21 porque el corrimiento de adaptación la dispararía antes. La misma arquitectura (línea base personal de FC en reposo más CUSUM en línea) detectó infecciones antes del día de los síntomas o ese mismo día en 15 de 24 casos con datos de wearables (Mishra et al., *Nat Biomed Eng* 2020) y en el 80 % de los participantes infectados en un estudio prospectivo con 3 318 personas (Alavi et al., *Nat Med* 2022); esa evidencia es terrestre y valida el método, no su uso en vuelo.

**Reglas de contexto.** La regla de CO2 es una inferencia de diseño de VIGÍA a partir de Law 2014 y NASA-STD-3001, no un protocolo operativo de la NASA: dos tripulantes que reportan cefalea con CO2 de cabina por encima de 3 mmHg producen una alerta de entorno («revisar ventilación y repetir»), no dos alertas médicas. El modo tormenta se activa con un evento SEP de DONKI o con un flujo GOES ≥10 MeV de 10 pfu o más, y recomienda refugio y una lista de síntomas agudos a vigilar; las lecturas tomadas durante el evento se marcan para que una náusea posterior se lea con ese antecedente. Como el CO2 se convierte con la presión de cabina del perfil activo, la misma lectura en ppm puede ser una alerta en la estación y no en la superficie lunar.

---

## 7. Validación

**Protocolo de simulación** (`pipelines/reanclaje/simulacion.py`, `index.py simular`). Cada misión tiene 30 días de vuelo, 14 días de prevuelo y 4 tripulantes. Se inyectan tres anomalías conocidas y se pasan por el motor de referencia en Python; el mismo número de misiones de control sin anomalías mide las falsas alarmas.

| Caso | Inyectado | Cuándo | Esperado |
| --- | --- | --- | --- |
| A1. Deriva cardiovascular por falta de sueño | Sueño −0,20 h/día, FC en reposo +1 lpm/día, ánimo −0,15/día en un tripulante | Días 18–27 | Ámbar por la capa B o C dentro de la ventana |
| A2. Cefalea por un pico de CO2 | CO2 horario máximo de 4,6 mmHg; dos tripulantes reportan cefalea | Día 12 (adaptación) | Una alerta de entorno para ambos, no dos alertas médicas |
| A3. Tormenta solar | 200 pfu a ≥10 MeV durante dos días | Día 22 | Modo tormenta el mismo día |

Supuestos del generador, todos declarados en `kpi.json`: corrimientos sostenidos en vuelo de +3 lpm de FC en reposo, −0,7 h de sueño y −4 mmHg de sistólica, con una adaptación aguda que decae con una constante de 4 días. Son un **escenario de estrés para el detector**, no una reproducción de la literatura: Norsk 2015 halló la frecuencia cardiaca de 24 h sin cambios y la sistólica −8 mmHg; Barger 2014 reporta 6,09 h de sueño; ninguna fuente da una constante de adaptación de 4 días. Los KPI no se recalcularon con otros valores.

**Resultados** (motor de referencia; 500 misiones con anomalías y 500 misiones de control; semilla 2026; `packages/engine/fixtures/kpi.json`).

| KPI | Intensidad completa | Media intensidad | Lectura |
| --- | --- | --- | --- |
| Deriva A1 detectada | 99,8 % | 17,8 % | La sensibilidad cae mucho con derivas débiles; el 99,8 % no se presenta como general |
| Días desde el inicio de la deriva hasta la alerta (mediana) | 8 | 9 | — |
| A2 CO2 + cefalea detectada | 100 % | 100 % | Regla determinista |
| A3 tormenta detectada | 100 % | 100 % | Regla determinista |
| Umbral terrestre fijo (FC ≥ 91 lpm) disparado | 0 % | 0 % | La ventaja sobre un umbral fijo no puede calcularse; el hallazgo es que nunca ve la deriva |
| Misiones de control con alguna falsa alarma | 0,2 % | — | 0,0 % de alertas por azar dentro de la ventana de A1 |
| Falsas alarmas por tripulante y semana, días 1–14 | 0,0003 | — | Solo capa A; B y C no alertan en adaptación |
| Falsas alarmas por tripulante y semana, días 15–30 | 0,000 | — | — |
| Validación independiente, semilla 2027 | 99,8 %, 8 días; 0,0 % de falsas alarmas | — | Mismo resultado con una segunda semilla |

**Qué significan y qué no significan los números.** Provienen del motor de referencia sobre datos generados por el mismo equipo: no miden rendimiento clínico. Las falsas alarmas casi nulas reflejan el ruido gaussiano y los pisos de dispersión amplios, no una propiedad de tripulaciones reales; los mismos pisos explican por qué la deriva a media intensidad se detecta solo en el 17,8 % de las misiones. Bajar k a 0,5 adelanta la detección un día en el barrido; no se cambió, para no ajustar los parámetros a la anomalía que se quiere detectar. Lo que los números sí muestran es que un motor con línea base personal ve una deriva que un umbral fijo nunca ve.

**Paridad.** El simulador exporta `caso-referencia.json` con las lecturas día a día y las alertas esperadas de los cuatro tripulantes simulados; `packages/engine/paridad-referencia.test.ts` exige que el motor TypeScript lo reproduzca alerta por alerta, y `test_simulacion.py` exige que la fixture sea idéntica a la salida del generador. Las cifras de la simulación valen, por tanto, para el motor que ejecuta la app.

**Tests automatizados en el momento de la auditoría (15 de noviembre de 2026).**

| Suite | Alcance | Cantidad |
| --- | --- | --- |
| Python `unittest` (8 suites) | Ingesta y manifiesto del datalake, reanclaje y simulación (identidad de la fixture), API (rutas, almacenamiento, reglas de privacidad y escalamiento, cola con retardo, puente del reloj, documentación OpenAPI de cada ruta), esquemas y fichas, reglas del catálogo i18n, generador de contexto | 192 tests antes de la auditoría, más 2 tests de guarda añadidos para la separación real/demo |
| Node `node:test` | Paridad del motor y cambio de instrumento; biblioteca web: adaptador del motor, sincronización de alertas, registro de la API, caché del catálogo, cola, sincronización, máquina de estados del reloj | 57 tests |
| Comprobación de tipos y build | `tsc --noEmit` sin errores; `next build` de la PWA | Ejecutados a mano tras las correcciones |
| No automatizado | Service worker (sin conexión), cuerpo 3D, interfaz | Verificado a mano y mediante la ejecución con navegador sin interfaz del probador independiente (ocho pantallas × cuatro combinaciones de modo/idioma, estados vacío/cargando/error/sin conexión, el flujo completo en modo real desde el registro diario hasta el escalamiento rojo registrado en la API) |

---

## 8. Experiencia de usuario

**Recoger → evaluar → actuar.** La pantalla Cuerpo abre con el estado general y el botón «Iniciar registro». El registro presenta una medición por paso, con su unidad, el último valor conocido preajustado en un dial con botones +/− y un deslizador, y dos textos breves de la ficha: cómo medirla en el perfil de misión activo y por qué importa. Solo se guardan los valores confirmados o ajustados; una medición omitida se guarda como «sin dato», nunca como 0. Durante el registro corren un temporizador de 90 segundos y una barra de progreso. La pantalla de resultado indica el estado del día y «qué hacer ahora» por zona corporal; la pantalla Cuerpo colorea los órganos de cada sistema y late a la frecuencia cardiaca medida; Tendencias muestra cada indicador frente a su banda personal; Entorno muestra la dosis, el flujo de protones, los eventos SEP y el CO2, la temperatura y la humedad de cabina, cada uno rotulado Real o Simulado con fuente y fecha real; Alertas muestra cada alerta con su capa, su umbral, quién puede verla y exactamente qué salió del dispositivo; Informes muestra la cola con retardo y las respuestas del cirujano de vuelo; Dispositivo muestra el reloj; Acerca de explica el proyecto, el motor, los datos, los límites y el uso de IA.

**Accesibilidad y decisiones pensadas para el tacto** (diseñado para una pantalla táctil de 19 pulgadas; verificado por el probador con mediciones de elementos). Objetivos táctiles de 48–56 px o más en todas partes: diales de 80 px, opciones de 56 px, pestañas de 64 px, botones principales de 64 px. Nada depende del hover. La entrada numérica usa diales y deslizadores, no teclado, para que sea posible usarla con guantes o flotando; el deslizador responde también a las teclas de flecha y los botones a Enter/Espacio. Cada botón, campo y selector tiene un nombre accesible; los diales usan `role=group` con `aria-label`, el ánimo y el sitio de medición usan `role=radiogroup`, la barra de progreso expone `aria-valuenow`, el temporizador es `role=timer`, el resultado recibe el foco de forma programática como `role=status`; un enlace para saltar al contenido es visible al recibir el foco. Las tipografías (Space Grotesk, IBM Plex Mono) van empaquetadas, así que la interfaz no necesita red para renderizarse. Tema claro por defecto con un tema oscuro; el probador anotó que los colores verde y ámbar del texto pequeño sobre el fondo claro quedan justo por debajo de la relación de contraste 4,5:1 de WCAG AA (3,77:1 y 3,75:1), mientras que todos pasan en el tema oscuro.

**Idiomas.** El español es el idioma principal y el inglés el secundario; todas las cadenas visibles salen de `packages/i18n` (760 claves por catálogo, ninguna faltante), y la API sirve las fichas y los recordatorios en inglés con `lang=en`. Algunos textos provenientes de los datos (mensajes del hilo de tierra, contenido de los informes demo, algunas unidades) seguían en español en la interfaz en inglés en el momento de la auditoría.

**Modo real frente a modo demo.** El enlace público de la demo abre el tripulante simulado rotulado en el día 27, donde la deriva del caso A1 es visible (CUSUM de frecuencia cardiaca y sueño corto como alertas ámbar). El modo real es el predeterminado en todos los dispositivos; en el sitio público todos los visitantes comparten un único tripulante de prueba porque la autenticación no está implementada, y el sitio muestra un aviso al respecto.

**No es un dispositivo médico.** El pie de cada pantalla, la página Acerca de, el manifiesto web y el README indican que VIGÍA es un prototipo de apoyo a la decisión, que sus umbrales son reglas de prototipo con fuentes citadas y no límites de vuelo clínicamente validados, y que no es un dispositivo médico.

---

## 9. Impacto y usuarios

| Usuario | Necesidad | Qué le da VIGÍA |
| --- | --- | --- |
| Astronauta (principal) | Saber en un minuto si está bien y qué hacer si no | Estado diario, explicación y acción; control sobre lo que se comparte |
| Oficial médico de la tripulación | Ver a toda la tripulación y priorizar, incluso cuando el paciente es el propio CMO | Vista de tripulación con los escalamientos que las reglas de cada miembro autorizaron; enrutamiento de respaldo al comandante |
| Cirujano de vuelo en tierra | Informes completos que no exijan preguntas de ida y vuelta | Un paquete con lectura, línea base, entorno con procedencia y la acción tomada, entregado con el retardo de la misión y con canal de respuesta |
| Misiones análogas y entornos remotos (secundario) | La misma autonomía en estaciones antárticas, hábitats análogos o comunidades rurales | El mismo motor con otro perfil de entorno; la CSA ya señala usos terrestres de Bio-Monitor en comunidades con acceso limitado a la atención médica |

Los dos perfiles de usuario centrales salen del propio enunciado del reto, que nombra a la tripulación y al cirujano de vuelo como quienes deben actuar sobre los resultados. El equipo no hizo entrevistas ni un estudio de usabilidad; por tanto, no se afirma validación con usuarios y es el primer punto de la hoja de ruta.

**Entornos de misión.** Cinco perfiles cubren la estación, el vehículo de tránsito (en vuelo libre y acoplado), la superficie lunar y la superficie marciana; cada uno cambia la presión de cabina usada en la conversión de CO2, la gravedad usada en las instrucciones de medición, el retardo de la cola de informes y el detector del módulo de dosis. RadLab cubre también detectores de espacio profundo (CRaTER en órbita lunar, LND en la superficie lunar, MSL-RAD en Marte, Liulin-MO en ExoMars TGO, BioSentinel), así que cada perfil puede alimentarse de un detector real de su entorno en una versión posterior.

**Impacto por dimensión.** Social: autonomía en salud para quien está lejos de un médico, en el espacio y en la Tierra. Científico: un registro por persona que une salud y exposición ambiental, el tipo de datos que necesita la investigación sobre la interacción de los peligros. Operativo: menos consultas de ida y vuelta por evento. No se afirma un impacto económico cuantificado porque no hay datos que lo respalden.

---

### 9.3 Análogos terrestres con una decisión concreta

| Entorno | Por qué encaja | Decisión que VIGÍA cambia | Fuente |
| --- | --- | --- | --- |
| Estación Concordia, Antártida (ESA) | Un solo médico para la tripulación y nueve meses de invierno sin evacuación posible; la ESA la usa como análogo del vuelo espacial de larga duración. | Cada tripulante recibe un estado diario frente a su propia línea base y un siguiente paso antes de consultar al único médico. | https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Concordia |
| Comunidades remotas y salud rural (Bio-Monitor de la CSA) | La CSA presenta su wearable Bio-Monitor como tecnología que también puede servir a personas lejos de un hospital. | Un registro diario con línea base personal y niveles de alerta transparentes informa cuándo solicitar un traslado. | https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp |

## 10. Límites declarados y hoja de ruta

**Límites del prototipo.**

- No se usa fisiología real de astronautas; la fisiología de la demo es simulada con supuestos declarados. Los datos médicos individuales de los astronautas están protegidos (Privacy Act, LSAH/LSDA) y no existe telemetría pública en tiempo real.
- La capa A usa NEWS2, un estándar hospitalario terrestre, en 4 de sus 7 parámetros con cortes de agregación propios del equipo. Cada umbral es una regla de prototipo con fuente citada, no un límite de medicina de vuelo clínicamente validado; un cirujano de vuelo debe revisarlos antes de cualquier uso real. La corrección metrológica planificada de los tramos de 1 y 2 puntos no está implementada.
- Los corrimientos en vuelo del simulador (FC en reposo +3 lpm, sistólica −4 mmHg, sueño −0,7 h, constante de adaptación de 4 días) son un escenario de estrés, no una reproducción de la literatura (Norsk 2015: frecuencia cardiaca sin cambios, sistólica −8 mmHg; Barger 2014: 6,09 h de sueño). Los KPI son optimistas: ruido gaussiano, pisos de dispersión amplios, generador escrito por el mismo equipo.
- El calendario de línea base de 14/21 días, la pausa de 8 días tras un cambio de instrumento y los parámetros del CUSUM son decisiones de diseño ajustadas en simulación, no valores clínicos.
- La radiación es dosis ambiental de un detector de área, no dosis personal; el detector usado no separa la componente de neutrones (cerca del 30 % en la ISS). GOES mide en órbita geoestacionaria: indica severidad y momento, no la dosis de la tripulación. En el escenario del modo real la ventana de cabina cubre solo los primeros días de misión, y la consulta en vivo a DONKI no devolvió ningún evento SEP en los últimos 30 días.
- El retardo lunar del perfil (1–3 s) es tiempo luz; la NASA prevé 5–12 s de retardo operativo en Artemis. El valor vive en el archivo de perfiles y puede cambiarse sin tocar código.
- No implementado: masa corporal en la capa C, reinicio de la línea base de SpO2 al cambiar de perfil, corrección de la masa corporal por la gravedad local, el test de vigilancia PVT-B, rachas de registro, entrada por cámara, cifrado del almacenamiento y autenticación de la tripulación (la API de a bordo identifica al tripulante por una cabecera; el sitio público comparte un tripulante de prueba).
- La oximetría de pulso en el dedo se ha mostrado válida en microgravedad solo en muestras pequeñas y de vuelos cortos (Conkin et al. 2017); no hay validación de larga duración frente a gases en sangre. Las estimaciones de presión arterial de muñeca no se usan en vuelo por las razones dadas en el §5.
- No se obtuvo ningún estudio de usabilidad, ni cronometraje de la meta de 90 segundos con personas ajenas al equipo, ni puntuación SUS; se declaran como objetivos, no como resultados.
- Los puntos registrados por la auditoría independiente de la interfaz del 15 de noviembre de 2026 (barra de pestañas móvil que oculta seis secciones a 390 px, página Acerca de servida en español con `lang=en`, pantalla en blanco durante cargas lentas, avisos emergentes que cubren contenido, contraste del texto pequeño en el tema claro) se siguen en `auditoria/`; su estado en el momento de la entrega está registrado allí, no aquí.

**Hoja de ruta** (postulaciones a programas abiertos, no alianzas).

| Horizonte | Meta | Entregables |
| --- | --- | --- |
| 3 meses | Validar el motor con datos humanos reales y públicos | Prueba con conjuntos de datos abiertos de wearables terrestres; revisión de las reglas por un médico; estudio de usabilidad con 10–15 personas; implementar la corrección metrológica de la capa A y la masa corporal en la capa C; ruta Galaxy Watch con Samsung Health Sensor SDK (SpO2, IBI, acelerómetro) |
| 6 meses | Probar en un entorno aislado | Piloto en una misión análoga o estación remota (convocatorias HERA y HERO de la NASA, TRISH; la CSA como socio natural a través de Bio-Monitor); integración con una prenda sensorizada comercial; informes en HL7 FHIR; test de vigilancia PVT-B; cifrado y autenticación |
| 12 meses | Acercarse a un sistema de apoyo a la decisión | Biblioteca de reglas versionada y auditada; módulo de dosimetría de espacio profundo con los detectores de espacio profundo de RadLab por perfil; propuesta de colaboración con grupos de medicina aeroespacial; versión terrestre para salud rural |

---

## 11. Uso de IA

Se usaron asistentes de programación con IA como herramientas: Claude (Anthropic) a través de Claude Code, y OpenAI Codex como revisor independiente, para investigar fuentes públicas de la NASA, la CSA y la NOAA, para redactar y revisar la documentación y el texto de la entrega, y para ayudar a escribir, revisar y probar código. El planteamiento del problema, la elección de indicadores y reglas del motor, las fuentes de datos y las decisiones de diseño son del equipo; cada fuente citada fue verificada por el equipo, y las referencias científicas se validaron contra Crossref y Europe PMC con el validador propio del equipo (`tools/validar-referencias`). Una auditoría independiente de fuentes (`auditoria/FUENTES.md`) clasificó cada afirmación científica y cada umbral como respaldado, parcial, sin respaldo o incorrecto; las correcciones que exigió (atribución de NEWS2, supuestos del simulador, duración del mareo espacial, un rango de cefalea por CO2 sin respaldo) están reflejadas en este informe. No se usan imágenes, vídeo ni audio generados por IA: el cuerpo 3D es un modelo anatómico abierto procesado (BodyParts3D), y el logotipo, los iconos y las ilustraciones los dibujó el equipo. No se usan ni modifican logotipos, banderas ni identificadores de misión de la NASA.

---

## 12. Referencias

**NASA y agencias asociadas**

- NASA HRP, *5 Hazards of Human Spaceflight*: https://www.nasa.gov/hrp/hazards/
- NASA HRP, *Risks of Human Spaceflight*: https://www.nasa.gov/hrp/risks/
- NASA HRP, *Ongoing HRP Research in Space*: https://www.nasa.gov/hrp/ongoing-hrp-research/
- NASA NTRS, *Earth-Independent Medical Operations Concept of Operations* (2024; revisión de 2025).
- NASA Ames, Parisi et al. 2024, retardo de comunicación y autonomía de la tripulación: https://hsi.arc.nasa.gov/publications/AHFE_2024_Parisi.pdf ; NASA ASCEND, *Communication Delays, Disruptions, and Blackouts for Crewed Mars Missions* (NTRS 20220013418).
- NASA OSDR, portal RadLab y Data API: https://visualization.osdr.nasa.gov/radlab/ ; base de conocimiento de ALTEA: https://visualization.osdr.nasa.gov/radlab/kb/ALTEA
- NASA OSDR, Environmental Data Application: https://visualization.osdr.nasa.gov/eda/ ; https://www.nasa.gov/reference/osdr-environmental-data
- Portal y FAQ de NASA OSDR: https://osdr.nasa.gov/ ; https://science.nasa.gov/reference/osdr-faq/ ; NASA Life Sciences Portal: https://nlsp.nasa.gov/
- NASA CCMC, DONKI: https://ccmc.gsfc.nasa.gov/tools/DONKI/ ; NASA Open APIs (api.nasa.gov).
- NASA OCHMO, informe técnico de ECLSS (NASA-STD-3001 Vol. 2 Rev D [V2 6004], CO2 ≤ 3 mmHg en promedio de 1 h): https://www.nasa.gov/wp-content/uploads/2023/07/eclss-technical-brief-ochmo.pdf ; OCHMO-TB-004 Carbon Dioxide: https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-004-carbon-dioxide.pdf
- NASA OCHMO-TB-020, Radiation Protection (600 mSv de carrera; 250 mSv por SPE): https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf
- Simonsen L., NASA ASCEND 2025, tasas de dosis en la ISS (NTRS 20250006168).
- NASA HRP Evidence Report, *Risk of Hypobaric Hypoxia from the Exploration Atmosphere* (NTRS 20150021491); *Designing an Exploration Atmosphere Prebreathe Protocol* (NTRS 20140012830); NASA/TP-2010-216134; ICES-2022-196 (NTRS 20220006727); presentación ICES-2023 sobre el hábitat de tránsito (NTRS 20230009095); Garbino 2024 (NTRS 20240005151).
- NASA LSAH/LSDA, Van Baalen 2017 (NTRS 20170009502): acceso a los datos de salud de los astronautas bajo la Privacy Act.
- NASA NTRS 20190000238, evaluación de Astroskin/Bio-Monitor en HERA.
- CSA, *Monitoring radiation for astronaut health* (26 de febrero de 2026): https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp
- CSA, *Why do we conduct science experiments in space?*: https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp
- CSA, Bio-Monitor / Astroskin: https://www.asc-csa.gc.ca/eng/sciences/astroskin.asp
- NOAA SWPC, flujo integral de protones GOES (JSON): https://services.swpc.noaa.gov/json/goes/primary/ ; Solar Radiation Storms y NOAA Space Weather Scales: https://www.swpc.noaa.gov/noaa-scales-explanation
- Royal College of Physicians, *National Early Warning Score (NEWS) 2* (2017), Chart 2 thresholds and triggers: https://www.rcp.ac.uk/media/2acdezkd/news2-chart-2_news-thresholds-and-triggers_0.pdf

**Literatura revisada por pares** (DOI validados con Crossref; véase `documentacion/referencias-validadas.md`)

- Patel Z.S. et al., *npj Microgravity* 2020, cinco peligros y >30 riesgos. doi:10.1038/s41526-020-00124-6
- Afshinnekoo E. et al., *Cell* 2020, características biológicas fundamentales del vuelo espacial. doi:10.1016/j.cell.2020.10.050
- Norsk P. et al., *J Physiol* 2015, desplazamiento de fluidos, vasodilatación y reducción de la presión arterial ambulatoria. doi:10.1113/jphysiol.2014.284869
- Barger L.K. et al., *Lancet Neurol* 2014, déficit de sueño en astronautas. doi:10.1016/S1474-4422(14)70122-X
- Jones C.W. et al., *Sleep* 2022, sueño y rendimiento neuroconductual en 24 astronautas. doi:10.1093/sleep/zsac006
- Stahn A.C. et al., *Sci Rep* 2017, temperatura corporal central en el vuelo espacial. doi:10.1038/s41598-017-15560-w
- Zwart S.R. et al., *Aviat Space Environ Med* 2014, cambios de masa corporal durante el vuelo espacial de larga duración. doi:10.3357/ASEM.3979.2014
- Williams D. et al., *CMAJ* 2009, aclimatación durante el vuelo espacial. doi:10.1503/cmaj.090628
- Lang T. et al., *J Bone Miner Res* 2004, pérdida ósea. doi:10.1359/JBMR.040307
- Lee A.G. et al., *npj Microgravity* 2020, revisión de SANS. doi:10.1038/s41526-020-0097-9 ; Mader T.H. et al., *Ophthalmology* 2011. doi:10.1016/j.ophtha.2011.06.021
- Law J. et al., *J Occup Environ Med* 2014, CO2 y cefaleas en la ISS. doi:10.1097/JOM.0000000000000158
- Mishra T. et al., *Nat Biomed Eng* 2020, detección presintomática con wearables y CUSUM en línea. doi:10.1038/s41551-020-00640-6
- Alavi A. et al., *Nat Med* 2022, alertas prospectivas en tiempo real a partir de wearables. doi:10.1038/s41591-021-01593-2
- Radin J.M. et al., *Lancet Digit Health* 2020. doi:10.1016/S2589-7500(19)30222-5 ; Quer G. et al., *Nat Med* 2021. doi:10.1038/s41591-020-1123-x ; Li X. et al., *PLoS Biol* 2017. doi:10.1371/journal.pbio.2001402
- Leys C. et al., *J Exp Soc Psychol* 2013, desviación absoluta mediana. doi:10.1016/j.jesp.2013.03.013
- Iglewicz B., Hoaglin D.C., *How to Detect and Handle Outliers*, ASQC 1993; NIST/SEMATECH e-Handbook §1.3.5.17.
- Page E.S., *Biometrika* 1954, esquemas de inspección continua (CUSUM). doi:10.1093/biomet/41.1-2.100
- Smith G.B. et al., *Resuscitation* 2013, rendimiento de NEWS. doi:10.1016/j.resuscitation.2012.12.016 ; Pimentel M.A.F. et al., *Resuscitation* 2019, NEWS2 frente a NEWS. doi:10.1016/j.resuscitation.2018.09.026
- Basner M., Mollicone D., Dinges D.F., *Acta Astronaut* 2011, PVT-B. doi:10.1016/j.actaastro.2011.07.015
- Sendelbach S., Funk M., *AACN Adv Crit Care* 2013, fatiga de alarmas. doi:10.1097/NCI.0b013e3182a903f9
- Marino M. et al., *Sleep* 2013, validez de la actigrafía. doi:10.5665/sleep.3142
- de Mol P. et al., *PLoS ONE* 2010, glucómetros a altitud simulada. doi:10.1371/journal.pone.0015485
- Conkin J. et al., *Aerosp Med Hum Perform* 2017, oximetría de pulso con hipoxia leve y microgravedad.
- Overbey E.G. et al., *Nature* 2024, Space Omics and Medical Atlas (datos de Inspiration4 en OSDR). doi:10.1038/s41586-024-07639-y
- Zeitlin C. et al., *Science* 2013, dosis de crucero de MSL-RAD. doi:10.1126/science.1235989
- Kintz N.M., Palinkas L.A., *Aerosp Med Hum Perform* 2016, retardo de comunicación en la ISS. doi:10.3357/AMHP.4626.2016
- Garrett-Bakelman F.E. et al., *Science* 2019, NASA Twins Study. doi:10.1126/science.aau8650

**Modelos, tipografías y software (código abierto)**

- Anatomía 3D: BodyParts3D, © The Database Center for Life Science, CC BY 4.0, https://lifesciencedb.jp/bp3d/ ; scripts de procesamiento en `tools/modelo-anatomico`, atribución en `apps/web/public/modelos/ATRIBUCION.md` y visible en la app.
- Next.js (MIT), React (MIT), TypeScript (Apache-2.0), Tailwind CSS (MIT), three.js (MIT), lucide-react (ISC), Base UI (MIT), FastAPI (MIT), Uvicorn (BSD-3), SQLite (dominio público), biblioteca estándar de Python.
- Tipografías: Space Grotesk e IBM Plex Mono (SIL Open Font License), empaquetadas con Fontsource.
- Puente con el wearable: smart-monitor, el servidor propio del equipo para el Galaxy Watch4: https://github.com/smoraleslo/smart-monitor
- Documentación de Samsung Health Sensor SDK y Android Health Services (capacidades del reloj; calibración de la presión arterial cada 28 días).
- Logotipo, iconos e ilustraciones dibujados por el equipo. Código bajo licencia MIT.
