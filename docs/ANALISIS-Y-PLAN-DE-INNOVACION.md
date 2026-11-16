# VIGÍA: análisis del sistema y plan de innovación

Fecha: 15 de noviembre de 2026. Base revisada: `main`, commit `817c78e2f1937ba32a1e37f7db31f10106a93010`, después de ejecutar `git pull --ff-only origin main`.

## 1. Recomendación

Evolucionar VIGÍA hacia **autonomía de salud verificable con datos imperfectos**: detectar una desviación, indicar qué evidencia falta, acompañar una acción previamente revisada y comprobar la evolución. Mantener su identidad: apoyo a la decisión personal, contexto ambiental, privacidad, explicación y operación a bordo sin conexión.

El siguiente salto de valor está en conectar tres capacidades: **seguimiento de episodios**, **calidad de mediciones** y **fatiga/vigilancia cognitiva**. El banco de validación debe crecer junto con ellas. Agregar pantallas o un chatbot genérico aportaría menos diferenciación que demostrar que esa integración mejora una decisión concreta.

Esto es una propuesta de producto e investigación, no una afirmación de novedad mundial ni de eficacia clínica. La búsqueda realizada permite identificar antecedentes y oportunidades; no equivale a una revisión sistemática ni de patentes. Tampoco permite atribuir el tercer lugar a una carencia concreta: faltan los comentarios del jurado.

## 2. Alcance y evidencia

Se revisaron el índice de contexto, las convenciones, la arquitectura, los módulos, el código de los flujos principales, el informe técnico, el informe final, el backlog de auditoría y los KPI guardados. Se contrastaron las propuestas con fuentes primarias de NASA, ESA, investigación de PVT y HL7.

Las skills disponibles en esta sesión son `imagegen`, `openai-docs`, `skill-creator` y `skill-installer`. Ninguna se ajusta directamente a una auditoría de producto y un plan de innovación aeroespacial; no se aplicaron procedimientos ajenos al encargo. Se siguió `AGENTS.md` como fuente de instrucciones del repositorio.

Comprobaciones ejecutadas sobre el código actualizado:

| Comprobación | Resultado |
| --- | --- |
| Motor y lógica de la app, `node --experimental-strip-types --test packages/engine/*.test.ts apps/web/lib/*.test.ts` | 66 pruebas aprobadas. Node local 22.12 requiere la opción experimental. |
| Descubrimiento de `unittest` en los ocho módulos Python con pruebas | 212 pruebas ejecutadas: 210 aprobadas y 2 omitidas; sin fallos. |
| `tsc --noEmit --incremental false` en `apps/web` | Aprobado. |
| `contextgen.py --check` y `--lint` | Aprobados, sin salida de incidencias. |

Se usó `venv/Scripts/python.exe` (Python 3.14.1); `py` no encontró una instalación. Las dos pruebas omitidas son del puente del reloj porque `websockets` no está instalado en ese entorno. La suite API emitió avisos de conexiones SQLite sin cerrar. Conviene corregir esa higiene y comprobarla también con Python 3.12, que es la versión del CI. Node emitió avisos de ejecución experimental de TypeScript.

No se ejecutaron un build de producción, un recorrido nuevo en navegador, un ensayo prolongado sin red ni una prueba física con el Galaxy Watch4. Los informes previos del repositorio son antecedentes, no verificaciones repetidas en esta revisión. No se auditó el código del repositorio externo `smart-monitor`, ni el despliegue público. Las pruebas aprobadas verifican comportamiento de software; no prueban seguridad o eficacia médica.

## 3. Estado actual por módulo

| Módulo | Lo que ya aporta | Próximo valor o límite principal |
| --- | --- | --- |
| `apps/web` | Next.js/React, registro guiado, cuerpo 3D con respaldo 2D, tendencias personales, entorno, alertas, informes, reloj, español/inglés y modos real/demo separados. | Almacenamiento local más robusto; seguimiento temporal de episodios; informes creados sin red; pruebas de flujos completos. |
| `apps/api` | FastAPI, SQLite local, migraciones, lecturas y síntomas, auditoría, consentimiento, escalamientos, cola de informes y puente con el reloj. Verifica integridad del gold. | Identidad autenticada, permisos de médico de tierra, transporte verificable, respaldo/restauración y granularidad temporal por medición. |
| `packages/engine` | Motor puro A/B/C: tramos por parámetro de NEWS2 con agregación propia, desviación con mediana/MAD, CUSUM, adaptación de línea base y reglas de entorno. | Evaluación de señales sutiles, calidad explícita de entrada, seguimiento y decisiones de medición. Las reglas necesitan revisión clínica externa. |
| `packages/schemas` | Contratos, cinco perfiles de misión, diez fichas y vocabulario compartido. | Contratos versionados para calidad, episodios, tareas y evidencia; eliminar duplicaciones de configuración. |
| `packages/i18n` | Español como fuente principal, inglés secundario y validación de claves/variables. | Mantener la explicación de incertidumbre, tareas y consentimiento comprensible en ambos idiomas. |
| `pipelines/datalake` | Ingesta GOES/DONKI/RadLab/EDA, raw inmutable, curated, trazabilidad y validación antes de escribir. | Vigencia y cobertura explícitas; separar fuentes históricas de sensores de la misión; bloqueo del manifiesto si hay varios escritores. |
| `pipelines/reanclaje` | Rejilla, doble tiempo, agregados, panel gold, simulación reproducible y barrido de parámetros. | Escenarios con huecos, ruido correlacionado y sensores defectuosos; catálogo de procedencia que distinga observación histórica y observación actual. |
| `tools/contextgen` | Contexto generado, controles de consistencia y adaptadores para asistentes. | Mantenerlo como infraestructura del equipo; no convertirlo en dependencia del producto. |
| `tools/modelo-anatomico` | Reproducción y atribución del modelo BodyParts3D. | La visualización es una fortaleza existente; aumentar detalle anatómico tiene menor prioridad que cerrar flujos de decisión. |
| `tools/presentacion` | Generación de diapositivas y capturas. | Reutilizarlo cuando existan resultados nuevos; actualizar afirmaciones y evidencias junto con el producto. |
| `tools/sincro-smart` | Avisos de cambios que afectan al repositorio del reloj. | Formalizar versiones del contrato de telemetría y pruebas de compatibilidad entre repositorios. |
| `tools/red-local` | Preparación de la red local del reloj en Windows. | Facilitar instalación reproducible y diagnóstico; depende de configuración del equipo y permisos del sistema. |
| `tools/validar-referencias` | Comprobación de DOI, títulos y fragmentos de evidencia. | Añadir revisión humana de aplicabilidad: que una referencia exista no valida automáticamente el umbral o la regla derivada. |

El sistema es un **prototipo funcional integrado** con una base considerable. Las pruebas y la documentación permiten extenderlo sin empezar de nuevo. Todavía no hay evidencia suficiente para presentarlo como sistema clínico validado o listo para una misión.

## 4. Brechas que afectan el siguiente paso

### 4.1 La validación favorece anomalías conocidas

En [kpi.json](../packages/engine/fixtures/kpi.json), la deriva inyectada se detecta en el 99,8 % de las misiones, con mediana de ocho días. A media intensidad, la detección baja al 17,8 %, con mediana de nueve días entre los casos detectados. El simulador y los detectores proceden del mismo equipo, y una segunda semilla no constituye una validación externa.

La prioridad científica es medir sensibilidad por intensidad, tiempo de anticipación, falsas alarmas e incertidumbre bajo escenarios nuevos. Una comparación con un único umbral de FC de 91 lpm resulta limitada: hacen falta comparadores más exigentes, ablaciones A/B/C y conjuntos de evaluación separados del ajuste.

### 4.2 Ya hay acciones registradas, pero falta seguimiento estructurado

`apps/web/lib/cola.ts` y `components/reports/reports-view.tsx` ya guardan acción sugerida, acción realizada, nota y opciones como «no pude» o «remedí». No se propone reconstruir esa función. Falta convertirla en un episodio con tareas, responsable, plazo, lecturas anteriores/posteriores y resolución verificable.

Hoy las series y el motor son principalmente diarios. Un episodio requiere preservar eventos intradía: una medición alterada por la mañana no debe perderse porque una posterior sea normal.

### 4.3 Calidad y contexto temporal no acompañan a toda lectura

Hay medidas ausentes como `null`, procedencia, método e identificación del reloj, y se reinicia la línea base de FC cuando cambia el instrumento. Son buenos cimientos. Falta un contrato uniforme para antigüedad, calidad, cobertura, error conocido, sitio de medición y comparabilidad entre perfiles.

En `apps/api/rutas_dashboard.py`, `_lecturas_reales` conserva el último valor de cada indicador del día y una única `t_real` de la última lectura. Esto puede reunir signos de horas distintas bajo una sola marca. Es un riesgo de interpretación para una puntuación agregada y para la hora atribuida a un aviso; debe probarse y resolverse antes de usar episodios intradía.

Una medida poco fiable debe provocar confirmación o abstención explicada, conservando las salvaguardas de seguridad definidas con especialistas. No se deben descartar extremos silenciosamente.

### 4.4 Real, histórico y actual son dimensiones distintas

VIGÍA declara el reanclaje y muestra fuente/fecha: es una fortaleza. Sin embargo, EDA histórico de otra misión no es un sensor de la cabina actual, y GOES no mide la dosis personal de un astronauta camino a Marte.

Añadir por separado `naturaleza`, `uso` (operativo/escenario/referencia), `vigencia`, ubicación y cobertura. El motor operativo solo debería usar contexto aplicable a la misión actual; los históricos siguen siendo valiosos para simulación e investigación. Conservar siempre `t_real` y `t_mision`.

En radiación, distinguir dosis absorbida, equivalente y efectiva; no presentar una conversión numérica de µGy a µSv como estimación personal validada. El panel ya marca resultados orientativos, pero aún calcula un porcentaje frente a un límite de carrera. Esa comparación y la integración con cobertura parcial merecen revisión radiológica antes de ampliar recomendaciones.

### 4.5 Sin conexión e informes todavía no cierran el mismo circuito

La app guarda carcasa y catálogos, ejecuta el motor y sincroniza registros/avisos al recuperar la API. La creación de informes llama directamente a la API y devuelve fallo si no hay enlace; no tiene una bandeja local persistente equivalente. Está reconocido en el backlog.

La cola actual calcula la entrega por tiempo; no demuestra recepción por un sistema independiente en Tierra. Una respuesta tampoco tiene modelado un transporte completo de regreso. La evolución debe distinguir guardado local, recibido a bordo, transmitido, confirmado por destino y respondido, con interrupciones y latencias en ambos sentidos.

### 4.6 La privacidad de producto necesita soporte de seguridad

La intención de privacidad y la minimización de escalamientos están implementadas. La identidad mediante `X-Tripulante` es un atajo explícito, y la API permite responder informes a cualquier tripulante conocido. Se requieren sesión autenticada y permisos efectivos para pruebas con datos personales externos al equipo.

`apps/web/lib/storage.ts` separa real/demo, pero el prefijo no incorpora misión y tripulante. Revisar aislamiento al cambiar de persona en un dispositivo compartido. «Compartir» un ámbar marca almacenamiento local; aún falta un envío voluntario verificable con consentimiento, destinatario y acuse.

También hace falta definir el reintento de escalamientos omitidos por falta de destinatario/consentimiento: hoy quedan marcados y no se reintentan. La política futura debe evitar tanto perder un aviso que aún requiere atención como enviar retroactivamente algo que ya no corresponde.

### 4.7 Hay deuda de coherencia fácil de resolver

`docs/ARQUITECTURA.md` todavía describe Vite y módulos futuros que ya existen; el código usa Next.js y API local. `pipelines/reanclaje/panel.py` mantiene tres grupos de presión propios, frente a los cinco perfiles del contrato compartido. El CI ejecuta pruebas TS/Python y contexto, pero no contiene pasos de tipado/build de la web. Corregir estas diferencias antes de multiplicar módulos.

La corrección metrológica de capa A, masa corporal en C y cambios de perfil ya están declarados como pendientes. Antes de implementarlos, revisar su fundamento con especialistas; no trasladar automáticamente al código toda propuesta del informe ni modificar límites para mejorar los KPI.

## 5. Posición frente a antecedentes internacionales

| Antecedente verificado | Implicación para VIGÍA |
| --- | --- |
| NASA AMOS ensayó apoyo autónomo y formación para ecografía renal/vesical en ISS. [NASA NTRS](https://ntrs.nasa.gov/citations/20220014327). | Una guía paso a paso por sí sola tiene antecedentes. Diferenciarse por integración con medidas, calidad, seguimiento y resultados. |
| NASA y Google publicaron una prueba de concepto CMO-DA para apoyo a decisiones médicas. [Publicación de Google Cloud, participante del proyecto](https://cloud.google.com/blog/topics/public-sector/how-google-and-nasa-are-testing-ai-for-medical-care-in-space). | Un asistente médico con IA tampoco basta como afirmación de innovación. Una interfaz conversacional podría añadirse después si demuestra utilidad. |
| La brecha Medical-501 de NASA pide modelos integrados de sistema médico, interacción con vehículo y pruebas de funcionamiento coherente. [Human Research Roadmap](https://humanresearchroadmap.nasa.gov/gaps/gap.aspx?i=714). | La integración persona–hábitat–operación y su evaluación son una dirección pertinente. Esto no constituye aval ni cumplimiento de NASA. |
| NASA documenta Reaction Self Test y estudios de sueño/atención. [NASA, Sleep on Station](https://www.nasa.gov/humans-in-space/science-in-space-week-of-sept-15-2023-sleep-on-station/). | La fatiga permite agregar una señal funcional objetiva. El test no sería una invención de VIGÍA. |
| ESA ensaya E4D como contramedida al desacondicionamiento. [ESA](https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/New_European_exercise_device_begins_testing_with_first_rope-pulling_workout_in_space). | Ejercicio y recuperación son una extensión pertinente, especialmente si aparece un socio con datos adecuados. No hay una integración disponible demostrada en este repo. |

La oportunidad propuesta es **combinar decisiones explicables, fiabilidad de la evidencia y seguimiento sin enlace en un sistema pequeño y reproducible**, y medir su utilidad. Esa diferenciación es una hipótesis que requiere comparación y pilotos.

## 6. Cartera de módulos priorizada

Prioridades: P0 = base necesaria; P1 = siguiente entrega; P2 = después de evaluar P1; P3 = condicionado a datos y colaboradores. Esfuerzos orientativos en semanas-persona de desarrollo; no incluyen espera por convenios, revisión clínica o aprobación de estudios. No son compromisos de calendario y no deben sumarse como si todo fuera independiente.

| Propuesta | Valor específico | Prioridad | Esfuerzo inicial |
| --- | --- | --- | --- |
| Confianza operativa y datos | Identidad, aislamiento, medición temporalmente íntegra, almacenamiento durable, informes sin red. | P0 | 3–5 |
| Seguimiento de episodios y protocolos | Conectar aviso → acción revisada → nueva medición → evolución y cierre. | P1 | 4–6 |
| Calidad y suficiencia de evidencia | Explicar qué se sabe, qué falta y cuándo confirmar una lectura. | P1, junto con episodios | 3–5 |
| Fatiga y vigilancia cognitiva | Relacionar sueño y contexto con desempeño de atención medido. | P1, después del núcleo | 3–5 |
| Banco de validación adversa | Medir fallos, límites, carga y regresiones con escenarios independientes. | P0 y continuo | 2–4 inicialmente |
| Hábitat y exposiciones compartidas | Detectar eventos ambientales comunes con contexto espacial/temporal y privacidad. | P2 | 4–6 |
| Selección de la siguiente medición | Reducir incertidumbre con la menor carga posible. | P2, tras validar calidad | 3–5 |
| Intercambio clínico y telemedicina | Exportación verificable para colaboración con otros sistemas. | P2 | 2–4 para un exportador limitado |
| Ejercicio y recuperación | Relacionar cumplimiento, esfuerzo y evolución funcional. | P3 | 4–6, sujeto a datos |

### 6.1 Seguimiento de episodios y protocolos

**Usuario y decisión:** tripulante/oficial médico; qué está pendiente, qué se hizo y si es necesario volver a evaluar.

MVP: tres recorridos revisados por profesionales: medición sospechosa que requiere confirmación, desviación persistente de sueño/FC y evento ambiental de CO2 con síntomas. Cada episodio enlaza alertas y observaciones; incluye responsable, tareas, plazo configurado por protocolo, impedimentos y estado (`abierto`, `en_seguimiento`, `requiere_revision`, `cerrado`). El cierre requiere evidencia o justificación explícita. Permitir revisión/reapertura y acciones manuales auditadas.

Los protocolos llevan versión, fuente, ámbito y autor/revisor. La primera entrega acompaña medición y seguimiento; no genera prescripciones ni dosis. Una mejoría posterior se muestra como evolución temporal, no como causalidad demostrada de la acción.

**Criterio de aceptación:** completar y recuperar tras reinicio un episodio sin API; no duplicar tareas al sincronizar; conservar lecturas previas/posteriores; mostrar la versión del protocolo; escalar o pedir revisión según reglas revisadas. Nunca declarar resolución solo porque expiró una alerta.

### 6.2 Calidad y suficiencia de evidencia

MVP: observaciones con identificador propio, hora de medición y recepción, unidad, instrumento/sitio, perfil vigente, origen, cobertura y banderas explicadas. Estados iniciales: `utilizable`, `requiere_confirmacion`, `no_comparable`, `sin_datos`. No inventar porcentajes de confianza.

Ejemplo: una SpO2 aislada del reloj y una medida confirmatoria de otro instrumento no deben mezclarse como equivalentes sin explicar método, tiempo y reglas de uso. Conservar el dato original; anotar correcciones y decisiones derivadas.

**Criterio de aceptación:** escenarios de dato antiguo, cambio de sensor, reloj desajustado, signo extremo y perfil cambiado producen la explicación y acción de confirmación esperadas; los mecanismos de calidad no suprimen silenciosamente alertas de seguridad.

### 6.3 Fatiga y vigilancia cognitiva

MVP: tarea breve de reacción, sesiones con condiciones registradas, línea base individual, distribución de tiempos, anticipaciones y lapsos según protocolo elegido, más sueño/turno y contexto ambiental aplicable. Mantener los tres minutos fuera del registro diario de 90 segundos.

Hay investigación primaria de PVT-B de tres minutos: [Basner, Mollicone y Dinges, 2011](https://pubmed.ncbi.nlm.nih.gov/22025811/). NASA también describe un Reaction Self Test de cinco minutos. No equiparar esas implementaciones ni copiar umbrales de una a otra sin comprobar protocolo, duración y método.

Registrar hardware, entrada táctil/teclado, interrupciones y pestaña en segundo plano. Usar reloj monotónico y comprobar latencia/variabilidad del dispositivo. Una implementación web nueva no hereda la validación del test publicado.

**Criterio de aceptación:** sesión interrumpida queda inválida; resultados reproducibles con entradas controladas; comparabilidad entre dispositivos caracterizada; piloto de usabilidad y fiabilidad. La salida solicita revisión de tareas/descanso según protocolo, sin certificar aptitud para EVA u otras operaciones críticas.

### 6.4 Hábitat y exposiciones compartidas

Extender la regla existente CO2 + cefalea hacia eventos con ubicación, presión medida, vigencia, cobertura y acciones del hábitat. Correlacionar señales compartidas solo con consentimiento y controles de acceso. Un pico diario común no demuestra coincidencia temporal ni causa ambiental.

Primero usar telemetría local de cabina o una reproducción explícita de escenario; mantener EDA histórico como referencia. En una tripulación pequeña, un agregado puede identificar personas: no prometer anonimato. Mostrar al resto solo lo necesario para la acción colectiva.

**Criterio de aceptación:** un evento común no genera avisos redundantes innecesarios; un síntoma privado persiste como pendiente si el contexto ambiental no basta para explicarlo; un sensor caducado no justifica una conclusión operacional.

### 6.5 Selección de la siguiente medición

Proponer una única comprobación útil según episodio, evidencia disponible, instrumento, tiempo y protocolo. Primera versión determinista: por ejemplo, confirmar una lectura aislada con el método previsto o completar una medición faltante.

Una etapa posterior puede estudiar selección por reducción esperada de incertidumbre. Eso requiere un modelo calibrado y comparadores; no debe llamarse «información óptima» sin demostrarlo. Comparar contra un checklist fijo: número de mediciones, tiempo hasta decisión y eventos omitidos.

### 6.6 Intercambio clínico y telemedicina

Primero exportar un paquete de episodio con observaciones originales, procedencia, reglas/protocolos, acciones, consentimiento y comprobación de integridad. Usar confirmación real de recepción y política de retransmisión.

Evaluar con un colaborador un perfil FHIR acotado, por ejemplo `Observation`, `Device`, `Provenance` y `Consent`; escoger y fijar versión antes de implementar. [HL7 FHIR R4, Provenance](https://hl7.org/fhir/R4/provenance-definitions.html). Exportar JSON con esos nombres no basta para afirmar conformidad, interoperabilidad o certificación. No hace falta añadir una plataforma FHIR completa al MVP.

### 6.7 Ejercicio y recuperación

Si hay fisiología del ejercicio y colaboración especializada, agregar sesión, carga prescrita por un profesional, ejecución, esfuerzo percibido y recuperación con instrumentos adecuados. Conectar al seguimiento de episodios y a perfiles de gravedad.

El cambio de masa corporal no demuestra pérdida muscular/ósea por sí solo. No convertir los signos actuales en un predictor de atrofia ni prometer optimización del entrenamiento sin datos. Esta línea puede superar en prioridad a hábitat si aparece un socio que aporte mediciones y evaluación.

## 7. Arquitectura de ampliación

Evitar otro backend o un servicio por propuesta. Mantener el despliegue local y separar reglas puras de persistencia/interfaz.

| Lugar | Responsabilidad propuesta |
| --- | --- |
| `packages/schemas` | Versionar contratos de observación, calidad, episodio, protocolo, tarea y evento de sincronización. |
| `packages/engine` | Consumir calidad/contexto ya estructurados y producir detecciones explicables; conservar capa A y compatibilidad. |
| `packages/seguimiento` — nuevo si el alcance lo justifica | Transiciones puras de episodios/tareas y selección de protocolos, sin IO. |
| `packages/calidad` — nuevo si se comparte lógica suficiente | Reglas puras de vigencia, comparabilidad y suficiencia. |
| `apps/api` | Persistencia SQLite, identidad/permisos, auditoría, transporte y exportación. |
| `apps/web` | Episodios, tareas y prueba cognitiva; almacenamiento local durable y bandeja de salida transaccional. |
| `tools/validacion` — nuevo | Reproducción del motor real, escenarios adversos, métricas y comparación de versiones. |
| `pipelines/biometria` — condicionado a datos reales | Ingesta reproducible de datos autorizados; raw inmutable, curated/gold y manifiestos. |

`apps` y `pipelines` intercambian datos por contratos; no se importan entre sí. Los módulos del mismo contenedor no se importan entre sí: las reglas compartidas suben a `packages`. Ningún paquete puro lee archivos o almacenes.

Toda observación conserva `t_real` UTC y su procedencia; cada episodio referencia sus observaciones y las versiones de reglas utilizadas. Migrar de almacenamiento local actual a IndexedDB u otra solución durable mediante la interfaz existente, con pruebas de migración y recuperación. Diseñar las claves por misión/tripulante y modo desde el inicio.

Cada módulo nuevo necesita dependencias declaradas, pruebas útiles, `MODULE.md` manual completo y regeneración de contexto. Textos nuevos primero en `packages/i18n/locales/es.json`, con inglés cuando se pueda. No agregar dependencias al datalake, i18n o contextgen sin acuerdo.

## 8. Hoja de ruta de referencia

Supuesto de planificación: dos desarrolladores con dedicación sustancial y un profesional de salud que revise de forma recurrente. Si no existe esa revisión, avanzar en infraestructura y validación técnica; mantener protocolos clínicos como borradores. El calendario debe recalcularse con capacidad y colaboradores reales.

| Etapa | Ventana orientativa | Entrega y puerta de salida |
| --- | --- | --- |
| 0. Acordar evidencia | Semana 1 | Elegir tres casos de uso, inventario de afirmaciones y criterios; fijar benchmark previo y preguntas de revisión clínica. |
| 1. Consolidar | Semanas 2–3 | Identidad/permisos, aislamiento, observaciones con hora propia, informes persistentes sin red, perfiles unificados y tipado/build en CI. Ensayo de reinicio y recuperación. |
| 2. Episodios + calidad | Semanas 4–6 | Tres recorridos completos revisados, nueva medición y estado de evidencia. Demostración con API apagada y sincronización posterior sin duplicados. |
| 3. Fatiga | Semanas 7–9 | Tarea de reacción instrumentada, condiciones de sesión y tendencias. Caracterización técnica y piloto de usabilidad. |
| 4. Evaluación y demostración | Semanas 10–12 | Benchmark separado, ensayo con usuarios y revisión de casos por profesionales; informe reproducible con resultados favorables y negativos. |

El banco de validación se construye desde la primera etapa. Hábitat ampliado, selección adaptativa, intercambio FHIR y ejercicio quedan para una segunda entrega guiada por resultados. Las 12 semanas son una hipótesis para un alcance acotado, no tiempo estimado de validación clínica ni de preparación para vuelo.

## 9. Cómo demostrar valor

### Validación técnica y científica

- Congelar reglas y conjuntos de evaluación antes de comparar; reservar escenarios/semillas fuera del ajuste y encargar casos a alguien que no escribió el generador.
- Cubrir anomalías de intensidad variable, ruido no gaussiano y correlacionado, artefactos, huecos, sensores con sesgo, cambio de perfil, misiones largas y poblaciones simuladas heterogéneas.
- Comparar A sola, A+B, A+C y A+B+C; añadir comparador personal sencillo y comparar el valor incremental del contexto y la calidad. No ajustar para recuperar el 99,8 %.
- Informar detección por tipo/intensidad, retraso con su definición, falsas alarmas por persona-tiempo, precisión cuando corresponda, intervalos de incertidumbre y abstenciones. No ocultar los casos débiles dentro de un promedio.
- Usar el motor TypeScript de producción en el benchmark. Conservar paridad con Python, pero no usar esa paridad como sustituto de validación independiente.

### Validación operativa

- Probar pérdida de API y de enlace a Tierra por separado; cierre del navegador, reinicio del servidor, fallo de batería, almacenamiento lleno, duplicados, desfase de relojes y actualización de versión.
- Verificar persistencia de registros y episodios, idempotencia, permisos, auditoría y acuses. Un informe solo llega si existe confirmación del destino, no porque pasó un contador.
- Medir duración real del registro, errores de interpretación, tareas completadas y carga añadida por nuevas mediciones. Preservar el objetivo de registro diario inferior a 90 segundos.
- Para el piloto, un grupo pequeño puede descubrir problemas de usabilidad; no estima sensibilidad clínica. Un estudio posterior necesita tamaño muestral justificado, consentimiento y revisión ética/institucional cuando corresponda.

NASA usa análogos como HERA para estudiar comportamiento, autonomía, factores humanos y capacidades médicas: [descripción de HERA](https://www.nasa.gov/hera-about-hera/). Es un referente de diseño experimental, no una colaboración existente ni una promesa de acceso.

### Tres demostraciones útiles

1. **La lectura era dudosa:** llega un valor anómalo, VIGÍA muestra su calidad y preserva la advertencia, guía la confirmación y registra el resultado sin borrar el original.
2. **El descanso no se refleja en la atención:** una tendencia personal activa una tarea revisada; el usuario completa la sesión cognitiva y un seguimiento, con condiciones y límites visibles.
3. **Se pierde el enlace:** un episodio y su informe se crean sin API, sobreviven al reinicio y se sincronizan una vez; Tierra recibe evidencia y devuelve una respuesta con estados verificables.

El resultado para presentar es una decisión mejor fundamentada, menos carga o mayor robustez medidos frente a una versión anterior. No basta con que el recorrido se vea convincente.

## 10. Qué posponer

- Chatbot médico general: hay antecedentes fuertes y puede añadir respuestas difíciles de verificar. Si se incorpora lenguaje natural, empezar por búsqueda local de protocolos aprobados, con fuente y versión.
- Diagnóstico por rostro/voz o supuesta detección automática de depresión: el repositorio no tiene datos ni validación para sostenerlo.
- Gemelo digital fisiológico predictivo: el cuerpo 3D actual es una visualización; el término requiere un modelo individual validado que hoy no existe.
- Predicción personal de daño por radiación desde GOES: confundiría un indicador ambiental remoto con exposición individual.
- Omics, microbioma, ecografía automática o realidad aumentada como próxima entrega: posibles líneas con socios, pero alta dependencia de datos, instrumentos y evaluación.
- Gamificación intensa, más anatomía y muchas integraciones de wearables antes de cerrar persistencia, permisos y seguimiento.

## 11. Primer backlog ejecutable

| Orden | Trabajo | Evidencia para darlo por terminado |
| --- | --- | --- |
| 1 | Actualizar arquitectura, inventario de capacidades y límites. | Documentación coherente con Next.js, API local y estado real de informes/compartición. |
| 2 | Añadir tipado/build de web al CI y revisar avisos SQLite. | CI repetible; conexiones cerradas; versiones de entorno documentadas. |
| 3 | Diseñar observación versionada con hora por indicador, perfil y calidad. | Contratos y casos de signos de horas distintas, extremos y cambios de instrumento. |
| 4 | Autenticar usuarios y definir permisos efectivos de médico de tierra. | Una identidad no puede suplantar ni responder por otra; pruebas de acceso y consentimiento. |
| 5 | Aislar almacenes y persistir informes/eventos pendientes. | Cambio de tripulante seguro y recuperación tras reinicio sin duplicados. |
| 6 | Congelar un benchmark más exigente. | Resultados iniciales por intensidad, ablaciones y errores de sensor, anteriores a cambios del detector. |
| 7 | Revisar tres protocolos y modelar episodios/tareas. | Revisión profesional, fuentes, versiones, estados y criterios explícitos de cierre. |
| 8 | Entregar un episodio completo sin conexión. | Detección, confirmación, acción registrada, nueva lectura y sincronización verificables. |
| 9 | Prototipar y caracterizar PVT en dispositivos objetivo. | Sesiones inválidas detectadas y limitaciones temporales cuantificadas. |
| 10 | Evaluar con usuarios y decidir la segunda entrega. | Informe de errores, tiempos, carga y mejoras medibles; elección basada en resultados. |

El primer hito de producto recomendado es **un episodio completo con calidad de datos y recuperación sin red**. Después, agregar vigilancia cognitiva para ampliar lo que VIGÍA puede observar sin perder su propósito original.
