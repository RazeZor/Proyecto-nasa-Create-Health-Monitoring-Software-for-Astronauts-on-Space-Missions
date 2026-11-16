# Ejecución del plan de implementación

16-nov-2026 · Rama `feat/ejecutar-plan-integral` · Continuación de [T01–T44](PLAN-IMPLEMENTACION-COMPLETO.md).

Esta entrega implementa mecanismos del producto. **No equivale a haber completado las 44 tareas ni a validación clínica. T38, presentación final, está excluida por solicitud del usuario.** Las puertas que necesitan personas, equipos físicos o datos autorizados permanecen identificadas; no se inventan dictámenes ni participantes.

## Cambios integrados

- Observaciones inmutables con ID/operación, unidad, procedencia, instrumento, método, sitio, hora propia y recepción separada. El formulario permite declarar una hora anterior o desconocida. Correcciones enlazadas; originales y extremos conservados. Migraciones 007–011 sin borrar las tablas anteriores ni inventar recepción de registros legados.
- Evidencia temporal en historial, motor y pantallas. No sumar bandas de tomas separadas por horas; excluir evidencia no comparable de la referencia personal; conservar extremos para confirmación. Las ventanas de cinco minutos/24 horas son **decisiones técnicas experimentales pendientes de revisión**, no límites clínicos validados. Las trazas guardan entrada/salida, fuentes por campo, configuración, presión de perfil y SHA-256 del motor como resultados del cliente.
- Cuentas con scrypt, sesiones opacas de ocho horas, HttpOnly/SameSite, CSRF, revocación, límite de intentos y ámbito de misión. Una cabecera o una ruta no concede identidad. El acceso clínico ajeno requiere misión, rol y consentimiento vigente.
- IndexedDB transaccional por usuario/misión/modo; cuarentena de claves antiguas sin dueño. Bandejas y acuses por operación, conflictos explícitos y borradores conservados. Exportación/restauración privada con hash; copia SQLite coherente con WAL y restauración exclusivamente aislada.
- Episodios: abrir → acción/impedimento → nueva medición → revisión → cierre médico explícito, con reapertura y bitácora. Una medida normal no cierra el caso.
- `apps/tierra`: otro proceso y otra base, recepción persistente con ID/hash, credencial separada de operador y respuestas causales. El temporizador solo habilita intentos. Sigue siendo un ensayo de transporte.
- Auditoría v1.2: canal objetivo, coincidencias incidentales, máscara común, ausencias parciales/informativas, estacionalidad, adaptación prolongada y deriva breve. Variantes estable/doble permanecen en investigación.
- Tendencias: diario de sueño informado/estimado, turno/carga y práctica de reacción con fotograma, modalidad, anticipación e interrupciones. Las sesiones no se declaran comparables ni equivalentes a PVT. HRV/masa/laboratorio conservan sus puertas de datos y revisión.
- Carcasa offline completa antes de activarse y build separado para verificación. Los ensayos usaron bases temporales; no se sustituyeron los servicios abiertos. La revisión final encontró la base local en v11: al compartir la carpeta, los servicios podían descubrir las nuevas migraciones. Se respaldó y verificó la conservación de filas previas; véase el registro de verificación.

## Aceptación por tarea

“Implementado” describe un mecanismo de software; no sustituye los criterios humanos de la tarea completa.

| Tarea | Implementación o decisión | Pendiente para cerrar la tarea completa |
| --- | --- | --- |
| T01 | Uso técnico centrado en medición y seguimiento; entorno histórico separado. | Responsable humano y aprobación del uso previsto. |
| T02 | Rama independiente, entorno reutilizado, pruebas y build aislado. | CI y reproducción por otra persona. |
| T03 | Ámbitos del protocolo de revisión conservados. | Colaboradores reales, sin sustituirlos por IA. |
| T04 | Política técnica versionada y condiciones en SETUP. | Aprobación clínica/metrológica de ventanas, sensores y riesgos. |
| T05 | Contratos de observación, episodio y evaluación; operaciones idempotentes. | Revisión de interoperabilidad e incertidumbre instrumental. |
| T06 | API/SQLite de tomas, repeticiones y correcciones. | Migración ensayada en copia de cada instalación real. |
| T07 | Hora por campo y ventana explícita, originales visibles. | Caracterización física de tiempos e intervalos de sueño. |
| T08 | Política integrada en entradas, motor y vistas. | Revisión profesional de la política. |
| T09 | Configuración y trazas con entrada/salida y huella del motor. | Archivo de cada entrega y compatibilidad a largo plazo. |
| T10 | Sesiones, CSRF, roles/misión, consentimiento y revocación ensayados. | Operación de cuentas, HTTPS y revisión independiente. |
| T11 | IndexedDB aislado, cuarentena y cambio de usuario ensayado. | Protección del disco/dispositivo; acceso offline limitado a pestaña y vencimiento. |
| T12 | IDs, bandejas, acuses y conflictos en tomas/episodios/estudios; informes y síntomas conservados. | Más fallos en fronteras y dispositivos físicos. |
| T13 | Respaldos/restauración y copia SQLite con WAL/integridad probados en temporal. | Fallo físico de almacenamiento y recuperación del despliegue objetivo. |
| T14 | Actualización de carcasa sin activación parcial. | Gold con varios escritores no habilitado: mantener un publicador por almacén. |
| T15 | Canal objetivo, incidentales y máscara común. | Comparación a carga equiparada; su ausencia se declara. |
| T16 | 18 escenarios, 1.080 misiones sintéticas y curvas con controles. | Calibración a población/dispositivo y relevancia clínica. |
| T17 | Comparación exploratoria de referencia adaptativa, estable y doble. | Evaluación más amplia e independiente. |
| T18 | Conservar detector de producto; no promover variante por sensibilidad aislada. | Criterios prespecificados y revisión antes de promover. |
| T19 | Instrumentación de tiempo, procedencia y método. | Reloj físico contra referencia: postura, contacto, sesgo y ausencias. |
| T20 | Modelo puro, transiciones, versiones y reapertura. | Revisión del protocolo de actuación. |
| T21 | Bitácora/API y concurrencia optimista. | Ensayo entre varios equipos físicos. |
| T22 | Registro, Cuerpo, Tendencias, Alertas e Informes conectados; recorrido Chrome. | Usabilidad representativa y aprobación humana. |
| T23 | Catálogo versionado de tareas de registro/confirmación/revisión; cada evento conserva las versiones. Sin prescripciones generadas. | Revisión pendiente del catálogo y de acciones clínicas preexistentes. |
| T24 | Receptor, acuses, operador y vuelta causal; pruebas de pérdida/duplicados. | Destino y red reales con operación autorizada. |
| T25 | MMASH adquirido/importador/API de referencia conservados. | Cohorte longitudinal adecuada, permiso y diccionario; 24 h no validan deriva. |
| T26 | Día Orion con cuatro instrumentos separados conservado. | Ubicación/material y ampliación temporal justificada; no inventar dosis personal. |
| T27 | Diario de sueño/método/rutina y archivo privado. | Referencia y evaluación profesional. |
| T28 | Práctica instrumentada e interrupciones no comparables. | Latencia física, repetibilidad y protocolo revisado. |
| T29 | Carga/autoinforme privados y aplazamientos explícitos. | NN con calidad para HRV, masa/correcciones y revisión. |
| T30 | Puertas del diseño confirmatorio conservadas en el protocolo. | Custodio, criterios, muestra y conjunto reservado reales. |
| T31 | Registro mantiene revisión profesional pendiente. | Dictámenes reales, cualificación y alcance verificados. |
| T32 | Banco reproducible de desarrollo. | Evaluación reservada independiente; otra semilla no la sustituye. |
| T33 | Recorridos de aceptación de software ejecutables. | Personas representativas, tiempos, errores y comprensión. |
| T34 | Mecanismos técnicos preparados para revisión. | Consentimiento/proceso institucional, supervisión y piloto reales. |
| T35 | Pruebas locales, tipos, build y Chrome con servicios temporales. | CI Linux de esta rama, instalación limpia y equipos adicionales. |
| T36 | Permisos, CSRF, revocación, consentimiento y caché privada ensayados. | Revisión independiente y protección del dispositivo/despliegue. |
| T37 | Artefactos, hashes, negativos, trazas y comandos reproducibles. | Evidencia externa para afirmaciones profesionales/confirmatorias. |
| T38 | **Excluida por el usuario.** | No se hizo presentación final. |
| T39 | Operación, cuentas, transporte y recuperación en SETUP. | Operador, soporte, despliegue y aprobación de salida. |
| T40 | Laboratorio aplazado explícitamente. | Pregunta, fuente, unidades y revisión; ampliación condicional. |
| T41 | HRV/masa/correcciones aplazadas explícitamente. | Señal, referencia y revisión; ampliación condicional. |
| T42 | Contexto ambiental existente conservado. | Pregunta que justifique más FLR/EDA/PDS. |
| T43 | Contrato propio de transporte ensayado. | FHIR/otro reloj requieren receptor/dispositivo concreto. |
| T44 | Voz/imágenes/ómicas fuera del núcleo. | Proyecto, datos y especialista propios. |

## Decisión científica y paridad

TypeScript es la ruta de producto. Python conserva el simulador histórico de series completas: las fixtures siguen cubriendo ese contrato diario. Las extensiones temporales, fuentes y tomas originales existen en TypeScript; no se afirma paridad sobre campos que Python no implementa. No se cambiaron bandas clínicas para mejorar una métrica.

La decisión queda fijada en [ADR-001](decisiones/ADR-001-motor-y-simulador.md).

La auditoría v1.2 conserva el negativo relevante: **1/60 derivas sutiles** con `ABC_contexto`, 59 omitidas e IC95 Wilson aproximadamente 0,3–8,9 %. Su control produjo cero episodios en 4.200 días observados. Son inyecciones sintéticas del mismo equipo, no pacientes ni astronautas. Las variantes se evalúan aparte y no se promueven porque mejore una curva del generador.

La variante estable detectó 60/60 en la celda sintética de magnitud 0,3/duración 20 días, pero en el control con ruido correlacionado produjo **57 episodios falsos frente a 2** del motor actual (4.200 días por método); con sensor fijo produjo 21 frente a 0. La variante doble también aumentó esa carga. Estas limitaciones respaldan conservar el detector actual mientras se revisan objetivos, errores y criterios; el 60/60 no es rendimiento clínico ni demuestra superioridad general.

Artefactos locales reproducibles, ignorados por Git:

- Banco: `tools/validacion/data/20261116T031808491Z/resultado.json` y congelación; 1.080 misiones, 18 escenarios, siete comparadores; publicado en gold con hash.
- Investigación: `tools/validacion/data/investigacion-20261116T032337889Z/resultado.json`, 45 celdas y controles. Sin carga equiparada ni criterio confirmatorio.
- Chrome autenticado final: `tools/verificacion/data/ensayo-20261116T120211Z/resultado.json`, 18 observaciones y una remedición posterior a la acción.
- Recuperación/datasets final: `tools/verificacion/data/ensayo-20261116T120254Z/resultado.json`.
- Ida/vuelta entre procesos: `tools/verificacion/data/transporte-20261116T114554Z/resultado.json`.
- Conservación y respaldo local: `tools/verificacion/data/conservacion-20261116T120536Z/resultado.json`.

Los resultados finales están en [VERIFICACION](VERIFICACION.md). Una corrida posterior prevalece para los archivos modificados después de estos artefactos.
