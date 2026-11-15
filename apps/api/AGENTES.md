# Guía de la API para agentes

API de solo lectura sobre el gold del ETL (`pipelines/reanclaje`). El contrato exacto y siempre al día está en `GET /openapi.json` (y `/docs` para personas); esta guía explica lo que el esquema no dice. Arranque: `uvicorn main:app --port 8000` desde `apps/api`.

## Cómo usarla

1. `GET /escenarios` o `GET /paneles` para saber qué nombres existen. Un nombre desconocido da 404.
2. Para la pantalla de entorno usa el panel; para análisis, el escenario.
3. Pide solo lo que necesitas: `/paneles/{nombre}/dosis` en vez del panel completo, y `/escenarios/{nombre}/serie?variable=flux&dia_mision=22` en vez del escenario entero (la serie tiene cientos de filas).

| Endpoint | Devuelve |
| --- | --- |
| `GET /salud` | `{"estado": "ok"}` |
| `GET /escenarios` | lista de nombres |
| `GET /escenarios/{nombre}` | `escenario`, `ventanas`, `serie5min`, `diario`, `eventos` (filtros: `fuente`, `variable`, `dia_mision`) |
| `GET /escenarios/{nombre}/serie` | puntos de 5 min (mismos filtros) |
| `GET /escenarios/{nombre}/diario` | resumen por día de misión (mismos filtros) |
| `GET /paneles` | lista de nombres (los del escenario del que salen) |
| `GET /paneles/{nombre}` | `limites`, `perfiles_presion_mmhg`, `ventanas`, `aviso`, `dosis`, `protones`, `cabina`, `eventos` |
| `GET /paneles/{nombre}/{seccion}` | `dosis` (objeto o null), `protones`, `cabina` o `eventos` |

Errores: 404 = el ETL no publicó ese nombre como ese tipo (un escenario no se pide como panel, ni al revés); 422 = parámetro inválido (por ejemplo una sección que no existe); 500 = el archivo gold no coincide con su SHA-256 del manifiesto: **no uses esos datos** y avisa.

## Cómo leer los datos (lo que cambia una conclusión)

- **Tiempo:** `t_mision` es `D022T00:05:00` = día de misión 22, 00:05. `t_real` es la hora UTC real del dato. El origen de la línea de misión es sintético.
- **Ventanas mezcladas:** que series de fechas reales distintas (por ejemplo RadLab de 2011 y GOES de 2026) caigan en el mismo día de misión es decisión del escenario, no un hecho observado. Mira `ventanas` y `aviso` antes de correlacionar fuentes.
- **Dosis:** `dosis.tipo` es `equivalente` (µSv) o `absorbida` (µGy). Con `absorbida`, `orientativa` es `true`: se supone 1 µGy = 1 µSv, una cota inferior, así que la comparación con el límite de 600 mSv es solo indicativa. Solo ALTEA-Survey (ISS, 2010 a 2012) da dosis equivalente.
- **Cobertura:** `dosis.por_dia[].cobertura` es la fracción del día con datos (0 a 1). Con 0.042 (una hora de datos) la dosis del día es parcial y **no** es el total del día.
- **`porcentaje_limite_carrera`** ya es un porcentaje (0.1521 = 0.1521 %), sobre 600 mSv.
- **Protones:** `max_pfu` es el máximo del día por serie y satélite (`G18 >=10 MeV`). `modo_tormenta` es `true` si la serie de ≥10 MeV llega a 10 pfu.
- **CO2:** `co2_mmhg_por_perfil` convierte ppm a presión parcial con la presión total de cada perfil (estación 760, tránsito 760, superficie 424 mmHg). El límite es 3 mmHg de promedio en 1 h (`co2_sobre_limite_por_perfil`). No compares ppm con un umbral fijo fuera de la ISS.
- **`diario`:** `bins` es cuántos pasos de 5 min tuvieron datos, de 288 posibles. `max_prom_horario` es el máximo del promedio horario (solo CO2).
- **Secciones vacías:** `protones`, `cabina` y `eventos` pueden ser listas vacías y `dosis` puede ser `null` si el escenario no incluye esa fuente. Vacío no significa «sin riesgo»: significa «sin datos».
- **`naturaleza`:** todo dato medido es `Real`. El calendario de misión es escenario y no lo genera el ETL.

## Ejemplos de respuesta reales

Salidas reales de esta API sobre el gold local (escenarios `dosis-equivalente`, con RadLab ALTEA-Survey, y `panel-demo`, con RadLab DosTel, GOES y EDA RR-1). Se recortaron las listas largas. Los nombres de tu gold pueden ser otros: pídelos con `GET /escenarios` y `GET /paneles`.

`GET /escenarios` y `GET /paneles`
```json
["dosis-equivalente", "ejemplo-radlab-eda", "panel-demo"]
["dosis-equivalente", "panel-demo"]
```

`GET /paneles/dosis-equivalente/dosis`: dosis equivalente de un día completo, sin `orientativa`.
```json
{"tipo": "equivalente", "unidad": "µSv", "orientativa": false, "series": ["ALTEA-Survey"],
 "por_dia": [{"dia_mision": 22, "dosis": 912.7941, "acumulada": 912.7941, "cobertura": 1.0}],
 "porcentaje_limite_carrera": 0.1521}
```
Ese 0.1521 es el porcentaje sobre 600 mSv. El día supera lo típico del informe (0.2 a 0.5 mSv/día); es un día y los datos son preliminares.

`GET /paneles/panel-demo/protones` (primer elemento)
```json
[{"dia_mision": 22, "serie": "G18 >=10 MeV", "max_pfu": 0.3453, "modo_tormenta": false}]
```

`GET /paneles/panel-demo/cabina`: CO2 en ppm y en mmHg por perfil, con el límite de 3 mmHg.
```json
[{"dia_mision": 22, "mision": "RR-1", "co2_ppm_max": 2886.0, "co2_ppm_promedio_horario_max": 2879.9,
  "co2_mmhg_por_perfil": {"estacion": 2.189, "transito": 2.189, "superficie": 1.221},
  "co2_sobre_limite_por_perfil": {"estacion": false, "transito": false, "superficie": false},
  "humidity_iss_max": 70.0, "temperature_iss_max": 26.8}]
```

`GET /escenarios/panel-demo/serie?fuente=goes&dia_mision=22` (primeras 2 filas): cada punto trae las dos horas.
```json
[{"t_mision": "D022T01:55:00", "t_real": "2026-11-13T16:55:00Z", "fuente": "goes", "serie": "G18 >=10 MeV",
  "variable": "flux", "valor": 0.240860253572464, "n": 1, "naturaleza": "Real"},
 {"t_mision": "D022T01:55:00", "t_real": "2026-11-13T16:55:00Z", "fuente": "goes", "serie": "G18 >=100 MeV",
  "variable": "flux", "valor": 0.22888292372226715, "n": 1, "naturaleza": "Real"}]
```

`GET /escenarios/panel-demo/diario?fuente=radlab`: `bins` 12 de 288 = una hora de datos, la dosis es parcial.
```json
[{"dia_mision": 22, "fuente": "radlab", "serie": "DosTel1", "variable": "absorbed_dose_rate",
  "max": 8.195199333333333, "bins": 12, "dosis": 4.458305305555555},
 {"dia_mision": 22, "fuente": "radlab", "serie": "DosTel2", "variable": "absorbed_dose_rate",
  "max": 7.384952333333334, "bins": 12, "dosis": 4.496398388888889}]
```

`GET /perfiles`: catálogo oficial de los 5 perfiles de misión (`packages/schemas/perfiles.json`) con `presion_cabina_mmhg`, `latencia_min` y `gravedad`.

`GET /simulacion/caso-referencia` y `GET /simulacion/kpi`: caso determinista (semilla 2026) y KPI agregados de 500+500 misiones (§5.5), verificados por SHA-256 sin mezclarse en `/escenarios` ni `/paneles`.

Errores
```text
GET /paneles/nada                -> 404 {"detail": "no existe el gold «nada»; corre el ETL de pipelines/reanclaje"}
GET /paneles/panel-demo/nada     -> 422 (detail[0].msg: "Input should be 'dosis', 'protones', 'cabina' or 'eventos'")
```
El mensaje 404 sale en el idioma de `VIGIA_LANG` (español por defecto).

## Registro de la tripulación (almacén SQLite)

Además del gold (solo lectura), la API guarda el registro de la tripulación en SQLite (`VIGIA_DB`, por defecto `apps/api/data/vigia.db`). Antes de usarla: `cd apps/api && python3 -m almacen migrar && python3 -m almacen sembrar` (la semilla crea la misión `demo` con astronauta = 1, oficial médico = 2 y comandante = 3).

**Quién eres:** todas estas rutas llevan la cabecera `X-Tripulante: <id>`. Sin ella, o con un id que no existe: 401. No hay autenticación real (prototipo local).

**Privacidad:** lecturas, síntomas, línea base y reportes solo los ve y escribe su dueño (otro tripulante: 403). Las alertas completas solo las ve su dueño. Si pides las de otro, recibes únicamente el dato mínimo de las que se escalaron a ti (`indicador`, `valor`, `t_real`, `tramo`, más los ids), sin explicación ni capa; verde y ámbar nunca. Cada vez que pides las alertas de otro queda una fila `lectura_ajena` en `auditoria`.

| Endpoint | Qué hace |
| --- | --- |
| `POST /tripulantes/{id}/lecturas` | Guarda `{indicador, valor, t_real, origen?, metodo?, naturaleza?}` → 201 `{id}`. Reenviar la misma da el mismo `id` |
| `GET /tripulantes/{id}/lecturas` | Lecturas propias; filtros `indicador`, `desde`, `hasta` |
| `POST /tripulantes/{id}/sintomas` y `GET` | Síntomas `{codigo, gravedad 1 a 3, t_real}`; `codigo` es uno de cefalea, nausea, mareo, vision, erupcion (otro: 422) |
| `PUT /tripulantes/{id}/linea-base/{indicador}/{origen}` y `GET` | Mediana y MAD de `tierra` o `vuelo` (404 si no hay) |
| `POST /tripulantes/{id}/alertas` | Registra una alerta del motor → `{id, escalamiento_id}` |
| `GET /tripulantes/{id}/alertas` | Con tu id: tus alertas completas. Con el de otro: solo el dato mínimo de las que te escalaron |
| `GET /escalamientos` | Tu bandeja: avisos rojos escalados a ti, con `contenido` y `contexto_astronauta` (no deja `lectura_ajena`) |
| `GET /tripulantes/{id}/escalamientos` | Transparencia: qué se envió sobre ti, a quién y con qué contenido |
| `POST /escalamientos/{escalamiento_id}/contexto` | `{texto}`: el afectado añade contexto una sola vez (otro: 403; segunda vez: 422) |
| `POST /tripulantes/{id}/reportes` y `GET` | Reportes a tierra con `retardo_min` de 0 a 22 |
| `POST /reportes/avanzar` | `{ahora}` → entrega los reportes que ya llegaron; `{entregados: n}`. El servidor ya lo hace solo cada 5 s con su hora real (`VIGIA_RELOJ_SEG`); úsalo para forzar otra hora |
| `POST /reportes/{reporte_id}/respuesta` | `{respuesta, t_real}` sobre un reporte entregado |

Indicadores válidos: `presion_arterial_sistolica`, `spo2`, `temperatura_central`, `frecuencia_cardiaca_reposo`, `sueno`, `estado_animo`, `glucosa`, `masa_corporal`. `t_real` siempre en UTC con el formato exacto `YYYY-MM-DDTHH:MM:SSZ` (con ceros: `10:00:00Z`, no `10:0:0Z`); los números van como JSON numérico, no como texto (`97`, no `"97"`); `t_mision` lo calcula el servidor (null antes del día 1 de la misión). Las alertas, los escalamientos y la auditoría son de solo adición.

**Escalamiento:** una alerta con `capa: "A"` y `nivel: "rojo"` escala al oficial médico de la misión (al comandante si el afectado es el oficial). Solo viaja `{indicador, valor, t_real, tramo}`. Sin consentimiento previo (`escalamiento_rojo`) o sin destinatario, `escalamiento_id` es `null` y se anota `escalamiento_omitido` en la auditoría: una alerta roja sin escalar no significa que no haya riesgo.

Ejemplos reales (misión `demo`, tripulante 1):

```text
POST /tripulantes/1/lecturas  (X-Tripulante: 1)  {"indicador":"spo2","valor":95,"t_real":"2026-11-14T08:00:00Z"}
-> 201 {"id": 1}
GET  /tripulantes/1/lecturas  (X-Tripulante: 1)
-> [{"id":1,"tripulante_id":1,"indicador":"spo2","valor":95.0,"t_real":"2026-11-14T08:00:00Z","t_mision":"D001T08:00:00","origen":"manual","metodo":null,"naturaleza":"Simulado"}]

POST /tripulantes/1/alertas  (X-Tripulante: 1)  {"indicador":"spo2","capa":"A","nivel":"rojo","valor":90,"t_real":"2026-11-14T09:00:00Z","explicacion":"SpO2 en tramo extremo","regla_version":"1","tramo":"3 puntos"}
-> 201 {"id": 1, "escalamiento_id": 1}        # a la ámbar de capa B: {"id": 2, "escalamiento_id": null}
GET  /tripulantes/1/alertas  (X-Tripulante: 2)   # oficial médico: solo el dato mínimo
-> [{"escalamiento_id":1,"alerta_id":1,"tripulante_id":1,"indicador":"spo2","valor":90.0,"t_real":"2026-11-14T09:00:00Z","tramo":"3 puntos"}]
GET  /tripulantes/1/alertas  (X-Tripulante: 3)   # comandante: no es destinatario
-> []
GET  /tripulantes/1/lecturas  (X-Tripulante: 2)
-> 403 {"detail": "no puedes ver ni modificar datos de otro tripulante"}
```

## Tablero: fichas, referencia y datos de demo

La app solo conoce esta API. Lo que todavía no sale de una fuente real lo sirve el backend rotulado `Simulado` (archivos en `apps/api/demo/` y el caso de referencia del simulador), nunca la app.

| Endpoint | Devuelve |
| --- | --- |
| `GET /fichas` | todas las fichas de indicadores (`packages/schemas/fichas`), en el orden de `index.json` |
| `GET /fichas/{id}` | una ficha; id fuera del índice: 404 |
| `GET /entorno/referencia` | `limite_carrera_msv`, `co2_limite_mmhg`, `umbral_protones_pfu`, `fuentes`, `dosis_previa_carrera_msv` (simulada) |
| `GET /tripulantes/{id}/historial?modo=real\|demo` | (propio; el oficial médico lo lee de cualquier tripulante de su misión y queda en la auditoría como `lectura_ajena`; otro, 403) lo que evalúa el motor: `lecturas` por día de misión (días <= 0 = prevuelo) y `entorno_diario`, con `modo`, `dia_actual`, `dias_vuelo`, `escenario_entorno` y `aviso_entorno`. `real` (por defecto): lo que el tripulante ingresó (`naturaleza: Real`; `null` en lo no medido) y el entorno del panel `mision-real`. `demo`: tripulante simulado con anomalías inyectadas (`Simulado`) y el panel `mision-vigia`. En `entorno_diario`: `co2_ppm_max_horario` (real, en ppm: se convierte con la presión del perfil) o `co2_mmhg_max_horario` (simulado), `flujo_protones_10mev_pfu`, `co2_origen` y `flujo_origen` (`naturaleza`, `fuente`, `fecha_real`), `eventos_sep` (DONKI, reales) y `modo_tormenta` |
| `GET /tripulantes/{id}/intradia?modo=real\|demo&dia=N&hasta=HH:MM` | (mismos permisos que `historial`; la lectura de un clínico se audita una vez por hora) lo del tiempo real: `{dia, naturaleza, series}` con `fc_reposo_lpm`, `spo2_pct`, `temp_central_c` y `pas_mmHg` como `[{hora: "HH:MM", valor}]` (hora UTC). `real`: las lecturas `Real` de ese día sin agrupar (por defecto hoy). `demo`: simuladas cada 15 min hasta `hasta` (por defecto ahora) alrededor del valor diario del caso de referencia (día 27), `Simulado` y deterministas |
| `GET /tripulacion` | `[{id, alias, rol}]` de la misión de quien pregunta (para saber quién es el oficial médico). Pide `X-Tripulante` |
| `GET /tripulantes/{id}/recordatorios` | lista de textos del día (simulada) |
| `GET /tripulantes/{id}/mensajes` | hilo con tierra `{id, de, autor, dia, hora, texto}`: ejemplo más las respuestas reales a tus reportes |

Las tres de `/tripulantes/{id}/...` siguen la regla de privacidad del registro (otro tripulante: 403; sin cabecera: 401). `POST /tripulantes/{id}/reportes` acepta además `contenido` (objeto libre: título, resumen, lectura...) y el `GET` lo devuelve. `python3 -m almacen sembrar` también siembra un informe de ejemplo ya respondido.

## Reloj en vivo (Galaxy Watch4, vía smart-monitor)

El reloj no habla con esta API: habla con el servidor de [smart-monitor](https://github.com/smoraleslo/smart-monitor) (otra unidad desplegable, puerto 8765). La API se conecta a su `/live` como un panel más (`puente_reloj.py`), guarda en memoria el último estado de cada tripulante y persiste cada **chequeo guiado válido de un reloj vinculado** como lecturas `frecuencia_cardiaca_reposo` y `spo2` con `origen: sensor`, `metodo: galaxy_watch4:<dispositivo>`, `naturaleza: Real`.

Configuración (variables de entorno; la API carga el `.env` de la raíz del repo al arrancar sin pisar lo ya definido):

| Variable | Efecto |
| --- | --- |
| `SMART_URL` | `/live` de smart-monitor. Si falta, `ws://127.0.0.1:8765/live`: el puente intenta conectar con reintentos (1, 2, 4… 30 s) y expone `configurado: true, conectado: false, error` |
| `SMART_DESACTIVADO=1` | apaga el puente (`configurado: false, desactivado: true`) |
| `SMART_TRIPULANTES` | `"Sebastián=1,Ana=2"`: nombre del reloj → id. Se suma a los vínculos hechos por la API (tabla `reloj_vinculo`) |
| `SMART_AUTOREGISTRO=1` | crea un tripulante nuevo (astronauta, primera misión) por cada nombre desconocido. Apagado por defecto: sin él un reloj sin vincular no escribe nada |
| `SMART_IP_LAN` | IP de esta máquina que se sugiere al reloj en `url_reloj_sugerida` (y `ip_lan`). Úsala cuando el equipo tiene varias redes, por ejemplo un hotspot cerrado para el reloj (`192.168.137.1`) y otro WiFi con internet: sin ella el sistema elige la IP de salida a internet, que el reloj no alcanza |

| Endpoint | Devuelve |
| --- | --- |
| `GET /reloj/estado` | `{configurado, desactivado, conectado, ultima_vez, error, url_live, ip_lan, url_reloj_sugerida, avisos}` del puente; sin datos de nadie. `url_reloj_sugerida` = lo que va en el campo «Servidor» del reloj (`ws://<ip_lan>:8765/watch`, o el host de `SMART_URL` si no es local; null sin IP). `avisos` = avisos del servidor sin tripulante (p. ej. tolerancia rechazada) |
| `GET /tripulantes/{id}/reloj` | `{puente, nombres, vinculado, reloj}`; `nombres` = nombres de reloj que la API asocia al tripulante; `reloj` trae `fc_lpm`, `ultima_lectura`, `recibido_hace_s` (segundos desde que el puente recibió la última lectura, con el reloj del servidor: úsalo para la vigencia, no el `t` del reloj), `serie` (360 puntos), `resumen`, `chequeos` (14), `chequeo_estado` y `chequeo_progreso` (null tras 120 s sin novedades o al desconectarse), `notas` (en vivo + `resumen.notas`, sin repetir), `avisos` |
| `POST /tripulantes/{id}/reloj/vinculo` | `{nombre}` → 201 `{nombre, tripulante_id, t_real}`: «este es mi reloj». 422 si es un nombre por defecto; 409 si otro tripulante ya lo tiene. Repetirlo actualiza la fecha |
| `DELETE /tripulantes/{id}/reloj/vinculo` | quita los vínculos del tripulante (`?nombre=` para uno solo) → `{eliminados}`. No borra lecturas ni toca `SMART_TRIPULANTES` |
| `POST /tripulantes/{id}/reloj/ordenes` | `{tipo: medir_spo2 \| iniciar_chequeo}` → 202; 503 si el puente no está conectado; 422 si el servidor del reloj no conoce al tripulante |

- **Identidad y vínculo:** el reloj identifica a la persona por su nombre (campo «Tripulante» del reloj). Un nombre está vinculado si aparece en `SMART_TRIPULANTES`, en `reloj_vinculo` (ruta de vínculo) o coincide exactamente (sin distinguir mayúsculas) con el `alias` de un tripulante. Solo los relojes vinculados se persisten y se ven en `/tripulantes/{id}/reloj`; los demás solo aparecen en `/reloj/tripulacion` con `vinculado: false`.
- **Nunca se guardan:** los nombres por defecto (`Tripulante XXXX`, patrón `^Tripulante \w{4}$`; `Tripulante previo`; `Sin nombre`) ni los chequeos de un nombre con `relojes_conectados > 1` (dos relojes mezclan instrumentos): en ese caso queda un aviso `{tipo: "puente", codigo: "relojes_duplicados"}` en `avisos` del tripulante.
- **`metodo`:** `galaxy_watch4:<dispositivo>` (`dispositivo` = `gw-` + 8 caracteres del ANDROID_ID, el instrumento según A.6); si el chequeo no trae `dispositivo`, `galaxy_watch4`. Es el mismo formato que usa la app al precargar la FC del reloj, así que un cambio de instrumento solo aparece cuando cambia el reloj de verdad.
- **Privacidad:** las rutas `/tripulantes/{id}/reloj...` siguen la regla del registro (otro tripulante: 403; sin cabecera: 401).
- **Qué llega al motor:** solo la FC en reposo y el SpO₂ del chequeo, nunca una lectura suelta de 1 Hz (anexo A.6: el ejercicio no debe disparar la capa A). El resto (`serie`, `resumen`, sueño) es para mostrar, y el sueño es experimental.
- Un 202 en una orden solo dice que salió hacia el servidor del reloj: si el reloj no está conectado, el aviso llega después en `avisos`.
- El estado en memoria se pierde al reiniciar la API; al reconectar, `history` reemplaza la serie (sin duplicados por `t`). Las escrituras en SQLite van en un hilo aparte (`asyncio.to_thread`) para no frenar el bucle del WebSocket.

Más rutas del reloj:

| Endpoint | Devuelve |
| --- | --- |
| `GET /reloj/tripulacion` | `[{nombre, conectado, relojes_conectados, ultima_lectura, chequeo_hoy, nombre_por_defecto, vinculado, tripulante_id}]`: dato mínimo para coordinar, sin valores fisiológicos. `chequeo_hoy`: `true` válido, `false` fallido, `null` sin hacer. `vinculado`/`tripulante_id`: a qué tripulante va cada nombre (null = a nadie). Pide `X-Tripulante` |
| `GET /reloj/config` | `{tolerancia, presets}` de movimiento del chequeo (estricta, normal, flexible, personalizada) |
| `PUT /reloj/config` | `{preset, mov_quieto?, mov_inquieto?, mov_sacudida?, max_inquietos_pct?}` → 202 y se aplica a todos los relojes; confirma con el `GET`. Pide `X-Tripulante` |
| `GET /tripulantes/{id}/reloj/export.csv` | lecturas por segundo del reloj del tripulante (CSV de smart-monitor); `desde=YYYY-MM-DD` opcional |

Cambiar la tolerancia seguido hace incomparables los chequeos entre sí (cada uno guarda con qué valores se midió).
