# Datos y evidencia necesarios para VIGÍA

La selección y el orden de adquisición siguientes se ejecutan conforme al [plan completo vigente, sección 6](PLAN-IMPLEMENTACION-COMPLETO.md#6-qué-datasets-agregar-y-para-qué). El inventario de este documento describe lo realmente adquirido; las nuevas fuentes del plan siguen siendo candidatas hasta completar sus criterios.

Revisión local: 2026-11-15, inventario de partida 2026-11-16T00:28:49Z y ampliaciones posteriores descritas abajo. Base de código `cf5d53f`, con cambios locales. La sección 1 conserva el inventario previo; la siguiente sección registra adquisiciones efectivas nuevas.

## Adquisición efectiva posterior: MMASH y Orion

Se descargaron e incorporaron dos referencias nuevas durante la preparación del plan completo:

| Producto | Adquisición y contenido comprobados | Estado de integración | Límite |
| --- | --- | --- | --- |
| MMASH v1.0.0, PhysioNet | ZIP de 24.649.620 bytes, licencia y SHA256SUMS; ambos hashes coinciden con los publicados. 22 sujetos, 1.749.295 intervalos originales y 22 periodos de sueño. | `pipelines/biometria`: originales por contenido, normalización, contrato y `gold/dataset-mmash.json`. 1.701.696 intervalos agregados en 5.944 puntos de 5 min; API y vista de datasets adquiridos. | 47.599 intervalos con día original `-29` se conservan en raw sin agregarlos a una fecha inventada. Tiempos de estudio relativos; sin UTC de toma. La FC derivada no se declara FC en reposo ni validación de deriva de semanas. |
| RadLab Artemis I / Orion | 17-nov-2022 UTC: 3.456 filas; EAD-MU01 y M42-SN127 con 288 puntos originales cada uno; HERA-HSU1/HSU2 con 1.440 cada uno. | Ingesta RadLab, `orion-artemis-i-piloto` y su panel; 1.152 puntos agregados, cuatro instrumentos separados, cobertura de rejilla 1,0 por instrumento. | Solo dosis absorbida ambiental disponible en esta ventana. Dosis diaria por instrumento entre 403,0713 y 424,0605 µGy; no se promedian ni se convierten a mSv personales. Ubicación/material específicos necesitan documentación del detector. |

El archivo MMASH y la licencia conservan respectivamente SHA-256 `ef91ee1b36b5849a6366b1918de82686ab278915d33c7f62133f07f741f70726` y `bcdfcd4f31c790e30fb645dc36414907172405897adff329ad379eed85d12017`. Licencia ODbL-1.0, DOI `10.13026/cerq-fc86`, fuente [PhysioNet](https://physionet.org/content/mmash/1.0.0/). No se incorporan participantes a las cuentas de tripulantes actuales.

La consulta Orion se conserva en raw con SHA-256 `ca68ec01476cea0bf6f7f9082c2a1a68e19032d384b5e7845dae176376e0c6b3`. Se corrigió el saneamiento de URL para preservar los operadores RadLab y se reparó ese metadato de la consulta conocida; no se modificaron bytes raw ni mediciones. [Sintaxis y unidades oficiales](https://visualization.osdr.nasa.gov/radlab/gui/data-api/).

Se pasa de 14 a 17 productos gold compartidos. Los tres originales MMASH tienen su propio manifiesto en `pipelines/biometria/data/`; el datalake ambiental añade una entrada raw y un curated RadLab. La adquisición no ejecuta el motor con esos sujetos ni cambia las conclusiones de la auditoría sintética. CBC/CMP y la fuente longitudinal siguen pendientes.

Reproducción, desde la raíz y con datos fuera de Git:

```powershell
.\venv\Scripts\python.exe pipelines/biometria/index.py mmash
# Alternativa con originales ya descargados y sus sumas/licencia:
.\venv\Scripts\python.exe pipelines/biometria/index.py mmash --desde tools/investigacion/data/mmash-1.0.0
```

Orion se ingiere desde `pipelines/datalake` con `index.py ingest radlab spacecraft=Orion timestamp%3E=2022-11-17T00%3A00 timestamp%3C2022-11-18T00%3A00 absorbed_dose_rate dose_equivalent_rate instrument_family`; luego, desde `pipelines/reanclaje`, `index.py panel escenarios/orion-artemis-i-piloto.json`. Usar el Python del entorno según SETUP. Los endpoints `/ciencia/datasets` y `/ciencia/datasets/mmash` o `/ciencia/datasets/orion` verifican hashes antes de servir. En Acerca de las cantidades se obtienen de esa API; offline se rotulan como última copia no comprobada.

## Ampliación científica ejecutada, 16-nov-2026 UTC

- Nuevo banco sintético: 780 misiones, trece escenarios y siete métodos; no es una cohorte humana ni un conjunto reservado independiente. Protocolo y código en `tools/validacion`; casos, congelación y resultado completos en su `data/` ignorada. Se publica `gold/validacion.json` con entrada `auditoria_sintetica` y SHA-256: pasa de trece a catorce productos gold, sin sustituir el KPI histórico.
- Ejecución publicada: `tools/validacion/data/20261116T013201320Z`, protocolo v1.1. La enmienda separa once escenarios fisiológicos y dos comprobaciones ambientales deterministas, y hace verificable el negativo ambiental. Se conservaron casos y detector; `comparacion-enmienda.json` confirma resultados fisiológicos idénticos a v1. Motor completo: 60/60 derivas intensas y 1/60 sutiles (IC Wilson 95 % 0,3–8,9 %). No se ajustaron umbrales. Fuera del evento intenso y recuperación aparecen 44 episodios en 2.580 días observados. Ver [interpretación y comparadores](GANADORES-2025-Y-ESTRATEGIA-CIENTIFICA.md).
- Fuentes de investigación: diez fichas completas de ganadores, guías y artefactos públicos seleccionados. Capturas y manifiestos en `tools/investigacion/data/20261116T005413Z` y `20261116T010513Z`. Varias fuentes se consultaron mediante representación de tercero, identificada; no se probaron todos los demos/repositorios ajenos.
- Comprobación de las 35 referencias: `tools/investigacion/data/referencias-20261116.json`; 33 coinciden con título y fragmentos esperados, dos `REVISAR_TEXTO` (`williams2009`, `mishra2020`). Ningún DOI/título incorrecto en esa consulta. La comprobación automática no valida la interpretación ni la aplicabilidad clínica.
- En ese hito anterior no se habían añadido Orion ni fisiología humana; la adquisición posterior está registrada arriba. CBC/CMP siguen pendientes. Los casos sintéticos no aumentan la evidencia humana.

## 1. Inventario anterior a la ampliación científica

Se usó `tools/verificacion/inventario.py` sobre `pipelines/datalake/data`, después de adquirir siete respuestas nuevas y publicar los paneles con el pipeline. No se imprimieron secretos ni datos individuales. El inventario enumera y deduplica los archivos curated; el producto los lee por las APIs/contratos existentes.

| Fuente | Archivos curated | Filas deduplicadas | Intervalo de observación encontrado | Lectura útil |
| --- | --- | --- | --- | --- |
| GOES | 2 | 1.719 | 2026-11-13 16:35 a 2026-11-16 00:00 UTC, discontinuo | Tres bandas de energía; el conteo no equivale a momentos independientes. Se añadió la ventana disponible. |
| DONKI | 8 | 45 | 2011-09-22 a 2024-05-13 UTC, discontinuo | 31 SEP para las fechas del viaje y 14 de mayo 2024. Consulta 14–15 nov. 2026 vacía y conservada como resultado válido solo para ese rango. |
| RadLab | 9 | 35.859 | 2011-11-12 a 2024-05-14 UTC, con ventanas discontinuas | Dosis absorbida presente en todas; equivalente no nula en 6.157 filas. No inferir cobertura continua de todo el intervalo. |
| EDA | 2 | 1.440 | 2014-09-21 a 2014-09-26 UTC | CO2, temperatura y humedad ISS/tierra presentes; cadencia y cobertura se evalúan por variable y ventana. |

El número de filas deduplicadas no equivale a tamaño de muestra humano ni a observaciones independientes.

Los 21 registros raw y los 13 productos gold pasaron las comprobaciones SHA-256. Las 14 respuestas originales se conservan. La integridad de bytes no acredita calibración, aplicabilidad ni verdad clínica.

Productos gold: `panel-demo`, `panel-panel-demo`, `dosis-equivalente`, `panel-dosis-equivalente`, `ejemplo-radlab-eda`, `tormenta-mayo-2024`, `panel-tormenta-mayo-2024`, `mision-vigia`, `panel-mision-vigia`, `mision-real`, `panel-mision-real`, `caso_referencia`, `kpi`.

`mision-real` y su panel ya existen. Su ventana DONKI solicita hasta 14-dic-2026: la consulta vacía reciente no cubre ese futuro y se declara en `faltan`. La demo publica 31 eventos SEP; su dosis de tránsito sigue siendo simulada. Orion/CBC/CMP siguen sin descargarse: no bloquean este hito ni acreditan una mejora del detector diario.

## 2. Restauración y coherencia ejecutadas

DONKI prioriza ahora `https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP`, verificado en el [aviso de NASA CCMC](https://ccmc.gsfc.nasa.gov/news/major-updates/). Mantiene fallback probado; las claves no quedan en manifiestos ni errores. Raw se crea en modo exclusivo y los manifiestos se reemplazan atómicamente (un escritor).

`index.py preparar` reproduce el KPI de 500 misiones con su semilla/parámetros vigentes y falla si difiere; después publica exactamente la fixture. SHA-256 común de fixture y gold: `8dfb46c5d5c3b2c8c76aed8cd4e9cee5370ca1a56b8ac70f634c9c4c105b13cd`. Se preservan los bytes de origen incluso si el checkout usa CRLF. Esto acredita reproducibilidad del experimento sintético existente, no validación independiente.

La API rotula el entorno del modo real como `uso: referencia` y el demo como `uso: escenario`. El adaptador del motor no usa históricos para acciones de cabina real. Se regeneraron también los tres paneles anteriores: `por_detector` conserva magnitud y cobertura propias, sin promediar instrumentos; `porcentaje_limite_carrera` es null en todos los paneles publicados. La interfaz conserva mGy y mSv separados. El manifiesto no contiene claves/tokens en sus URLs.

Procedimiento para próximas actualizaciones (los puntos 3–6 se ejecutaron en esta entrega):

1. Confirmar configuración efectiva sin imprimir .env ni claves: DATALAKE_DIR, escenario usado y versión de la aplicación.
2. Respaldar manifiestos/datos con hashes; raw se conserva inmutable.
3. Conservar la base DONKI-API actual y sus pruebas de fallback/saneamiento.
4. Ingerir una ventana actual acotada de GOES y DONKI y conservar la ventana histórica de la demo. Una respuesta de eventos vacía es válida; ausencia de consulta no lo es.
5. Generar/publicar `mision-real` y su panel usando las fuentes disponibles. Declarar las ventanas históricas reancladas como referencia/escenario. No convertir EDA 2014 en un sensor de cabina de 2026.
6. Comparar código/semilla/parámetros de la fixture y gold; regenerar el conjunto coherente y publicar su versión/hash.
7. Medir cobertura por indicador/detector, no solo cantidad total de filas. Exponer última observación y actualización, fallos de consulta y caducidad.

Un `git pull` trae código y fixtures versionadas. Según las reglas del repositorio, los datos locales están ignorados: requieren ingesta o restauración aparte.

## 3. Fuentes que sí incorporaría, por etapas

| Fuente candidata | Prioridad y pregunta | Uso permitido por el alcance propuesto | Puerta antes de descargar/integrar |
| --- | --- | --- | --- |
| RadLab Artemis I / Orion | Primera ampliación ambiental. ¿Podemos representar exposición histórica de una misión lunar con detectores y ubicación explícitos? | Escenario/referencia histórica, calidad y cobertura por detector. | Confirmar IDs, campos no nulos, unidad/material, cadencia y condiciones. Descargar primero un día. |
| OSD-575: panel metabólico procesado de Inspiration4 | Segunda ampliación, condicionada a una vista de laboratorio. ¿Podemos seguir valores originales por persona/fase sin mezclar unidades o ausencias? | Referencia histórica y pruebas del importador. | Seleccionar CSV procesado público concreto, versión/hash, unidades, protocolo y licencia. |
| OSD-569: hemograma procesado de Inspiration4 | Complemento del anterior. ¿La integración conserva identidad de muestra, tiempo relativo y analito? | Seguimiento de laboratorio de referencia; sin nuevas reglas clínicas por defecto. | Igual comprobación de archivo; revisar especialmente unidades originales antes de normalizar. |
| DONKI FLR | Después de asegurar SEP actual. ¿Una cronología enlazada explica mejor qué se observó/modeló? | Exploración y contexto de investigación con fecha de emisión. | Conector separado por producto, contrato validado y distinción observación/análisis/modelo. |
| EDA con una segunda misión/ventana | Evaluar cobertura y ausencia de canales. | Caso positivo/negativo de calidad de datos. | Confirmar CO2/humedad/temperatura por variable; no seleccionar solo por fecha reciente. |
| Cognición humana/NLSP | Factibilidad en paralelo al núcleo, no dependencia inmediata. | Diseñar protocolo y eventualmente evaluación de atención si existe acceso pertinente. | Confirmar variables individuales, granularidad, dispositivo, permisos y tiempos de acceso. |

NASA confirma la inclusión de radiación de Artemis I en RadLab y el acceso a telemetría desde Moon → Flyby → Orion. Esto valida la elección de la fuente, no que el conector de VIGÍA ya soporte todos sus instrumentos. [Anuncio NASA](https://science.data.nasa.gov/features-events/data-software-highlights-may-2026).

NASA identifica datasets de sangre de Inspiration4, con datos procesados públicos y acceso controlado para ciertos datos crudos. OSD-575 identifica el panel metabólico y sus relaciones con OSD-569. [NASA Inspiration4](https://www.nasa.gov/osdr-latest-news-i4-mission-datasets/), [OSD-575](https://osdr.nasa.gov/bio/repo/data/studies/OSD-575), [OSD-569](https://osdr.nasa.gov/bio/repo/data/studies/OSD-569).

Los CSV CBC/CMP no se descargaron ni se analizaron. Los tamaños/muestras del borrador previo siguen sin reconfirmarse; revisar archivos, unidades y permisos antes de implementar su importador. GOES/DONKI pertenecen al hito anterior; MMASH y el piloto Orion se incorporaron después, como detalla la primera sección.

## 4. Fuentes que no son necesarias para el siguiente hito

- PDS MSL RAD y LRO CRaTER: candidatos para Marte/órbita lunar cuando exista una pregunta que justifique interpretar productos, etiquetas, calibración y geometría. No son dosis personales de astronautas.
- Transcriptómica, microbioma, organoides y estudios de animales/células: investigación posterior con un colaborador y una hipótesis; no validan directamente decisiones desde sueño/pulso del usuario.
- Imágenes faciales: no se requieren para autenticar con credenciales ni para el seguimiento de episodios; no recolectar una base de rostros como atajo.
- Un gran dataset terrestre genérico: solo incorporarlo si cubre una pregunta técnica específica y se documenta su diferencia frente a vuelo.

## 5. Contrato de adquisición y trazabilidad

Cada adquisición registra: dataset/producto y versión, URL saneada sin credenciales, fecha de consulta, intervalo observado, fecha de publicación/revisión cuando exista, hash SHA-256, tamaño, condiciones/licencia, especie/material, instrumento/ubicación, unidades, precisión temporal, cobertura por canal, transformaciones y nivel de acceso.

Conservar original y normalizado vinculados. No imputar ausencias ni convertir unidades dudosas silenciosamente. Rechazar cambios de estructura antes de escribir curated/gold. Manifiestos escritos de forma atómica; añadir bloqueo antes de permitir escritores concurrentes. Sanear api_key tanto al escribir manifiestos como en errores de descarga/fallback.

Tiempos relativos de laboratorio, como L-3 o R+45, permanecen relativos si no existe hora de muestra confirmada. Su fecha de publicación no es su fecha de observación. El CO2 de un panel sanguíneo no es el CO2 de cabina.

Para radiación, mantener absorbida, equivalente y efectiva como magnitudes distintas. No calcular un porcentaje personal del límite de carrera con una medida ambiental sin modelo y revisión adecuados. No promediar o sumar detectores de ubicaciones distintas por defecto. La cobertura de varios detectores debe expresar el método de combinación, no adoptar sin más la cobertura máxima.

En el producto, separar `naturaleza` y `uso`: un dato histórico observado puede ser Real y seguir siendo únicamente referencia. Las fechas reancladas no demuestran coincidencia física de eventos ni causalidad con un síntoma.

## 6. Dependencias y ubicación del trabajo

| Trabajo | Dónde | Dependencia propuesta |
| --- | --- | --- |
| Orion | Extensión de `pipelines/datalake` + transformación de `pipelines/reanclaje`. | Biblioteca estándar; no cambiar el contrato sin versión. |
| FLR | Extensión acotada del datalake con limpieza por producto. | Biblioteca estándar. |
| CBC/CMP | Nuevo módulo `pipelines/biometria`, si se acepta el alcance. | csv/json/urllib de la biblioteca estándar al inicio. |
| Contratos | `packages/schemas`. | Mantener el validador y adaptadores explícitos. |
| Banco de evidencia | Nuevo módulo `tools/validacion` o ampliación justificada del simulador; ejecutar motor TS real. | Declarar dependencias propias; resultados grandes fuera de Git. |
| Vista de laboratorio | `apps/web`, principalmente dentro de Tendencias. | Reutilizar componentes/gráficas existentes; sin librería visual nueva obligatoria. |

No hace falta instalar datasets como dependencias de npm/pip. Se descargan y verifican como artefactos de datos; el código y su manifiesto reproducible quedan separados de los archivos masivos y personales.

## 7. Qué evidencia hay que generar

| Pregunta | Diseño mínimo | Resultado que se entrega | Lo que no demuestra |
| --- | --- | --- | --- |
| ¿Funciona lo implementado? | Unitarias/integración, tipado/build, versiones soportadas. | Logs, versiones, fallos y omitidas explicadas. | Eficacia médica. |
| ¿Conserva contexto temporal? | Valores extremos/normales intradía, signos separados y desfases de reloj. | Trazas por observación y evaluación. | Que un umbral sea adecuado para vuelo. |
| ¿Mejora la detección? | Conjunto reservado, comparadores personales y por umbral, ablaciones A/B/C/calidad/contexto. | Métricas con denominadores e intervalos por escenario. | Generalización a astronautas reales desde ruido sintético. |
| ¿Evita decisiones sin evidencia? | Datos antiguos, ausentes, de otra misión o no comparables. | Abstenciones/confirmaciones explicadas y extremos preservados. | Exactitud diagnóstica. |
| ¿Funciona sin enlace? | Internet/API/reloj separados; reinicio, reintento y pérdida de acuse. | Evidencia de persistencia y recepción idempotente. | Transporte espacial real certificado. |
| ¿Sirve a una persona? | Recorridos y registro cronometrados, interpretación de estados y carga. | Errores, tiempos, necesidad de ayuda y mejoras. | Sensibilidad clínica por un piloto pequeño. |
| ¿El reloj aporta medidas utilizables? | Ensayo físico contra instrumento de referencia y condiciones documentadas. | Frescura, sesgo, repetibilidad, fallos y aplicabilidad. | Validación del fabricante trasladada a vuelo. |
| ¿La tarea cognitiva está bien medida? | Caracterización de latencia/dispositivo y protocolo; sesiones inválidas. | Límites temporales y repetibilidad de la implementación. | Equivalencia automática con PVT validado. |

## 8. Orden de inversión recomendado

Primero migraciones, contratos temporales, identidad/aislamiento, bandeja durable y datos/KPI coherentes. Después un episodio de principio a fin y benchmark reservado. Incorporar una ventana Orion cuando las observaciones tengan trazabilidad y cobertura; CBC/CMP solo cuando exista la vista/pregunta de seguimiento. Cognición requiere su propio protocolo y acceso; no se resuelve descargando ómicas.

Antes de cada adquisición, responder: qué decisión mejora, qué variable falta, si el conjunto contiene esa variable con resolución suficiente, cómo se separa del usuario real y qué prueba nueva habilita. Si no hay respuesta concreta, la descarga se pospone.
