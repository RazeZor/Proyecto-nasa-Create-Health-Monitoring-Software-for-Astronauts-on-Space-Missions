# Plan de correcciones tras la auditoría del 14/11/2026

Este plan cierra las diferencias entre el repositorio y el [informe técnico](./VIGA-informe-tcnico-para-el-reto-Health-Monitoring-Software-NASA-Space-Apps-2026.md). Complementa a [PLAN-IMPLEMENTACION-ETAPAS.md](./PLAN-IMPLEMENTACION-ETAPAS.md), que describe la construcción inicial. El envío cierra el **domingo 15 de noviembre a las 23:59**.

## Estado al 15/11/2026

| Etapa | Estado |
| --- | --- |
| 1. Datos reales publicados | Hecha en local (ingesta de las cuatro fuentes y paneles `mision-real` y `mision-vigia`). Falta copiar el gold al servidor |
| 2. Informe al nivel del código | Hecha, con las cifras definitivas |
| 3. Motor y simulador según el informe | Hecha: línea base de §5.2, reglas de §5.1 y §5.4, protocolo de §5.5 y barrido |
| 4. Entorno real al motor | Hecha. Se añadió el modo real (solo lo que el tripulante ingresa) junto al modo demo |
| 5. Escalamiento rojo real | Hecha |
| 6. Sin conexión | Hecha (service worker, manifiesto, copia local del catálogo y cola). Falta la prueba manual con la red cortada en el sitio público |
| 7. Inglés e i18n | Hecha: interfaz (435 textos), fichas de indicador, perfiles y recordatorios |
| 8. Cierre y envío | Tests, lint y contexto en verde; README en inglés. Faltan el despliegue, la prueba de humo en el sitio público, las medidas con personas, el video y el formulario |

Cifras definitivas (500 + 500 misiones, semilla 2026): deriva A1 detectada en el 99,8 % de las misiones a los 8 días de mediana; 17,8 % a mitad de intensidad; A2 y A3 al 100 %; el umbral fijo de 91 lpm no se disparó; falsas alarmas por tripulante y semana de 0,0003 (días 1 a 14) y 0,000 (días 15 a 30).

Enlaces directos tras el despliegue: `/?modo=demo&lang=en` abre el escenario de demostración en inglés.

## Cómo leerlo

- Las etapas están en orden de prioridad. Cada una tiene una rama propia, los archivos que toca, los tests que la prueban y un criterio de salida.
- Hay tres líneas de corte. Si el tiempo no alcanza, se entrega hasta la línea que se haya cerrado y se aplica el **plan B** de cada etapa pendiente: retirar del informe, del resumen y del video lo que el código no hace (regla de coherencia de la sección 7.1 del informe).
- Regla para todas las cifras: se publica lo que dé el código. No se ajustan parámetros para recuperar un número del informe.

| Corte | Etapas | Qué garantiza |
| --- | --- | --- |
| Mínimo para enviar | 1, 2 y 8 | La demo pública muestra datos reales y ningún texto afirma algo falso |
| Entrega sólida | 3, 4 y 5 | El motor cumple el informe, el entorno real entra al razonamiento y el rojo escala de verdad |
| Entrega completa | 6 y 7 | Funciona sin conexión y está en inglés |

Las etapas 3, 4, 5, 6 y 7 tocan archivos distintos y pueden repartirse entre personas. La 4 y la 5 dependen de que la 3 esté fusionada.

## Qué encontró la auditoría

| # | Hallazgo | Etapa que lo cierra |
| --- | --- | --- |
| H1 | El simulador implementa otro protocolo que la sección 5.5 y las cifras del informe no se reproducen (11 días de mediana frente a 6; 59,6 % frente a 79 %) | 2 (texto) y 3 (código) |
| H2 | El motor usa como referencia el mismo desplazamiento que inyecta el generador; no existe la línea base en vuelo de la sección 5.2 | 3 |
| H3 | El CO2 y la tormenta que ve el motor son sintéticos; los datos reales solo se muestran en el panel | 4 |
| H4 | El sitio desplegado no tiene gold: `/paneles` devuelve `[]` y `/simulacion/kpi` da 404 | 1 |
| H5 | No hay service worker ni manifiesto y la app se bloquea sin la API | 6 |
| H6 | La web nunca llama a `POST /alertas`; el aviso "enviado automáticamente" es solo visual | 5 |
| H7 | Reglas distintas de las secciones 5.1 y 5.4: sin ámbar de capa A, la capa B alerta en adaptación, B y C dan rojo, el CO2 sale como rojo individual, `escalada_auto` solo vale en tormenta | 3 |
| H8 | Interfaz solo en español con textos literales; README sin arranque ni inglés; el informe nombra archivos y librerías que no existen | 7 y 8 |

---

## Etapa 1. Publicar los datos reales en el sitio

**Rama:** no requiere (operación de datos). **Cierra:** H4. **Esfuerzo:** 1 hora.

El gold se genera en local y se copia al servidor, igual que el código.

1. Ingerir las cuatro fuentes en `pipelines/datalake`:
   - `python index.py ingest goes`
   - `python index.py ingest donki startDate=2024-05-09 endDate=2024-05-14`
   - `python index.py ingest eda mision=RR-1 start=2014-09-21T00:00:00Z end=2014-09-26T00:00:00Z`
   - `python index.py ingest radlab` con la consulta de la ventana del escenario (`2011-11-12` a `2011-11-17`) **acotada por instrumento**: la consulta sin filtro dio timeout en la auditoría.
2. Ajustar la ventana de GOES de [mision-vigia.json](../pipelines/reanclaje/escenarios/mision-vigia.json) a las fechas de la ingesta de hoy. El servicio de GOES solo guarda 24 horas, así que las fechas fijas del escenario caducan.
3. En `pipelines/reanclaje`: `python index.py panel escenarios/mision-vigia.json` y `python index.py simular`.
4. Copiar `pipelines/datalake/data/gold/` al servidor y reiniciar `vigia-api`.
5. Guardar `manifest.json` como evidencia de la prueba en vivo (sección 3.3 del informe).

**Criterio de salida:** `https://vigia.smoraleslo.dev/vigia-api/paneles` lista `mision-vigia`, `/simulacion/kpi` responde 200 y la pantalla Entorno muestra dosis, protones, cabina y eventos DONKI con su fecha real.

---

## Etapa 2. Poner el informe y los textos de entrega al nivel del código

**Rama:** `docs/informe-coherente`. **Cierra:** H1 y H8 en el texto. **Esfuerzo:** 1 a 2 horas.

Es la red de seguridad: se hace ya, con el código de hoy, y se vuelve a pasar al final con las cifras definitivas (etapa 8).

1. **Cifras.** Reemplazar en el resumen ejecutivo, las secciones 5.5, 6.3 y 8.3 y el guion del video los valores que no salen de `kpi.json`. Con el código actual: 11 días de mediana, 59,6 % a mitad de intensidad, 0,0 y 0,0003 falsas alarmas. Quitar el 1,6 % de "alerta por azar", que no se calcula.
2. **Protocolo.** Describir en la sección 5.5 las anomalías que el simulador inyecta de verdad, o marcarlas como pendientes de la etapa 3.
3. **Límite del motor.** Añadir en "Límites de estos resultados" que la referencia en vuelo usa la curva de adaptación supuesta y que por eso las falsas alarmas son optimistas. Se retira cuando cierre la etapa 3.
4. **Nombres y stack.** Cambiar `vigia_ingesta.py` por `pipelines/datalake/index.py`, `vigia_simulacion.py` por `pipelines/reanclaje/simulacion.py` y `resultados/kpi.json` por `gold/kpi.json`. En la sección 4.3: Next.js, FastAPI con SQLite y `localStorage`; el almacén cifrado pasa a la hoja de ruta. EDA entra por su API, no por `eda_manual/`.
5. **Afirmaciones sin código.** Retirar "el motor de referencia ya calcula cuándo debe ofrecerse la PVT-B" y el uso de Inspiration4 como dato integrado (queda como fuente citada).
6. **Funciones imprescindibles que hoy no se cumplen** (sin conexión, escalamiento rojo, reglas con contexto sobre datos reales): dejarlas marcadas y resolverlas en la etapa 8 según lo que haya llegado.

**Criterio de salida:** ninguna cifra ni función del resumen, el pitch y el video contradice lo que hace `main`.

---

## Etapa 3. Motor y simulador según las secciones 5.1, 5.2 y 5.5

**Rama:** `fix/motor-segun-informe`. **Cierra:** H1, H2 y H7. **Esfuerzo:** 5 a 7 horas. Es la etapa de mayor valor para el criterio Validity.

Cada regla se cambia a la vez en [simulacion.py](../pipelines/reanclaje/simulacion.py) (`evaluar_tripulante`) y en [engine.ts](../packages/engine/engine.ts). El test de paridad sigue siendo la garantía.

### 3.1 Línea base de tierra a vuelo (sección 5.2)

- Quitar del detector los desplazamientos de `SUPUESTOS`. Quedan solo en el generador.
- Por indicador, la referencia del día *d* es la mezcla del informe: `w = 0` si `d <= 14` o la ventana en vuelo tiene menos de 5 lecturas; si no, `w = min(1, (d - 14) / 7)`. Centro y dispersión se mezclan con ese peso y se aplica el piso `mad_min`.
- Ventana en vuelo: hasta 14 lecturas, desde el día 8, hasta el día `d - 3`. Se excluyen los días en que ese indicador tuvo alerta.
- El reinicio por cambio de instrumento (anexo A.6) pasa a ser un reinicio de esa misma ventana, en lugar del mecanismo aparte de hoy.

### 3.2 Reglas por capa (sección 5.1)

| Capa | Cambio |
| --- | --- |
| A | Rojo si un parámetro puntúa 3 o la suma es 5 o más. **Ámbar si la suma es 3 o 4.** Todo rojo de capa A lleva `escalada_auto: true`, haya o no tormenta |
| B | Días 1 a 14: se calcula y se devuelve como informativa, no alerta. Desde el 15, siempre ámbar. Se quita el margen de 1,15 y el rojo por `umbral + 1,5` |
| C | Solo frecuencia cardíaca al alza y sueño y ánimo a la baja. Siempre ámbar. Al emitir, la suma vuelve a cero para poder alertar de nuevo |
| Contexto | CO2 **mayor** que 3 mmHg con cefalea: alerta de entorno, ámbar, con `ambito: "tripulacion"` y sin datos personales. Flujo de 10 pfu o más: modo tormenta el mismo día. Ninguna de las dos escala como médica |

- La salida gana dos campos: `ambito` (`personal` o `tripulacion`) e `informativa` (verdadero en adaptación). Se actualizan [caso-referencia.schema.json](../packages/schemas/caso-referencia.schema.json) y `vocabulario.json`.
- El motor deduce la tormenta del flujo del día (`flujo_protones_10mev_pfu >= 10`) en vez de recibir un indicador ya calculado.
- Decisión abierta: el CUSUM combinado de sueño y ánimo no está en el informe. Se mide con y sin él en el barrido del punto 3.4 y se conserva solo si mejora la detección sin subir las falsas alarmas; en ese caso se documenta en la sección 5.1.
- Glucosa en la capa B y la corrección metrológica de la capa A quedan fuera: el informe ya declara la segunda como pendiente y la primera se declara igual.

### 3.3 Protocolo de simulación (sección 5.5)

- **A1:** sueño −0,20 h por día, frecuencia cardíaca +1 lpm por día y ánimo −0,15 por día, en un tripulante, días 18 a 27.
- **A2:** máximo horario de CO2 de 4,6 mmHg el día 12; dos tripulantes reportan cefalea.
- **A3:** flujo de 200 pfu los días 22 y 23.
- 500 misiones con las tres anomalías y 500 de control con la semilla 2026; repetición con la semilla 2027.
- `kpi.json` publica: detección por anomalía, mediana de días hasta la alerta de A1, A1 a mitad de intensidad, falsas alarmas por tripulante y semana (días 1 a 14 y 15 a 30), alerta por azar en la ventana de A1 en misiones de control, y el comparador de umbral fijo de 91 lpm.

### 3.4 Parámetros y fixture

- Añadir a `index.py` el comando `barrer`: recorre `k` y `h` sobre misiones de control y deja la tabla en `gold/barrido.json`. Es el origen declarado de `k = 0,75` y `h = 5`; si el barrido da otros valores, se cambian en el código y en el informe.
- Regenerar `packages/engine/fixtures/caso-referencia.json` y `apps/web/lib/vocabulario.json`.

### Tests

- `test_simulacion.py`: una prueba por regla del punto 3.2 y por anomalía del 3.3; A2 produce una sola alerta de entorno y ninguna médica; ninguna alerta B o C con `informativa: false` antes del día 15.
- `packages/engine`: paridad con el fixture nuevo; ventana en vuelo (rezago de 3 días, exclusión de días con alerta, menos de 5 lecturas); ámbar de capa A con suma 3; rojo de capa A con `escalada_auto` sin tormenta.

**Criterio de salida:** todos los tests en verde, `kpi.json` regenerado y las tres sondas de la auditoría dan lo que dice el informe (suma NEWS2 de 3 da ámbar; FC alta los días 9 y 10 no alerta; SpO2 de 90 escala).

**Plan B:** si no llega la línea base 3.1, se entregan 3.2 y 3.3 y se mantiene en el informe la advertencia del punto 3 de la etapa 2.

---

## Etapa 4. El entorno real entra al motor

**Rama:** `feat/entorno-real-al-motor`. **Cierra:** H3. **Depende de:** 1 y 3. **Esfuerzo:** 3 horas.

1. **API.** En [rutas_dashboard.py](../apps/api/rutas_dashboard.py), `historial` arma `entorno_diario` desde `gold/panel-mision-vigia.json` cuando existe: por día de misión, CO2 en ppm (máximo del promedio horario), flujo máximo de protones en ≥10 MeV y eventos SEP de DONKI. Cada día lleva `naturaleza: "Real"`, la fuente y la fecha real. Sin gold, se usa el entorno simulado y se rotula `Simulado`. La API lee el JSON publicado; no importa el pipeline.
2. **Conversión por perfil.** [apps/web/lib/engine.ts](../apps/web/lib/engine.ts) recibe el perfil activo y convierte ppm a mmHg con su presión de cabina antes de llamar al motor. Así cambiar de perfil cambia la alerta, que es lo que defiende la sección 3.3.
3. **Modo tormenta con DONKI.** Un día con evento SEP real reanclado activa el modo tormenta; GOES aporta la severidad cuando hay flujo de esas fechas. Con esto la frase del pitch "un evento solar real de DONKI activa el modo tormenta" pasa a ser cierta.
4. **Anomalías de demostración.** La cabina real de RR-1 queda en unos 2,2 mmHg y el GOES de hoy está en calma, así que con datos reales ninguna regla de contexto se dispara. Se añade un interruptor de demo que inyecta el pico de CO2 del día 12, rotulado `Simulado` en la alerta y en la gráfica, como prevé la tabla de la sección 3.4. Opcional: buscar en EDA una misión con promedio horario sobre 3 950 ppm y usar esa ventana real.
5. **Lecturas marcadas.** Las lecturas tomadas en un día de tormenta conservan la marca (caso de uso 2 del informe).

**Tests:** `test_api_dashboard.py` (con gold y sin gold); `apps/web/lib/engine.test.ts` (la misma lectura en ppm alerta en estación y no en superficie; día con SEP activa la tormenta).

**Criterio de salida:** al tocar una alerta de entorno se ve la fuente y la fecha real, y el CO2 y la tormenta del motor coinciden con los de la pantalla Entorno.

**Plan B:** quitar del resumen y del pitch que cada lectura "se cruza con el entorno medido" y decir que el entorno real se muestra junto al estado.

---

## Etapa 5. Escalamiento rojo real y privacidad

**Rama:** `feat/escalamiento-real`. **Cierra:** H6. **Depende de:** 3. **Esfuerzo:** 3 horas.

El backend ya cumple la sección 5.4; falta conectarlo.

1. **Enviar las alertas.** Nuevo `apps/web/lib/alertas-sync.ts` con el mismo patrón que `sincronizar.ts`: las alertas de los días con registro del usuario se envían a `POST /tripulantes/{id}/alertas` y se marcan como enviadas en el almacén local. Sin red quedan pendientes y se reintentan. Comprobar antes que reenviar una alerta no la duplica; si la tabla no tiene clave única, añadirla en una migración.
2. **Decir la verdad en pantalla.** En [alerts-view.tsx](../apps/web/components/alerts/alerts-view.tsx), "enviado automáticamente" aparece solo en rojos de capa A que tienen `escalamiento_id`. Si aún no salió, dice "pendiente de envío". Las alertas de entorno muestran "compartida con la tripulación".
3. **Transparencia.** El diálogo muestra el contenido real de `GET /tripulantes/{id}/escalamientos` (indicador, valor, hora y tramo) y permite añadir contexto una vez con `POST /escalamientos/{id}/contexto`.
4. **Vista del oficial médico.** El rol `cmo` lee `GET /escalamientos` en lugar de filtrar las alertas del astronauta.
5. **Tres días en ámbar.** Tras tres días seguidos en ámbar en el mismo indicador, la alerta recomienda compartir, sin hacerlo.

**Tests:** `alertas-sync.test.ts` (envía una vez, reintenta, no duplica); `test_api_registro.py` para el reenvío.

**Criterio de salida:** registrar SpO2 de 90 crea un escalamiento visible en la vista del oficial médico con solo el dato mínimo, y un ámbar no sale del dispositivo.

**Plan B:** rotular el aviso como "simulado" y retirar "avisa sola al oficial médico" del video.

---

## Etapa 6. Funcionar sin conexión

**Rama:** `feat/sin-conexion`. **Cierra:** H5. **Esfuerzo:** 3 a 4 horas.

1. **Catálogo en caché.** [catalogo.ts](../apps/web/lib/catalogo.ts) guarda el último catálogo válido en el almacén local. Si la API no responde, `AppProvider` arranca con esa copia y muestra "sin enlace" en vez de la pantalla de error. El panel de Entorno hace lo mismo con el último panel.
2. **Service worker.** `apps/web/public/sw.js` escrito a mano, sin dependencias: caché de la carcasa y de los recursos estáticos, y red con respaldo en caché para los `GET` de `/vigia-api`. Los `POST` no se interceptan: ya tienen cola propia. Se registra desde `layout.tsx`.
3. **Manifiesto.** `app/manifest.ts` con nombre, iconos y `display: standalone`.
4. **Estado del enlace.** La etiqueta de la barra superior deja de ser fija: muestra "en línea" o "sin enlace · N registros pendientes" y sincroniza al volver la red.
5. **Dependencia externa.** Quitar `@vercel/analytics` si no se usa: una app de a bordo no debe llamar a servicios externos.

**Prueba manual:** abrir la app, cortar la red en las herramientas del navegador, recargar, completar un registro, ver el estado y las alertas, restaurar la red y comprobar que el registro sube.

**Criterio de salida:** la prueba manual pasa en el sitio desplegado. Se anota el resultado como KPI "funciones disponibles sin conexión".

**Plan B:** quitar la etiqueta "Funciona sin conexión" de la app y la frase del resumen, el video y el pitch; decir "guarda en el dispositivo y sincroniza cuando hay enlace", que hoy sí es cierto para los registros.

---

## Etapa 7. Inglés e i18n

**Rama:** `feat/i18n-web`. **Cierra:** H8. **Esfuerzo:** 3 horas.

1. Mover los textos de [strings.ts](../apps/web/lib/strings.ts) y los literales de `catalogo.ts` y del formulario a `packages/i18n/locales/es.json` con claves `web.<area>.<clave>`. Los textos con parámetros usan interpolación.
2. `strings.ts` conserva la forma del objeto `S`, pero lo arma con `t()`, para no tocar los componentes.
3. Traducir a `en.json` y añadir un selector de idioma en la barra superior. Las fichas siguen en español si no hay traducción, como permite la regla del repositorio.
4. `python -m unittest discover -s packages/i18n` valida que ninguna clave de `en.json` falte en `es.json`.

**Criterio de salida:** la app completa se puede recorrer en inglés y no quedan textos visibles como literales.

**Plan B:** la guía solo exige inglés en el formulario y subtítulos en el video. Se entrega la app en español y se dice así.

---

## Etapa 8. Cierre, despliegue y envío

**Rama:** `docs/entrega`. **Esfuerzo:** 3 horas. **Empezar a más tardar el domingo a las 18:00.**

1. **Calidad.**
   - Tests de Python y de TypeScript en verde, `ruff`, `contextgen.py --check` y `--lint`.
   - Actualizar los puntos clave de los `MODULE.md` tocados (`engine`, `reanclaje`, `api`, `web`).
   - Arreglar `test_migrar_concurrente_no_falla`, que en Windows no cierra la conexión antes de borrar el temporal.
   - Decidir si `apps/web/AGENTS.md`, hoy sin seguimiento, entra al repositorio.
2. **Datos y cifras definitivas.** Repetir la etapa 1 con el motor nuevo (`simular` y `panel`) y volver a pasar la etapa 2 con el `kpi.json` final.
3. **Regla de coherencia.** Por cada etapa que no cerró, aplicar su plan B en el informe, el resumen de la sección 8.2, el guion y el video.
4. **README en inglés:** qué es, enlace a la demo y al video, arranque en tres comandos, qué datos son reales y cuáles simulados, límites declarados y uso de IA.
5. **Despliegue.** Copiar el código y el gold al servidor, `next build` con `VIGIA_API_INTERNA` definida, reiniciar `vigia-api` y `vigia-web`.
6. **Prueba de humo en el sitio público:** registro diario, alerta ámbar, alerta roja con escalamiento, panel de entorno con fuentes, reporte en cola y respuesta de tierra, cambio de perfil, y la prueba sin red si cerró la etapa 6.
7. **Medidas con personas** (sección 6.3): tiempo del registro y, si hay cinco voluntarios, la escala SUS. Se reporta la cifra o se omite.
8. **Envío.** Video de 30 segundos o 7 diapositivas en inglés, formulario con el texto de la sección 8.2 actualizado y la declaración de uso de IA.

**Criterio de salida:** formulario enviado, enlaces públicos abiertos en una ventana privada y repositorio con `main` en verde.

---

## Calendario propuesto

| Cuándo | Qué |
| --- | --- |
| Sábado, noche | Etapas 1 y 2. Arrancar la 3 |
| Domingo, mañana | Cerrar la 3. En paralelo, 6 y 7 si hay más personas |
| Domingo, primera tarde | Etapas 4 y 5 |
| Domingo, 18:00 | Congelar funciones. Etapa 8 |
| Domingo, 22:00 | Envío, con margen antes de las 23:59 |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La línea base nueva empeora las cifras | Se publican igual, con la segunda semilla y la prueba a mitad de intensidad; un número honesto vale más que uno que un juez no pueda reproducir |
| RadLab o EDA no responden el domingo | El gold de la etapa 1 queda guardado desde hoy con su huella |
| El GOES de 24 horas no trae tormenta | El modo tormenta se apoya en el evento real de DONKI (etapa 4) |
| El service worker sirve una versión vieja durante la demo | Versión de caché atada al despliegue y botón de recarga forzada; probar en ventana privada |
| Conflictos entre ramas paralelas | La 3 se fusiona primero; `git fetch origin && git merge origin/main` antes de cada PR, como exige AGENTS.md |
