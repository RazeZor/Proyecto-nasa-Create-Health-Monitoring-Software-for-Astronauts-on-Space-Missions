# Rúbrica de la auditoría VIGÍA (fijada en la iteración 1, 2026-11-15 01:45 UTC-3)

Fuente primaria: *Judging & Awards Guide* 2026 de NASA Space Apps (página fechada 13 de noviembre de 2026, leída el 2026-11-15 a través de un lector de texto porque spaceappschallenge.org no se puede abrir directamente desde la red del equipo). La guía oficial puntúa cada criterio de **1 a 5**. Esta auditoría usa 20 puntos por criterio (100 en total): nota oficial × 4. Los subcriterios son observables que desglosan la definición oficial; no la sustituyen.

Esta rúbrica **no se modifica** después de la iteración 1.

## Definiciones oficiales (traducción fiel, resumida)

| Criterio | Definición 2026 | Nota 5 |
| --- | --- | --- |
| Impact | Aborda un problema menor o mayor, lo que influye en la calidad y cantidad de su efecto; su alcance va de un público amplio a unos pocos. | Problema significativo con solución propuesta; alcance extenso, inspira, beneficia a un público grande o podría cambiar el mundo; calidad muy por encima de lo esperado. |
| Creativity | Originalidad e innovación: un concepto nuevo o una mejora significativa de ideas existentes; perspectiva fresca o ejecución inventiva. | Enfoque rompedor nunca intentado; desafía los métodos convencionales; la singularidad de la idea la hace una innovación real. |
| Validity | Fundada en principios científicos; factible técnica, funcional o lógicamente; diseñada para lograr su propósito y con potencial real. La completitud varía. La usabilidad y la facilidad de uso influyen en su practicidad. | Científicamente sólida y técnicamente factible; totalmente desarrollada y lista para implementarse; muy usable y fácil de usar. |
| Relevance | Responde plena y directamente al reto elegido; integra datos de la NASA como componente central, no como añadido superficial. | Compromiso profundo con el reto; los datos NASA son integrales al éxito y aportan ideas que impulsan la innovación; uso bien ejecutado. |
| Presentation | Comunica con claridad el reto, la solución y su importancia; narrativa atractiva y bien estructurada. **Los jueces evalúan la demo y el proyecto completo.** | Presentación bien estructurada y convincente; narrativa que permite captar la importancia e impacto; entrega pulida. |

## Subcriterios observables (4 puntos cada uno, 20 por criterio)

Cada subcriterio se puntúa 0 (ausente), 2 (parcial) o 4 (cumple con evidencia). La evidencia debe ser ejecutable o verificable: captura, test, URL o cita del texto público.

### Impact (20)

| # | Subcriterio | Evidencia esperada |
| --- | --- | --- |
| I1 | El problema está cuantificado con fuentes primarias (retardo de comunicación, cinco peligros del HRP, carga de autoevaluación). | Cifras con fuente en readme, informe y pantalla Acerca de. |
| I2 | El beneficiario directo es claro (astronauta, oficial médico, cirujano de vuelo) y la herramienta cambia una decisión concreta de cada uno. | Tres roles visibles en la app con funciones distintas. |
| I3 | El efecto se mide: métricas de detección, falsas alarmas y tiempo de registro, con sus límites declarados. | KPI reproducibles desde código; límites explícitos. |
| I4 | Alcance más allá de la misión: entornos (estación, tránsito, superficie) y análogos terrestres (remoto, rural). | Perfiles de misión funcionales; sección de impacto en Tierra con casos reales. |
| I5 | Reutilizable: código abierto, instrucciones de arranque, contratos de datos, licencias y atribuciones. | README en inglés con `Run it`; licencias de modelo 3D y datos. |

### Creativity (20)

| # | Subcriterio | Evidencia esperada |
| --- | --- | --- |
| C1 | El enfoque difiere de un tablero de umbrales fijos: línea base personal + deriva lenta + contexto ambiental. | Motor de tres capas con tests y paridad. |
| C2 | El entorno medido entra en el razonamiento clínico (CO2 + cefalea, tormenta solar), no solo se muestra. | Alertas de entorno con procedencia en la app. |
| C3 | Diseño operativo original: privacidad por defecto, escalamiento mínimo, cola con retardo real, sin conexión. | Flujos verificables en la app. |
| C4 | Interfaz propia (cuerpo 3D anatómico clicable, registro guiado sin teclado) y no plantilla genérica. | Capturas; atribución del modelo. |
| C5 | Metodología de validación creativa: simulación reproducible con anomalías inyectadas y comparación contra el umbral fijo. | `kpi.json` y script. |

### Validity (20)

| # | Subcriterio | Evidencia esperada |
| --- | --- | --- |
| V1 | Cada umbral clínico y ambiental tiene fuente primaria y coincide con ella (NEWS2, CO2 3 mmHg, S1 = 10 pfu, presiones de cabina). | `auditoria/FUENTES.md` sin filas SIN RESPALDO en el motor. |
| V2 | Las afirmaciones del texto público coinciden con lo que hace el código (sin funciones prometidas y ausentes). | Matriz del Explorador sin filas CONTRADICE. |
| V3 | Modo real sin datos inventados: nada de mocks, aleatorios ni fallbacks silenciosos; error o "sin datos" visibles. | Tests que lo demuestran; capturas de estados vacío y error. |
| V4 | Calidad técnica: tests, lint, build en verde; funciona sin conexión; sin errores de consola en el recorrido. | Salida de los comandos; informe del Tester. |
| V5 | Usabilidad: flujo de registro < 90 s, controles táctiles, estados claros, idioma inglés completo, aviso "no es dispositivo médico". | Informe del Tester; cronómetro. |

### Relevance (20)

| # | Subcriterio | Evidencia esperada |
| --- | --- | --- |
| R1 | REUNIR: captura los indicadores que el reto nombra (presión arterial, pulso, glucosa, temperatura, horas de sueño, ánimo) con instrucciones de cómo medir. | Pantalla de registro y fichas. |
| R2 | EVALUAR: estado por indicador y por sistema, con explicación y codificación por color; figura humana clicable (ejemplo explícito del reto). | Cuerpo y tendencias. |
| R3 | ACTUAR: siguiente paso concreto por alerta, recordatorios de medición y escalamiento al equipo médico. | Alertas con acción; recordatorios; escalamiento. |
| R4 | Datos NASA integrales: OSDR (RadLab, EDA), DONKI, además de NOAA GOES; usados en el razonamiento y rotulados con fuente y fecha. | Pantalla Entorno y alertas de entorno; NASA Data del formulario. |
| R5 | Cubre las consideraciones del reto: entornos distintos, avisos periódicos, gráficos dinámicos, explicaciones simples, por qué importa cada examen. | Perfiles, recordatorios, gráficas, fichas. |

### Presentation (20)

| # | Subcriterio | Evidencia esperada |
| --- | --- | --- |
| P1 | Demo dentro del formato oficial (vídeo ≤ 30 s con subtítulos en inglés o ≤ 7 diapositivas en inglés) con equipo, integrantes, reto, imagen del proyecto, experiencia de uso y cómo los datos abiertos lo hicieron posible. | Enlace público probado en ventana privada. |
| P2 | Resumen de alto nivel y descripción detallada en inglés claros en 60 s de lectura: problema, solución, por qué importa. | `auditoria/ENVIO.md`. |
| P3 | La primera pantalla cuenta la historia sola: qué es, para quién, qué hacer ahora; el flujo reunir → evaluar → actuar es evidente. | Informe del Tester, primera impresión. |
| P4 | Coherencia entre demo, formulario, README, informe y app (mismas cifras, mismas funciones, mismos límites). | Revisión cruzada. |
| P5 | Repositorio y sitio públicos, en inglés, navegables sin registro; estructura clara; identidad visual propia sin logotipos de la NASA. | Prueba de enlaces. |

## Puertas de elegibilidad (pasa o no pasa; se revisan antes de puntuar)

Fuente: *Project Submission Guide* 2026 y sección *Eligibility for Global Judging* de la guía de jueces (ambas fechadas 13 de noviembre de 2026).

| Puerta | Regla oficial |
| --- | --- |
| E1 | Responder a un reto oficial; todos los integrantes registrados en el mismo evento local y visibles en la pestaña Members; máximo 6 personas. |
| E2 | Todos los campos obligatorios del formulario completos: Project Name, High-Level Project Summary, Link to Project Demo, Link to Final Project, Detailed Project Description, Use of Super Intelligence (SI), NASA Data, Space Agency Partner Data and Other References. |
| E3 | Demo: diapositivas (máximo 7, incluidas portada e introducción) o vídeo (máximo 30 s). Exceder el límite excluye del juicio global. |
| E4 | Inglés en la página de envío y en todo material enlazado; un vídeo puede hablarse en otro idioma solo con subtítulos en inglés; las diapositivas deben estar en inglés. |
| E5 | Enlaces de demo y de proyecto públicos, sin contraseña, permiso ni registro; probados en ventana privada. Recomendado: clasificación FortiGuard del sitio propio. |
| E6 | Al menos un dato o recurso de la NASA, descrito en el campo NASA Data (requisito para premio global). |
| E7 | SI/IA: indicar dónde y cómo se usó; imágenes y vídeo generados con marca de agua visible; audio, código y datos generados reconocidos en texto y metadatos; nada generado puede usar ni modificar marca de la NASA (logotipos, banderas, identificadores de misión). |
| E8 | Referencias: todo recurso externo (código, texto, imágenes, aunque sea libre) en el campo de referencias; sin material con copyright sin permiso. |
| E9 | Sin imágenes, vídeo, audio ni semejanza de menores de 18 años. |
| E10 | Marcar las dos casillas (términos y originalidad) y pulsar *Submit for Judging* antes del domingo 15 de noviembre a las 23:59 hora local del evento. |

## Nota sobre fuentes

La página del reto (background, objetivos, consideraciones) y las dos guías se guardaron como texto en la carpeta temporal de la sesión. La pestaña *Resources* del reto se consultó aparte y se resume en `auditoria/ENVIO.md`.
