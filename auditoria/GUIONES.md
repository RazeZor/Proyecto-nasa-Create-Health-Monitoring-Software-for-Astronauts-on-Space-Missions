# Guiones de VIGÍA · Scripts

> Guion científico vigente: [PITCH-CIENTIFICO](../docs/PITCH-CIENTIFICO.md), con los resultados adversos del banco de auditoría. Las cifras históricas de este documento no deben presentarse como detección general. No hay revisión profesional ni validación clínica ejecutadas.

Cuatro piezas: el pitch de 240 s para el jurado local, el vídeo de 30 s (alternativa a las 7 diapositivas de `DEMO.md`), el recorrido de demo en vivo (qué pulsar y qué decir) y las preguntas probables del jurado con su respuesta. Español para el equipo; las frases que se dicen en inglés van en inglés. Cifras: las de `packages/engine/fixtures/kpi.json`; si cambian, se actualizan aquí.

Reglas: cada dato real se nombra con su fuente; lo simulado se dice que es simulado; no se promete nada que la app no haga. Nunca decir «diagnostica»: VIGÍA **apoya la decisión**.

---

## 1. Pitch de 240 segundos (jurado local)

| Tiempo | Bloque | Qué se dice | Qué se ve |
| --- | --- | --- | --- |
| 0:00–0:25 | Gancho | «Te duele la cabeza y estás mareada. Le escribes a tu médico. La respuesta llegará en 44 minutos, si llega. Vas camino de Marte.» | Pantalla negra con un contador de retardo que sube hasta 22:00 |
| 0:25–1:00 | Problema | «La NASA define cinco peligros del vuelo espacial que se potencian entre sí. En la Estación el modelo es estabilizar y regresar. En Marte no hay regreso: la tripulación decide sola. Los monitores actuales envían datos a tierra; no ayudan a decidir a bordo.» | Los cinco peligros; línea ISS (<1 s) → Luna (1,3 s) → Marte (3–22 min) |
| 1:00–2:30 | Demo con datos NASA | «Esto es VIGÍA, en modo demo, con el wifi apagado. Registro diario en menos de 90 segundos [se completa un registro]. El cuerpo pasa a ámbar: *tu sueño y tu pulso llevan más de una semana derivando respecto a tu propia línea base; ningún límite clínico lo habría marcado*. Abrimos Entorno: dosis real de un detector de la ISS, RadLab de NASA OSDR; CO2 de cabina real de la Environmental Data Application; un evento de partículas solares real del catálogo DONKI activa el modo tormenta para toda la tripulación. Cada dato dice si es real o simulado, su fuente y su fecha. Una SpO2 roja avisa sola al oficial médico con el dato mínimo, y la astronauta ve exactamente qué salió. El informe llega a la vista de tierra tras el retardo.» | La app en vivo (ver recorrido §3) |
| 2:30–3:20 | Impacto | «En 500 misiones simuladas el motor detectó la deriva en el 99,8 % de los casos, a los 8 días de mediana; el umbral fijo terrestre no se disparó nunca; menos de 0,001 falsas alarmas por tripulante y semana. Es simulación, no rendimiento clínico, y lo decimos. Lo usan tres personas: la astronauta, el oficial médico y el cirujano de vuelo. En la Tierra: bases antárticas, barcos, salud rural.» | Tres números grandes con la leyenda «simulación» |
| 3:20–4:00 | Cierre | «Lo que es y lo que no: fisiología real solo la que tú ingresas o mide tu reloj; entorno real de NASA y NOAA; reglas de prototipo con fuente, no límites clínicos validados. Próximos tres meses: revisión por un cirujano de vuelo, prueba de vigilancia PVT-B, dosimetría personal. Cuando la Tierra tarda 22 minutos en contestar, el primer médico eres tú. VIGÍA se asegura de que no estés a ciegas.» | Hoja de ruta en una línea; nombre, QR y enlaces |

**Diapositivas de apoyo del pitch (`VIGIA-pitch.pptx` / `VIGIA-pitch-es.pptx`, 15):** gancho 22:00 → portada → problema → solución → demo (registro y tendencias) → entorno en el razonamiento → demo (informes y reloj) → motor de tres capas → **lo que nos diferencia** (línea base propia, entorno en el veredicto, decidir a bordo en privado y sin conexión, honestidad) → **cinco peligros, cinco respuestas, cinco entornos** (peligro HRP → medida → regla → acción; perfiles con presión y retardo) → **un reloj en la muñeca** (app Wear OS + smart-monitor; solo entran chequeos válidos) → datos NASA → resultados → tres personas, cinco entornos → cierre. Las tres nuevas van dentro del bloque de impacto (2:30–3:20): una frase por diapositiva.

**Versión en inglés de las frases clave** (si el jurado lo pide): "On the way to Mars, a message to your doctor can take 22 minutes each way." · "VIGÍA lets astronauts evaluate their own health on board, offline." · "Clinical safety bands, your own baseline, and real NASA data." · "It tells you why, and what to do next." · "When Earth can't answer, you're not flying blind."

---

## 2. Vídeo de 30 segundos (subtítulos en inglés)

| Tiempo | Subtítulo (inglés) | Imagen |
| --- | --- | --- |
| 0–3 s | "Team `[NAME]` · VIGÍA · Health Monitoring Software for Astronauts" | Título con logotipo |
| 3–8 s | "On the way to Mars, a message to your doctor can take 22 minutes each way." | Contador de retardo |
| 8–14 s | "VIGÍA lets astronauts evaluate their own health on board, offline." | Registro diario con el icono de red apagado |
| 14–22 s | "Clinical safety bands, your own baseline, and real NASA data: ISS radiation dose, cabin CO2, solar particle events." | Cuerpo en ámbar; Entorno con las fuentes RadLab, EDA, DONKI, GOES visibles |
| 22–27 s | "It tells you why, and what to do next. Red alerts reach the medical officer with the minimum data." | Alerta con «Qué hacer»; informe en la cola |
| 27–30 s | "VIGÍA. When Earth can't answer, you're not flying blind." | Nombre, equipo, enlaces |

Grabación: pantalla a 1280×800 con `?modo=demo&lang=en`, sin voz o con voz en español (los subtítulos en inglés son obligatorios). Duración total ≤ 30 s: exceder excluye del juicio global.

---

## 3. Recorrido de demo en vivo (qué pulsar, qué decir)

Preparación: abrir `https://vigia.smoraleslo.dev/?modo=demo&lang=en` (o `lang=es`) en una ventana privada; comprobar la banda «Demo mode»; poner el día de misión en 27 (selector de día) para que estén las tres anomalías; tener a mano la pestaña de la vista Oficial Médico.

1. **Cuerpo (/)**: señalar la banda demo y el pie «prototipo, no dispositivo médico». Leer el estado general y la línea «Registras → VIGÍA compara → Sabes qué hacer». Pulsar la zona en ámbar (corazón o sueño): se abre «Por qué» con la distancia a la línea base y «Qué hacer a continuación». *Decir:* «ningún umbral fijo se habría disparado; la línea base es la suya».
2. **Registro (/check-in)**: pulsar «Iniciar registro». Mostrar el cronómetro de 90 s, el dial sin teclado, la ficha «cómo medir en este perfil» y «por qué importa». Saltar una medida con «no medí hoy» (*decir:* «lo no medido es sin dato, nunca cero»). Guardar: resultado con estado y siguiente paso.
3. **Entorno (/environment)**: señalar las etiquetas «Real» con fuente y fecha (RadLab 2011, EDA 2014, DONKI mayo 2024, GOES de hoy) y las «Simulado» de las anomalías inyectadas. Cambiar el perfil de misión (p. ej. a Superficie lunar) y mostrar cómo cambia la presión parcial de CO2 (*decir:* «el mismo ppm es distinta presión parcial a 424 mmHg»). Volver al perfil anterior.
4. **Alertas (/alerts)**: la alerta de entorno «CO2 + cefalea» marcada «compartida con la tripulación», sin datos personales; la de tormenta con su origen DONKI/GOES; la roja de capa A con «Escalada · enviado automáticamente al oficial médico» y el detalle de qué salió exactamente. Cambiar a «Ver como: Oficial Médico»: solo ve el dato mínimo.
5. **Informes (/reports)**: «Encolar informe de hoy»; mostrar el trayecto nave → Tierra con el retardo (en demo acortado a 1 min; en real el del perfil). Cambiar a «Cirujano de Vuelo» y responder; volver y mostrar la respuesta en el hilo.
6. **Dispositivo (/device)** (si hay tiempo): el reloj Galaxy Watch4 por smart-monitor; en demo, el simulador de pulso hace latir el cuerpo 3D. *Decir:* «en modo real el simulador está bloqueado: nada se inventa».
7. **Cierre**: «Ver datos reales» → modo real vacío: «Aún no hay registro hoy», sin ninguna afirmación de normalidad. *Decir:* «lo que no se midió no se muestra como medido».

Plan B si cae la red: la app funciona sin enlace tras la primera carga (service worker); si la API no responde, mostrar la pantalla de error con «Reintentar» y explicar la copia local.

---

## 4. Preguntas probables del jurado y respuesta

| Pregunta | Respuesta corta |
| --- | --- |
| ¿Usan datos reales de astronautas? | No existen telemetrías biomédicas públicas de astronautas en vivo. La fisiología real es la que ingresa cada tripulante o mide su reloj; en demo es simulada y rotulada. El entorno sí es real: NASA OSDR (RadLab, EDA), DONKI y NOAA GOES. |
| ¿Por qué NEWS2 si es terrestre? | Porque es el estándar clínico público mejor documentado para signos vitales. Usamos sus tramos por parámetro; los cortes de agregación son nuestros y más conservadores, y lo declaramos como regla de prototipo pendiente de un cirujano de vuelo. |
| ¿Qué pasa si el cuerpo cambia en vuelo y todo parece anómalo? | Días 1–14 la capa personal solo informa; la línea base pasa de tierra a vuelo con una ventana que excluye los días con alerta. Los límites de seguridad (capa A) siguen activos desde el día 1. |
| ¿Cómo evitan falsas alarmas? | Dos días seguidos para la desviación personal, CUSUM con reinicio para la deriva y piso mínimo de dispersión. En simulación: <0,001 por tripulante y semana, con la advertencia de que el ruido simulado es gaussiano. |
| ¿Privacidad? | Verde y ámbar nunca salen del dispositivo. Solo un rojo de seguridad escala al oficial médico con el dato mínimo; el tripulante ve qué salió y puede añadir contexto; cada acceso ajeno queda auditado. |
| ¿Funciona sin conexión? | Sí: service worker, copia local del catálogo y cola de registros y escalamientos que se sincroniza al volver el enlace. Solo la primera apertura necesita red. |
| ¿Qué datos NASA son «integrales» y no decorativos? | El CO2 de EDA entra en la regla cefalea + CO2 (convertido con la presión del perfil); los SEP de DONKI y el flujo GOES encienden el modo tormenta; RadLab da la dosis ambiental del contexto. Cada alerta de entorno lleva fuente y fecha real. |
| ¿Validación? | 500 + 500 misiones simuladas con semilla fija; el motor TypeScript reproduce el caso de referencia del motor Python alerta por alerta (test de paridad). Es validación de método, no clínica. |
| ¿Y en la Tierra? | Mismo patrón para bases antárticas, barcos, minería remota y salud rural: autoevaluación con línea base propia cuando el médico está lejos. |
| ¿Qué falta? | Revisión por un cirujano de vuelo, PVT-B, dosimetría personal, masa corporal en capa C, cifrado y autenticación de la tripulación. Está en la hoja de ruta y en los límites declarados. |
| ¿Usaron IA? | Sí: asistentes de IA (Claude Code y Codex) para investigar fuentes, redactar y revisar documentación y código. Las decisiones, los indicadores y las reglas son del equipo; no hay imágenes ni vídeo generados. |
