# Evaluador independiente (Codex gpt-6.1-sol, solo lectura), iteración 1 — 2026-11-15 02:30 (UTC-3)

Material evaluado: RUBRICA.md, readme.md, ENVIO.md (borrador), resumen del Tester it. 1, correcciones de FUENTES.md y 7 capturas. Sin acceso al código ni a los enlaces.

# VIGÍA: **62/100**

La puntuación reconoce un prototipo pertinente y una propuesta técnica sólida, pero **la elegibilidad global no está acreditada**: faltan la demo pública y el cumplimiento completo del inglés. Las correcciones locales declaradas no se consideran desplegadas; el tester indica que el sitio público conserva la versión anterior.

Evalúo exclusivamente el material adjunto, sin abrir enlaces ni inspeccionar código. «No acreditado» significa que falta evidencia, no que la función necesariamente esté ausente. Aplico las definiciones oficiales tal como fueron suministradas.

**1. Puertas de elegibilidad**

| Puerta | Estado | Razón |
|---|---|---|
| E1 | **UNKNOWN** | El reto corresponde. Faltan nombres, evento, pestaña Members y confirmación del máximo de seis integrantes. |
| E2 | **FAIL** | El campo obligatorio **Link to Project Demo** contiene un marcador pendiente. El documento sigue siendo un borrador. |
| E3 | **UNKNOWN** | No se aporta vídeo ni presentación para comprobar duración o número de diapositivas. |
| E4 | **FAIL** | El README enlaza expresamente un informe en español. Las capturas en inglés contienen Acerca de íntegramente en español, fichas, fuentes y recordatorios sin traducir. Las correcciones locales no acreditan el cumplimiento público. |
| E5 | **FAIL** | No existe un enlace de demo aportado que pueda cumplir acceso público. El tester sí accedió al sitio, pero falta acreditar el conjunto de enlaces en ventana privada. FortiGuard es una recomendación, no una obligación. |
| E6 | **PASS** | El campo NASA Data describe recursos concretos de OSDR, DONKI y HRP y su función. La auditoría científica confirma la ingesta de los conjuntos indicados. |
| E7 | **UNKNOWN** | Se reconoce la asistencia de IA en texto y se declara ausencia de multimedia generada. No se aportan los metadatos exigidos por esta puerta para el código generado. |
| E8 | **UNKNOWN** | Hay referencias y atribuciones extensas, incluido BodyParts3D. No puede acreditarse la exhaustividad respecto de todos los activos y de la demo todavía ausente. |
| E9 | **PASS** | Existe declaración expresa de ausencia de menores; las imágenes aportadas no la contradicen. |
| E10 | **UNKNOWN** | No hay constancia de las casillas aceptadas ni de *Submit for Judging*. La lista de comprobación está sin marcar. |

Los fallos de elegibilidad no restan puntos adicionales: condicionan la admisión al juicio global.

**2. Puntuación por subcriterio**

Los **4 puntos** reconocen cumplimiento documentado del observable; no certifican preparación clínica ni originalidad mundial. Las afirmaciones públicas sirven como evidencia descriptiva, pero no sustituyen resultados de pruebas cuando estos son lo evaluado.

| Impact | Puntos | Evidencia y fundamento |
|---|---:|---|
| I1. Problema cuantificado y fuentes | **4** | Retardo de hasta 22 minutos, autonomía médica y cinco peligros HRP identificados. La auditoría respalda el retardo y se citan recursos primarios. |
| I2. Tres beneficiarios y decisiones | **2** | Selector de roles y escalamiento al oficial médico documentados. Falta demostrar una decisión distinta y operativa del cirujano de vuelo. |
| I3. Efecto medido y límites | **2** | KPI, semilla, comandos y limitaciones explícitos. No se adjuntan resultados de ejecución que permitan contrastar las cifras ni una medición completa del tiempo de registro. |
| I4. Entornos e impacto terrestre | **2** | Se describen perfiles y conversiones por presión. Los usos antárticos y rurales son aspiraciones: faltan casos concretos y demostración comparativa de perfiles. |
| I5. Reutilización | **2** | README inglés, instrucciones de arranque y atribución anatómica claros. No se aporta licencia del código propio ni un ejemplo visible del contrato de intercambio. |
| **Total Impact** | **12/20** | **3/5** |

| Creativity | Puntos | Evidencia y fundamento |
|---|---:|---|
| C1. Superar umbrales fijos | **4** | Línea base personal, desviación persistente, CUSUM y adaptación temporal descritos; el tester observa alertas CUSUM con la API actual. |
| C2. Entorno dentro del razonamiento | **2** | Reglas CO₂–cefalea y tormenta especificadas. Falta mostrar una alerta trazable a una medición real publicada; la captura muestra simulación y ausencia de datos publicados. |
| C3. Diseño operativo | **2** | Escalamiento mínimo probado y navegación pública sin conexión verificada. Los registros compartidos entre visitantes contradicen la privacidad; la cola con retardo no queda demostrada. |
| C4. Interfaz propia | **4** | Las capturas acreditan cuerpo anatómico 3D, controles guiados y una identidad propia, con atribución del modelo. |
| C5. Método de validación | **4** | Método concreto: anomalías inyectadas, controles, semilla, script y comparación con un umbral fijo. Se reconoce la creatividad del método, no eficacia clínica. |
| **Total Creativity** | **16/20** | **4/5** |

| Validity | Puntos | Evidencia y fundamento |
|---|---:|---|
| V1. Correspondencia científica | **2** | Numerosos umbrales están respaldados. No consta cierre de las discrepancias fichas–motor ni de otras afirmaciones señaladas por la auditoría. El README sí corrige la atribución de la agregación NEWS2 y declara hipotéticos los desplazamientos del simulador. |
| V2. Afirmaciones frente a comportamiento | **2** | El registro y escalamiento funcionan. Persisten contradicciones en la evidencia pública: interfaz prometida frente a desplegada y privacidad declarada frente a registros compartidos. |
| V3. Honestidad del modo real | **2** | La API actual distingue el estado vacío y las tarjetas muestran «—». Sin embargo, la captura vacía declara «Todo en orden», sistemas «OK» y cuerpo «Medido»; falta acreditar el estado público corregido y aislado. |
| V4. Calidad técnica | **2** | Hay pruebas funcionales y funcionamiento público sin conexión. No se aportan salidas de tests, lint y build; T09 y T11 documentan errores de consola e hidratación sin cierre declarado. |
| V5. Usabilidad | **2** | Registro funcional, controles principales amplios y aviso de prototipo. No se acredita el recorrido completo en menos de 90 segundos; hay contenido sin traducir, avisos que tapan acciones y defectos táctiles/de contraste. |
| **Total Validity** | **10/20** | **2,5/5** |

| Relevance | Puntos | Evidencia y fundamento |
|---|---:|---|
| R1. Reunir | **4** | Registro de los indicadores pedidos, unidades, síntomas e instrucciones de medición documentados. |
| R2. Evaluar | **2** | Cuerpo, sistemas, colores y gráficas presentes. El estado general verde sin mediciones invalida una interpretación básica de la evaluación. |
| R3. Actuar | **4** | El tester verifica resultado rojo y escalamiento al oficial médico. Hay siguientes pasos y recordatorios visibles. |
| R4. NASA integral | **2** | Fuentes concretas, ingesta confirmada y reglas vinculadas a NASA. La evidencia visual no demuestra el recorrido completo medición NASA → razonamiento → alerta con fuente y fecha. |
| R5. Consideraciones del reto | **4** | Perfiles, recordatorios, gráficas y fichas explicativas cubren las consideraciones principales. La gamificación es opcional. |
| **Total Relevance** | **16/20** | **4/5** |

| Presentation | Puntos | Evidencia y fundamento |
|---|---:|---|
| P1. Demo oficial | **0** | No se aporta la demo. No pueden comprobarse formato, equipo, integrantes, experiencia de uso ni explicación del papel de los datos abiertos. |
| P2. Síntesis inglesa | **2** | Problema y solución están bien explicados, pero el resumen extenso no ofrece una síntesis acreditada para captar la propuesta en 60 segundos. |
| P3. Primera pantalla | **2** | Se reconoce un monitor del astronauta y el botón de registro. Falta un enunciado inmediato de propósito; el flujo se infiere y seis secciones quedan ocultas en móvil según el tester. |
| P4. Coherencia | **2** | Las cifras principales coinciden entre README, formulario y Acerca de. La versión pública difiere de las capturas y de la interfaz descrita; T13 tampoco tiene cierre acreditado. |
| P5. Publicación y navegación | **2** | Sitio accesible según QA, README inglés e identidad sin marca NASA visible. Faltan inglés completo y comprobación del repositorio y materiales enlazados sin registro. |
| **Total Presentation** | **8/20** | **2/5** |

**Total: 12 + 16 + 10 + 16 + 8 = 62/100.**

No descuento por carecer de cámara, gamificación o datos clínicos reales de astronautas: el reto admite otras entradas y datos representativos. Tampoco descuento automáticamente las funciones pendientes que se declaran con claridad.

**3. Recuperación de los 38 puntos perdidos**

Orden orientativo por puntos recuperables por hora. Las horas son estimaciones, no mediciones; las tareas compartidas se realizan una sola vez. Cada recuperación exige evidencia del resultado.

| Orden | Subcriterio / ganancia | Trabajo concreto para recuperar lo perdido | Horas aprox. | Puntos/h |
|---:|---|---|---:|---:|
| 1 | P2 **+2** | Añadir una síntesis inglesa de unas 120–150 palabras: problema, usuario, solución, utilidad y límite principal; comprobar comprensión en 60 s. | 0,5 | 4 |
| 2 | I5 **+2** | Publicar licencia del código propio, condiciones y atribuciones de datos/modelo, y enlazar un contrato con ejemplo mínimo de intercambio. | 0,5 | 4 |
| 3 | P1 **+4** | Publicar ≤7 diapositivas inglesas o vídeo ≤30 s con todos los elementos exigidos, incluidos equipo e integrantes; verificar acceso privado. | 2 | 2 |
| 4 | P3 **+2** | Añadir propósito y secuencia reunir → evaluar → actuar al inicio; ofrecer acceso móvil evidente a todas las secciones. | 1 | 2 |
| 5 | I2 **+2** | Mostrar un recorrido por cada rol: decisión del astronauta, recepción/actuación del oficial médico y respuesta del cirujano mediante la cola. | 2 | 1 |
| 6 | I3 **+2** | Adjuntar salida reproducible de KPI y paridad, y cronometrar registros completos; indicar muestra, condiciones y límites. | 2 | 1 |
| 7 | I4 **+2** | Demostrar perfiles con una misma lectura y distinto contexto; desarrollar casos terrestres concretos con fuentes y decisiones beneficiadas. | 2 | 1 |
| 8 | V2 **+2** | Desplegar una versión que cumpla las afirmaciones públicas; corregir o acotar cualquier promesa que siga sin funcionar, especialmente privacidad. | 2 | 1 |
| 9 | R2 **+2** | Mostrar «Sin datos suficientes» en estado general y sistemas sin mediciones; reservar verde/OK para evaluaciones sustentadas. Aportar capturas antes y después de registrar. | 2 | 1 |
| 10 | P4 **+2** | Alinear app, API, capturas y textos con una misma versión; resolver o acreditar cierre de informes duplicados, futuros o contradictorios de T13. | 2 | 1 |
| 11 | C2 **+2** | Mostrar una alerta ambiental real con valor, unidad, fecha original, fuente y explicación de la regla activada. | 3 | 0,67 |
| 12 | R4 **+2** | Publicar los paneles NASA y demostrar el recorrido desde OSDR/DONKI hasta el resultado; distinguir ausencias, reanclaje e inyecciones. | 3 | 0,67 |
| 13 | V1 **+2** | Cerrar discrepancias fichas–motor y afirmaciones sin respaldo de la auditoría; identificar plazos propios como decisiones de diseño y aportar matriz fuente–regla actualizada. | 4 | 0,5 |
| 14 | V3 **+2** | Acreditar en producción visitante nuevo, cero registros, fuente caída y separación real/demo, sin datos ajenos ni etiquetas de medición o normalidad injustificadas. | 4 | 0,5 |
| 15 | V4 **+2** | Corregir hidratación y llamadas de audio/vibración; aportar tests, lint y build satisfactorios y recorrido de producción sin errores, también sin conexión. | 4 | 0,5 |
| 16 | V5 **+2** | Publicar inglés completo, liberar las acciones tapadas por avisos, corregir contraste y controles pequeños, y verificar registro completo <90 s. | 4 | 0,5 |
| 17 | C3 **+2** | Separar efectivamente los visitantes y demostrar permisos, escalamiento mínimo, cola con retardo y sincronización tras recuperar conexión. | 6 | 0,33 |
| 18 | P5 **+2** | Ofrecer en inglés los materiales de evaluación enlazados y verificar sitio, repositorio y navegación sin registro en una sesión privada nueva. | 6 | 0,33 |
| | **Total recuperable: +38** | | | |

Además, deben completarse las puertas administrativas: integrantes/evento, enlace definitivo de demo, metadatos de IA aplicables, referencias completas y constancia de envío dentro del plazo. Eso habilita la candidatura; no suma puntos por sí mismo.

**Dictamen — cinco líneas**

> VIGÍA responde directamente al reto mediante autoevaluación, contexto ambiental y acciones a bordo.  
> Destacan el motor personal, la interfaz anatómica y la transparencia sobre los límites de simulación.  
> La evidencia no acredita preparación para despliegue: hay contradicciones públicas de privacidad, datos y evaluación.  
> La demo ausente y el inglés incompleto impiden acreditar la elegibilidad global.  
> Otorgo **62/100**: propuesta prometedora, con validación y presentación pública todavía insuficientes.