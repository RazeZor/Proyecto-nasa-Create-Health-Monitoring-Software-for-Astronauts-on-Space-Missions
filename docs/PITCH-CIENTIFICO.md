# Pitch científico de VIGÍA

Versión de investigación, 16-nov-2026 UTC. Este guion sustituye las cifras generales del pitch anterior. El material histórico del generador de desarrollo sigue disponible para reproducibilidad, pero **no debe usarse como rendimiento general**. No hay aval clínico, certificación de vuelo ni innovación comparativa validada.

## Mensaje principal

VIGÍA convierte registros personales y contexto ambiental aplicable en señales explicables que pueden revisarse a bordo, aun sin enlace. El avance presentado es una integración operativa y auditable. Estamos midiendo dónde funciona y dónde falla antes de afirmar beneficio clínico.

## Demo de siete diapositivas

La [guía oficial de envío consultada](https://www.spaceappschallenge.org/resources/project-submission-guide/) exige materiales en inglés y permite siete diapositivas o treinta segundos. La tabla contiene el contenido final en inglés y las notas de ensayo en español. Completar nombre del equipo, integrantes reales y evento antes de enviar; no se inventaron identidades ni se realizó una publicación.

| # | Texto principal para la diapositiva | Demostración y notas para el equipo |
| --- | --- | --- |
| 1 | **VIGÍA — Explainable health monitoring with limited connectivity. Research prototype. Professional and clinical validation pending.** | Una persona a bordo debe revisar un cambio sin poder esperar una conversación inmediata con Tierra. Presentar equipo e identificar el reto Health Monitoring Software. |
| 2 | **Record → Evaluate → Review → Prepare a report. Daily entries, personal trends and contextual evidence stay available onboard.** | Mostrar el registro y una alerta con dato, procedencia y regla. No prometer diagnóstico. El objetivo <90 s requiere medición con usuarios. |
| 3 | **Real reference datasets: MMASH, 22 terrestrial participants, and one Artemis I day, four instruments. Personal crew data stay separate. Demo physiology remains simulated.** | Enseñar el catálogo de datasets adquiridos y su procedencia. MMASH aporta aproximadamente 24 h y tiempos relativos; Orion aporta radiación ambiental histórica. No se usan como prueba de eficacia clínica del detector. |
| 4 | **A partial safety-band adaptation + personal deviation + CUSUM + applicable context. Published methods; prototype rules.** | NEWS2 completo usa variables que VIGÍA no captura. Identificar cuatro parámetros y agregación propia. La aportación propuesta es integración trazable; su superioridad aún no está demostrada. |
| 5 | **We tested the product engine, including failures. 780 synthetic missions · 13 scenarios · 7 methods. Subtle drift: 1/60 detected, 59 missed; 95% CI 0.3–8.9%.** | No ocultar el resultado adverso. Añadir: intense drift 60/60, CI 94.0–100%; same-team exploratory benchmark, no human cohort. No mezclar reglas ambientales deterministas con detección de deriva. |
| 6 | **Every claim links to a source, implementation and limit. Reports carry code and protocol hashes. Offline report recovery and retries are tested.** | Abrir Acerca de → Evidencia científica; cambiar escenario y comparar métodos. En control hay cero episodios del motor en 4.200 días sintéticos: esto no demuestra riesgo cero. El receptor en Tierra sigue simulado. |
| 7 | **Next: independent medical and measurement review, sensor characterization and a reserved evaluation. We seek scientific collaborators, not an unearned clinical endorsement.** | Mostrar protocolo y ficha de revisión pendientes. Pedir una colaboración específica: revisar reglas/mediciones y acordar criterios para la siguiente evaluación. Cerrar con una decisión completa, no con una lista de futuras funciones. |

## Guion de treinta segundos

**Español para ensayo:** «Cuando el enlace con Tierra falla, revisar cambios de salud sigue siendo necesario. VIGÍA cruza el registro personal con contexto ambiental aplicable y explica sus señales a bordo. Evaluamos el motor en 780 misiones sintéticas: detectó 60 de 60 derivas intensas y solo una de 60 sutiles. Mostramos también los fallos. Las fuentes y las versiones son auditables. Buscamos revisión profesional y evaluación independiente para demostrar utilidad clínica.»

**English submission script:** “When contact with Earth is limited, health changes still need review. VIGÍA combines personal records with applicable environmental context and explains its signals onboard. We tested the engine on 780 synthetic missions: it detected all 60 intense drifts, but only one of 60 subtle drifts. We show the failures too. Sources and software versions are auditable. We are seeking professional review and independent evaluation to establish clinical usefulness.”

Cronometrar la lectura real antes de grabar; recortar si supera treinta segundos. La cifra 780 describe misiones sintéticas de escenarios diferentes, no personas ni eventos clínicos.

## Respuestas para el jurado

| Pregunta | Respuesta respaldada hoy |
| --- | --- |
| ¿Está validado por profesionales al 100 %? | No. No hay dictamen profesional firmado ni evaluación clínica. Sí hay verificación de software y una auditoría sintética reproducible, con límites publicados. |
| ¿Añadieron datos? | Sí: MMASH v1.0.0, 22 sujetos terrestres, 1.749.295 intervalos originales y 22 periodos de sueño; Orion, 3.456 observaciones de un día y cuatro instrumentos. Ambos tienen procedencia e integridad verificadas y están separados del usuario actual. La evaluación del motor continúa siendo sintética; CBC/CMP y el conjunto longitudinal pertinente siguen pendientes. |
| ¿Qué tiene de innovador? | Proponemos integrar referencia personal, aplicabilidad del contexto y explicación local con trazabilidad. La novedad y el beneficio frente a alternativas siguen como hipótesis que hay que evaluar. |
| ¿Por qué no mostrar solo el 99,8 % anterior? | Procedía de un generador de desarrollo y otra inyección. El banco nuevo revela una limitación importante; mostrar ambas procedencias evita generalizar una cifra favorable. |
| ¿Ganó el motor a todos los comparadores? | No. El resultado depende del escenario y de la carga de alarmas. En deriva sutil el comparador personal detectó 4/60 frente a 1/60 del motor; no se ha demostrado superioridad general. |
| ¿NEWS2 valida sus decisiones? | No. Usamos bandas parciales para cuatro parámetros y una agregación propia. No implementamos NEWS2 completo y su validación no se transfiere al prototipo. |
| ¿Los datos NASA son esenciales? | Aportan contexto y escenarios ambientales con procedencia. No se usan como verdad clínica ni se convierten automáticamente en exposición personal. |
| ¿Qué significa que funciona offline? | El motor y el registro operan localmente. La recuperación y los reintentos de informes se ensayan en navegador. Siguen pendientes autenticación, aislamiento general del almacén y receptor terrestre independiente. |
| ¿Qué probabilidad tiene de ganar? | No hay base para asignar un porcentaje. Podemos hacer una candidatura más defendible con relevancia, evidencia reproducible y una demo clara; la decisión corresponde al jurado. |

## Uso de IA y fuentes

Se usaron asistentes de IA para investigación pública, redacción, código, pruebas y generación de casos sintéticos. No son revisores clínicos independientes. Los autores deben revisar y asumir las afirmaciones finales. Fuentes, comparación de los diez ganadores y límites de acceso: [análisis 2025](GANADORES-2025-Y-ESTRATEGIA-CIENTIFICA.md). Datos reales disponibles: [inventario](DATOS-Y-EVIDENCIA.md). Próxima revisión: [protocolo profesional](PROTOCOLO-REVISION-CIENTIFICA.md).
