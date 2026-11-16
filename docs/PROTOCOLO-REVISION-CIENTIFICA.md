# Protocolo de revisión científica y profesional

Versión 1, 16-nov-2026 UTC. **Estado: preparado, no ejecutado con profesionales ni participantes.** No constituye un protocolo clínico aprobado. El registro de afirmaciones conserva `validacion_clinica: false`, revisiones vacías y revisión profesional pendiente.

## Pregunta y uso previsto

¿Puede VIGÍA ayudar a una persona entrenada a reconocer y revisar desviaciones personales relevantes con un volumen tolerable de alertas, datos incompletos y enlace limitado? Se evalúa apoyo a revisión, no diagnóstico, tratamiento o aptitud de vuelo. La pregunta clínica, población, exclusiones y acciones deberán acordarse con los profesionales antes de estudiar personas.

Hipótesis de innovación: una integración local de referencia personal, contexto ambiental aplicable y explicación trazable podría mejorar la revisión frente a alternativas especificadas. MAD y CUSUM son métodos establecidos; la novedad no está demostrada por implementarlos. Comparar contra atención habitual o una herramienta concreta exige seleccionar esa alternativa con sus usuarios.

## Paquete listo para revisión

| Entregable | Ubicación | Qué acredita |
| --- | --- | --- |
| Afirmaciones y límites | `packages/schemas/evidencia-cientifica.json` | Qué se sostiene y qué permanece como hipótesis. |
| Protocolo exploratorio | `tools/validacion/protocolo.json` | Escenarios, semilla, tamaño, métricas y límites fijados antes de la ejecución. |
| Datos y código congelados | `tools/validacion/data/<UTC>/` | Casos, protocolo, hashes y resultados locales reproducibles. |
| Implementación evaluada | `packages/engine/engine.ts`, `evidencia.ts` | Motor real y reglas puras de elegibilidad; sin nuevos umbrales clínicos. |
| Evidencia visible | `GET /ciencia/evidencia`, Acerca de | Integridad, vigencia, denominadores y estado de revisión. |
| Inventario de fuentes | `docs/DATOS-Y-EVIDENCIA.md` | Qué datos existen y para qué son aplicables. |
| Verificación operativa | `tools/verificacion/data/` | Pruebas y ensayo de recuperación, separados de eficacia clínica. |

Los datos sintéticos y ambientales no equivalen a una cohorte humana. Un DOI correcto o una coincidencia de palabras en un resumen tampoco equivale a verificación de la afirmación completa.

## Responsabilidades y puertas de salida

| Revisión | Persona requerida | Evidencia solicitada | Condición de salida |
| --- | --- | --- | --- |
| Uso y riesgo clínico | Profesional de medicina con competencia pertinente; idealmente medicina aeroespacial | Revisión de cada banda, datos omitidos de NEWS2, agregación, escalamiento y acción propuesta; casos límite anotados. | Dictamen firmado sobre uso permitido y cambios necesarios; no una aprobación genérica de todo VIGÍA. |
| Instrumentación | Especialista en medición/sensores | Comparación con referencia, sesgo, dispersión, artefactos, cadencia, reloj, postura y cambios de instrumento. | Incertidumbre y condiciones de uso documentadas; el reloj no se trata como referencia clínica por defecto. |
| Radiación/ambiente | Especialista en dosimetría o entorno espacial | Unidades, ubicación del detector, cobertura, exposición ambiental frente a personal y aplicabilidad temporal. | Matriz de usos permitidos y prohibidos; ninguna conversión Gy→Sv sin modelo justificado. |
| Estadística independiente | Evaluador que no ajuste las reglas | Protocolo confirmatorio, comparador, tamaño muestral, referencia de verdad y plan de análisis. | Plan fechado antes del conjunto reservado; criterios y análisis no elegidos por los resultados. |
| Usabilidad | Evaluador y usuarios representativos | Tareas de interpretación, confirmación y comunicación; éxito, tiempo, errores y comprensión de límites. | Informe de sesiones y correcciones; objetivo de registro <90 s aún debe medirse con personas. |

Responsables reales: **por asignar**. La herramienta de IA no ocupa ninguno de estos roles ni se declara revisor independiente.

## Diseño de la siguiente evaluación

1. Registrar versión, hashes, pregunta primaria y escenario de uso. No reutilizar un banco conocido como conjunto reservado independiente. La auditoría actual es exploratoria, del mismo equipo y sin criterio clínico confirmatorio.
2. Acordar etiquetas de referencia y severidad con revisores. Para datos humanos: disponibilidad legítima, consentimiento y revisión ética/institucional que corresponda, minimización y almacenamiento protegido antes de recopilar. No incorporar datos identificables al repositorio.
3. Separar desarrollo y evaluación por **persona y misión**, no por filas del mismo individuo. El custodio reserva casos, documenta exclusiones y no los entrega para ajustar umbrales.
4. Definir comparadores antes de evaluar: umbrales especificados, referencia personal simple, motor y ablaciones. Analizar diferencias de carga de alertas; comparar sensibilidad a una carga acordada requiere un diseño aparte.
5. Calcular tamaño muestral con el estadístico según precisión o diferencia mínima relevante y frecuencia de eventos. No fijar una cifra universal de participantes por conveniencia.
6. Definir detección por evento, ventana temporal, episodios, datos observables y recuperación. Informar no detectados y censura; el retraso entre detectados no representa el de todos los eventos. Informar eventos por persona y correlación entre episodios.
7. Prespecificar intervalos, remuestreo por persona/misión y tratamiento de múltiples comparaciones. Incluir cambios de instrumento, datos ausentes, desviaciones sutiles, ruido correlacionado y colas pesadas.
8. Acordar criterios de aceptación con usuarios y profesionales **antes** de abrir el conjunto. Si no existen, presentar resultados descriptivos y no declarar aprobación.
9. Publicar resultados favorables y desfavorables, desviaciones del protocolo y versiones. Toda modificación posterior requiere nueva evaluación con datos no usados para ajustarla.

## Ficha de revisión para completar por un profesional

Copiar una por ámbito, conservar el original firmado en el almacenamiento acordado y publicar solo lo autorizado:

| Campo | Valor pendiente |
| --- | --- |
| Identificador de revisión y ámbito | Pendiente |
| Nombre, cualificación y entidad del revisor | Pendiente; no inventar credenciales |
| Conflictos de interés y relación con desarrollo | Pendiente |
| Fecha UTC y versión/hash de los artefactos vistos | Pendiente |
| Afirmaciones revisadas y fuentes consultadas | Pendiente |
| Método de revisión y casos utilizados | Pendiente |
| Hallazgos, severidad y limitaciones | Pendiente |
| Dictamen: aceptar para uso acotado / corregir / rechazar | Pendiente |
| Condiciones de uso, tareas y responsables | Pendiente |
| Evidencia de firma o confirmación del revisor | Pendiente |
| Fecha y evidencia de cierre de cada corrección | Pendiente |

Una plantilla completada por el equipo no reemplaza la confirmación de su autor. El contrato `afirmaciones-v1` obliga a mantener pendiente la revisión actual: publicar un dictamen real requerirá actualizar el contrato y enlazar su evidencia, no cambiar un booleano en la interfaz.

## Reproducción local de la auditoría actual

```powershell
.\apps\web\node_modules\.cache\runtime\node.exe tools/validacion/ejecutar.ts --publicar
.\venv\Scripts\python.exe tools/verificacion/verificar.py --node apps/web/node_modules/.cache/runtime/node.exe --web
```

El runner no necesita red. Publica un reporte de simulación en gold; no ingiere fisiología humana ni aprueba un uso clínico. `evaluarEvidencia` clasifica ausencia, antigüedad y comparabilidad sin inventar porcentajes de confianza y conserva extremos para confirmación. El filtro ambiental compartido ya se usa en la app; la captura completa por observación sigue pendiente.

## Interpretación técnica del banco

El comparador de umbrales activa cualquier banda anormal de uno de cuatro parámetros; no es el score completo ni tiene la misma carga de alarmas que la agregación de VIGÍA. La referencia personal simple usa mediana/MAD de prevuelo y persistencia; sin prevuelo se abstiene. Las ablaciones comparten la política robusta de referencia, y sin C no acumulan su CUSUM ni aplican sus exclusiones.

Las inyecciones de deriva son rampas de diez días con un máximo mantenido hasta terminar el evento; no son diagnósticos de fatiga. La unidad de detección es misión con un evento inyectado. Los días consecutivos con alertas se agrupan como un episodio, combinando canales; se excluyen siete días de recuperación al calcular exposición fuera del evento. La coincidencia temporal de una alerta se cuenta como detección sin adjudicación causal. Una alarma incidental también puede coincidir con la ventana: hace falta interpretación junto con controles.

No hay IC para la tasa de falsas alertas en esta versión; se informan numerador y exposición. Los intervalos Wilson de detección y bootstrap pareado son descriptivos y no corrigen multiplicidad. El bootstrap puede dar intervalos degenerados con resultados uniformes en muestras pequeñas. Los escenarios ambientales comprueban reglas; no son réplicas de una enfermedad. El control con sensor fijo no acredita detección de fallos del sensor: esa capacidad sigue pendiente.
