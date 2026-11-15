# Módulo `apps/api`

<!-- CONTEXT:MANUAL:START -->
## Propósito

API FastAPI: sirve la zona gold del ETL (`pipelines/reanclaje`, solo lectura) y guarda el registro de la tripulación en una base SQLite local (`almacen/`).

## Puntos clave

- No importa el pipeline (regla 3 de la arquitectura): lee `<DATALAKE_DIR>/gold/*.json` y `gold/manifest.json`. No ejecuta el ETL ni escribe nada; para generar datos se corre `pipelines/reanclaje/index.py`.
- Endpoints: `GET /salud`; `GET /escenarios`, `/escenarios/{nombre}` (filtros `fuente`, `variable`, `dia_mision`), `/escenarios/{nombre}/serie` y `/diario`; `GET /paneles`, `/paneles/{nombre}` y `/paneles/{nombre}/{dosis|protones|cabina|eventos}`; `GET /perfiles`; `GET /simulacion/caso-referencia` y `GET /simulacion/kpi`. Tablero (`rutas_dashboard.py`): `GET /fichas` y `/fichas/{id}` (de `packages/schemas/fichas`), `GET /entorno/referencia`, `GET /tripulacion`, y por tripulante `historial`, `recordatorios` y `mensajes`.
- Documentación para agentes: `AGENTES.md` (cómo leer los datos y sus trampas) y `GET /openapi.json` (contrato, con resumen y descripción en cada ruta). Un test exige que cada ruta tenga ambos y aparezca en la guía; al agregar una ruta, documéntala en las dos partes.
- Escenario, panel o simulación se distinguen por el resumen del manifiesto del ETL (`serie5min` = escenario, `dosis` = panel, `tipo == "simulacion"` = simulación), no por el nombre: un escenario puede llamarse `panel-demo` y los archivos de simulación no aparecen en `/paneles` ni `/escenarios`. La API agrega `panel-` por dentro: el panel del escenario `x` es `/paneles/x` (archivo `panel-x.json`). Pedir un tipo como otro da 404.
- La clave se valida contra el manifiesto, así que no se sirven rutas arbitrarias. Antes de responder se comprueba el SHA-256 del archivo contra el manifiesto: si no coincide, 500 (falla cerrado).
- Si `index.py panel` se corre con `destino`, el archivo no queda en `gold/` y la API no lo ve.
- Arranque: `uvicorn main:app --port 8000` desde `apps/api`. `DATALAKE_DIR` apunta a otro datalake; por defecto usa `pipelines/datalake/data`.
- Almacén SQLite (`almacen/`, solo biblioteca estándar): lecturas, síntomas, línea base, alertas, escalamientos, cola con retardo y auditoría. Archivo en `VIGIA_DB` (por defecto `apps/api/data/vigia.db`, fuera de git). Esquema en `almacen/migraciones/NNN_*.sql`; `python3 -m almacen migrar|sembrar`. Diseño: `docs/superpowers/specs/2026-11-14-base-datos-local-design.md`.
- Privacidad en el servidor: verde y ámbar solo los ve su dueño; una roja de la capa A escala al oficial médico (o al comandante) con el dato mínimo y solo con consentimiento. `alerta`, `escalamiento` y `auditoria` son de solo adición (triggers). Quien recibe un escalamiento ve solo el dato mínimo (nunca la explicación); cada acceso a alertas ajenas queda en `auditoria`. El afectado ve qué se envió y puede añadir contexto una vez. Reenviar la misma alerta (tripulante, indicador, capa, `t_real` y valor) devuelve el id que ya tenía: la app reintenta sin duplicar avisos.
- Reloj de la cola: al arrancar, `ciclo_de_vida` en `main.py` lanza una tarea que cada `VIGIA_RELOJ_SEG` s (por defecto 5; 0 la apaga) pasa a `entregado` los reportes cuyo retardo ya pasó, con la hora real del servidor. Ya no hace falta llamar a `POST /reportes/avanzar` (queda para pruebas y para forzar una hora). Con varios procesos, cada uno corre su reloj: es idempotente.
- CORS abierto a `GET`, `POST` y `PUT` desde cualquier origen (atajo, sin autenticación real; acotar `allow_origins` al desplegar). Acepta también el preflight de red privada (`allow_private_network`): sin él Chrome bloquea la llamada desde otra máquina de la LAN.
- Vocabulario: los códigos de síntoma salen de `packages/schemas/vocabulario.json` (`almacen/vocabulario.py` lo lee); el retardo de reporte es 0 a 22 min (migración 002) y existe el indicador `presion_arterial_diastolica` (sin reglas ni ficha).
- La conexión SQLite es por petición y con `check_same_thread=False` (FastAPI la usa desde varios hilos); `migrar` es atómica y con bloqueo; `recursive_triggers` está activo para que `INSERT OR REPLACE` no eluda la solo adición. `t_real` debe ser canónico (`10:00:00Z`).
- El tripulante se declara en la cabecera `X-Tripulante` (atajo, sin autenticación real). `lectura.t_mision` es null antes del día 1 de la misión. Las rutas de registro están en `rutas_registro.py`; el motor híbrido no vive aquí: quien lo ejecute envía las alertas por `POST /tripulantes/{id}/alertas`.
- Única dependencia de servidor del repo: `requirements.txt` (fastapi, uvicorn, httpx para los tests). El CI instala el `requirements.txt` de cada módulo antes de sus tests.
- `GET /tripulantes/{id}/historial?modo=real|demo` es lo que evalúa el motor de la app. `real` (por defecto): las lecturas que el tripulante ingresó (`naturaleza: Real`), una fila por día de misión con `null` en lo no medido, y el entorno del panel gold `mision-real`. `demo`: el tripulante simulado del caso de referencia (`packages/engine/fixtures/caso-referencia.json`; tripulante N recibe el simulado N; `DIA_ACTUAL_DEMO = 27`) con las anomalías inyectadas rotuladas `Simulado`, más las mediciones del panel `mision-vigia` donde el escenario las trae. En `entorno_diario` el CO2 real va en ppm (la app lo convierte por perfil) y cada dato lleva `*_origen` (naturaleza, fuente y fecha real); los eventos SEP de DONKI ponen `modo_tormenta`. Sin panel publicado el entorno real queda vacío: no se inventa. `gold.py` lee el gold verificando su SHA-256 (un panel alterado no se usa).
- `mensajes?modo=demo` añade el hilo de ejemplo; en real solo van las respuestas reales de tierra. Los mockups están en `demo/` (recordatorios, hilo, referencia de entorno, informe de ejemplo con `demo: true`). `GET /tripulacion` lista la tripulación de la misión de quien pregunta. `/fichas`, `/fichas/{id}` y `recordatorios` aceptan `lang=en`: las fichas toman los textos de `packages/schemas/fichas_en/<id>.json` (solo campos de texto y títulos de fuente; si falta la traducción se sirve en español).
- Reloj (`puente_reloj.py`): se conecta al `/live` de smart-monitor (`SMART_URL`, por defecto `ws://127.0.0.1:8765/live`; `SMART_DESACTIVADO=1` lo apaga) como un panel, con reintentos 1→30 s, guarda en memoria el último estado por tripulante y persiste solo los chequeos válidos de **relojes vinculados** (FC en reposo y SpO2, `origen=sensor`, `metodo=galaxy_watch4:<dispositivo>`, `naturaleza=Real`), nunca las lecturas de 1 Hz (A.6). Vinculado = nombre en `SMART_TRIPULANTES`, en la tabla `reloj_vinculo` (migración 004; `POST`/`DELETE /tripulantes/{id}/reloj/vinculo`) o igual al `alias`. Nunca se guardan los nombres por defecto (`Tripulante XXXX`, `Tripulante previo`) ni los de un nombre con dos relojes conectados (queda un aviso `relojes_duplicados`); solo `SMART_AUTOREGISTRO=1` crea tripulantes nuevos. `chequeo_estado`/`chequeo_progreso` caducan a los 120 s y se limpian al desconectar; `history` reemplaza la serie sin repetir `t`; `resumen.notas` se funde con las notas en vivo; los avisos del servidor sin tripulante salen en `GET /reloj/estado` (`avisos`), junto con `ip_lan` y `url_reloj_sugerida` (`ws://<ip_lan>:8765/watch`). `GET /tripulantes/{id}/reloj` da `recibido_hace_s` con el reloj del servidor (la vigencia no depende del `t` del reloj). Las escrituras SQLite van en `asyncio.to_thread`. `websockets` se importa solo al arrancar el puente (sin él, `error` lo dice). Un cambio aquí anota pendientes en smart-monitor (`tools/sincro-smart`).
- `.env` de la raíz: `main.cargar_env` lo lee al arrancar (lifespan) con la biblioteca estándar, sin pisar variables ya definidas ni definir las vacías, y lo deshace al apagar. Así `.env.example` describe lo que la API realmente lee.
- Los mensajes de error salen de `packages/i18n` (`api.error.*`).

## Relación con el informe

- §4.1 flujo de extremo a extremo (el gold es lo que leen las apps).

tags: api, fastapi, gold, etl, panel, solo-lectura
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [almacen/__init__.py](almacen/__init__.py) | 1 | — |
| [almacen/__main__.py](almacen/__main__.py) | 18 | CLI: python3 -m almacen migrar\|sembrar (desde apps/api). |
| [almacen/alertas.py](almacen/alertas.py) | 104 | Alertas del motor, escalamiento al oficial médico, auditoría y visibilidad (privacidad §5.4). |
| [almacen/base.py](almacen/base.py) | 18 | Línea base (mediana y MAD) por tripulante, indicador y origen (tierra o vuelo). |
| [almacen/cola.py](almacen/cola.py) | 40 | Cola de reportes hacia tierra con el retardo del día de misión (0 a 22 min; informe §4.2). |
| [almacen/db.py](almacen/db.py) | 44 | Conexión y migraciones del almacén SQLite (solo biblioteca estándar). |
| [almacen/lecturas.py](almacen/lecturas.py) | 50 | Lecturas de indicadores y síntomas de un tripulante. |
| [almacen/tripulacion.py](almacen/tripulacion.py) | 96 | Misión, tripulantes y consentimiento; conversión de t_real a hora de misión. |
| [almacen/vocabulario.py](almacen/vocabulario.py) | 7 | Vocabulario compartido con la interfaz: lee el contrato packages/schemas/vocabulario.json. |
| [gold.py](gold.py) | 42 | Lectura verificada de la zona gold del ETL (pipelines/reanclaje). No importa el pipeline: lee los JSON que |
| [main.py](main.py) | 233 | API de solo lectura sobre la zona gold del ETL (pipelines/reanclaje). |
| [puente_reloj.py](puente_reloj.py) | 587 | Puente con el servidor del reloj (repositorio smart-monitor, Galaxy Watch4; informe, anexo A). |
| [rutas_dashboard.py](rutas_dashboard.py) | 258 | Lo que el tablero necesita además del gold y del registro: fichas, referencia de entorno y, por tripulante, |
| [rutas_registro.py](rutas_registro.py) | 230 | Endpoints de registro de la tripulación sobre el almacén SQLite (ver almacen/ y AGENTES.md). |
| [test_almacen_alertas.py](test_almacen_alertas.py) | 134 | — |
| [test_almacen_base.py](test_almacen_base.py) | 40 | — |
| [test_almacen_cola.py](test_almacen_cola.py) | 53 | — |
| [test_almacen_db.py](test_almacen_db.py) | 97 | — |
| [test_almacen_lecturas.py](test_almacen_lecturas.py) | 73 | — |
| [test_almacen_tripulacion.py](test_almacen_tripulacion.py) | 59 | — |
| [test_api.py](test_api.py) | 144 | — |
| [test_api_dashboard.py](test_api_dashboard.py) | 281 | — |
| [test_api_registro.py](test_api_registro.py) | 208 | — |
| [test_puente_reloj.py](test_puente_reloj.py) | 441 | — |

### API pública

**almacen/alertas.py**

- función `anotar(conn, actor_id, accion, entidad, entidad_id, detalle=None)`
- función `escalar(conn, alerta_id)`
- función `registrar_alerta(conn, tripulante_id, indicador, capa, nivel, valor, t_real, explicacion, regla_version, tramo=None)`: Guarda la alerta; una roja de la capa A escala en la misma transacción. Reenviar la misma (tripulante,
- función `agregar_contexto(conn, escalamiento_id, texto)`: El astronauta añade contexto una sola vez; el trigger rechaza cambiarlo o editar lo demás.
- función `listar_escalamientos(conn, destinatario_id=None, tripulante_id=None)`: Escalamientos recibidos por `destinatario_id` o enviados por el afectado `tripulante_id`.
- función `alertas_visibles(conn, actor_id, tripulante_id)`: El dueño ve todas sus alertas. Otro tripulante recibe solo el dato mínimo de las escaladas a él

**almacen/base.py**

- función `guardar_linea_base(conn, tripulante_id, indicador, origen, mediana, mad, n, desde, hasta)`: Reemplaza la fila de la misma clave. El peso w(d) de §5.2 se calcula al leer, no se guarda.
- función `obtener_linea_base(conn, tripulante_id, indicador, origen)`

**almacen/cola.py**

- función `encolar_reporte(conn, tripulante_id, creado_t_real, retardo_min, contenido=None)`
- función `avanzar_cola(conn, ahora)`: Pasa a `entregado` los reportes que ya llegaron a tierra; devuelve cuántos.
- función `responder_reporte(conn, reporte_id, respuesta, t_real)`: Solo un reporte `entregado` puede responderse, y no antes de su llegada a tierra.
- función `leer_reportes(conn, tripulante_id)`

**almacen/db.py**

- función `ruta_por_defecto()`: `VIGIA_DB` o apps/api/data/vigia.db (fuera de git).
- función `conectar(ruta=None)`
- función `migrar(conn)`: Aplica en orden las migraciones NNN_*.sql pendientes y devuelve la versión resultante.

**almacen/lecturas.py**

- función `registrar_lectura(conn, tripulante_id, indicador, valor, t_real, origen='manual', metodo=None, naturaleza='Simulado')`: Guarda una lectura. Reenviar la misma (tripulante, indicador, t_real, origen) devuelve el mismo id.
- función `leer_lecturas(conn, tripulante_id, indicador=None, desde=None, hasta=None)`
- función `registrar_sintoma(conn, tripulante_id, codigo, gravedad, t_real)`
- función `leer_sintomas(conn, tripulante_id, desde=None, hasta=None)`

**almacen/tripulacion.py**

- función `crear_mision(conn, nombre, perfil, dia1_t_real)`
- función `crear_tripulante(conn, alias, mision_id, rol)`
- función `consentir(conn, tripulante_id, regla, t_real)`
- función `tiene_consentimiento(conn, tripulante_id, regla)`
- función `dia_de_vuelo(conn, tripulante_id, t_real)`: Día de vuelo (1 = día 1 de la misión) o None si t_real es anterior al vuelo.
- función `t_mision(conn, tripulante_id, t_real)`: `D022T00:05:00`; None antes del día 1 (línea base de tierra).
- función `sembrar_informes_demo(conn, ids)`: Informes de ejemplo ya respondidos por tierra (apps/api/demo/informes.json). Idempotente por título.
- función `sembrar_demo(conn)`: Misión `demo` con astronauta, oficial médico y comandante, todos con consentimiento. Idempotente.

**gold.py**

- función `carpeta()`
- función `manifiesto()`
- función `leer_verificado(clave, predicado, nombre_error=None)`: El JSON gold `clave` si está en el manifiesto, cumple `predicado` y su SHA-256 coincide; si no, 404 o 500.
- función `panel(nombre)`: Panel de entorno publicado para un escenario, o None si el ETL no lo publicó o fue alterado.

**main.py**

- función `cargar_env(ruta=None)`: Carga el `.env` de la raíz del repo (plantilla: `.env.example`) en `os.environ` con la biblioteca estándar:
- función `ciclo_de_vida(_app)`: Carga el `.env` de la raíz (sin pisar el entorno) y arranca el reloj de la cola de reportes: cada
- función `dato_invalido(_, e)`
- función `salud()`: Devuelve {"estado": "ok"} si el servicio responde. No toca el gold.
- función `listar_escenarios()`: Lista de `nombre` válidos para `/escenarios/{nombre}`. Vacía si el ETL no ha publicado nada.
- función `leer_escenario(nombre: str, fuente: str | None=None, variable: str | None=None, dia_mision: int | None=None)`: Objeto con `escenario`, `ventanas` (fuente y fechas reales de cada serie), `serie5min`, `diario` y `eventos`
- función `leer_serie(nombre: str, fuente: str | None=None, variable: str | None=None, dia_mision: int | None=None)`: Lista de puntos `{t_mision, t_real, fuente, serie, variable, valor, n, naturaleza}`. `n` = lecturas dentro
- función `leer_diario(nombre: str, fuente: str | None=None, variable: str | None=None, dia_mision: int | None=None)`: Lista de `{dia_mision, fuente, serie, variable, max, bins}` más `dosis` (en las tasas de dosis, µGy o µSv
- función `listar_paneles()`: Lista de `nombre` válidos para `/paneles/{nombre}`; coincide con el escenario del que sale cada panel.
- función `leer_panel(nombre: str)`: Objeto con `limites`, `perfiles_presion_mmhg`, `ventanas`, `aviso`, `dosis` (puede ser null), `protones`,
- función `leer_seccion(nombre: str, seccion: Literal['dosis', 'protones', 'cabina', 'eventos'])`: Solo `dosis` (objeto o null), `protones`, `cabina` o `eventos` (listas). Otra sección da 422.
- función `leer_perfiles()`: Catálogo oficial de los 5 perfiles de misión (§3.3): presión de cabina en mmHg, latencia unidireccional y gravedad.
- función `leer_caso_referencia()`: Caso determinista (semilla 2026) con 14 días pre-vuelo, 30 de vuelo, 4 tripulantes (A1, A2, A3 y control) y
- función `leer_kpi_simulacion()`: Métricas agregadas del protocolo de 500 misiones con anomalía + 500 de control + semilla 2027 (§5.5).

**puente_reloj.py**

- función `t_canonico(texto)`: `t` del reloj (ISO 8601 UTC, quizá con milisegundos) a `YYYY-MM-DDTHH:MM:SSZ`; None si no se entiende.
- función `mapa_tripulantes(texto)`: `"Sebastián=1, Ana=2"` -> `{"sebastián": 1, "ana": 2}`. Ignora las entradas mal formadas.
- función `nombre_por_defecto(nombre)`: True si el nombre no identifica a nadie: vacío, `Sin nombre`, `Tripulante previo` o el `Tripulante XXXX` de fábrica.
- función `metodo_de(chequeo)`: `galaxy_watch4:<dispositivo>` (el instrumento, A.6); sin `dispositivo`, `galaxy_watch4` a secas.
- clase `EstadoReloj`: Último estado conocido de cada tripulante según el servidor del reloj. Puro: no hace IO.
- función `vinculos_bd(conn)`: `{nombre en minúsculas: tripulante_id}` de la tabla `reloj_vinculo` (vínculos hechos desde la app).
- función `mapa_completo(conn, mapa)`: `SMART_TRIPULANTES` ∪ vínculos de la base (el vínculo explícito, más reciente, manda).
- función `resolver_id(conn, nombre, mapa, registrar=False)`: Id de tripulante para un nombre del reloj: `SMART_TRIPULANTES` o vínculo de la base, luego el alias
- función `nombres_de(conn, tripulante_id, mapa)`: Nombres con que el reloj puede conocer a un tripulante: los del mapa, sus vínculos y su alias.
- función `persistir_chequeos(conn, chequeos, mapa, registrar=False)`: Guarda la FC en reposo y el SpO2 de los chequeos válidos de relojes vinculados (`resolver_id`), con
- clase `Puente`: Cliente WebSocket del `/live` del reloj, con reconexión (1 s, 2 s, 4 s... hasta 30 s).
- función `url_http(url_ws, ruta)`: `ws://h:8765/live` -> `http://h:8765/<ruta>` (y wss -> https): el HTTP del mismo servidor del reloj.
- función `ip_lan()`: IP de esta máquina en la red local, sin tocar la red: un socket UDP «conectado» solo elige la interfaz de
- función `url_reloj_sugerida(url_live, ip)`: URL que hay que escribir en el campo «Servidor» del reloj (`/watch` del mismo smart-monitor). Si `SMART_URL`
- función `crear_puente()`: El puente configurado por entorno (`SMART_URL` o su valor por defecto), o None con `SMART_DESACTIVADO=1`.
- función `estado_puente()`: `{configurado, desactivado, conectado, ultima_vez, error, url_live, ip_lan, url_reloj_sugerida, avisos}`.
- función `reloj_tripulante(id: int=Depends(propio), conn=Depends(conexion))`: `{puente, nombres, vinculado, reloj}`. `nombres` son los nombres de reloj que la API asocia al tripulante
- clase `VinculoIn(BaseModel)`
- función `vincular_reloj(cuerpo: VinculoIn, id: int=Depends(propio), conn=Depends(conexion))`: `{nombre}` = el campo «Tripulante» configurado en el reloj. Desde entonces sus chequeos válidos se guardan
- función `desvincular_reloj(nombre: str | None=None, id: int=Depends(propio), conn=Depends(conexion))`: Quita los vínculos del tripulante hechos por la API (`nombre` opcional para quitar solo uno). No toca
- clase `OrdenIn(BaseModel)`
- función `orden_reloj(orden: OrdenIn, id: int=Depends(propio), conn=Depends(conexion))`: `{tipo: medir_spo2 | iniciar_chequeo}`. Se reenvía al servidor del reloj con el nombre del tripulante. 202 =
- función `tripulacion_reloj(_quien: int=Depends(actor), conn=Depends(conexion))`: Lista de `{nombre, conectado, relojes_conectados, ultima_lectura, chequeo_hoy, nombre_por_defecto, vinculado,
- función `config_reloj()`: `{tolerancia, presets}` según el servidor del reloj: `preset` (estricta, normal, flexible, personalizada),
- clase `ToleranciaIn(BaseModel)`
- función `cambiar_config_reloj(tolerancia: ToleranciaIn, _quien: int=Depends(actor))`: Reenvía `set_config` al servidor del reloj, que la aplica a todos los relojes. Con `personalizada` van los
- función `exportar_reloj(id: int=Depends(propio), conn=Depends(conexion), desde: str | None=None)`: CSV de smart-monitor (`/export.csv`) filtrado por el nombre del tripulante: una fila por segundo con

**rutas_dashboard.py**

- función `propio_o_clinico(id: int, quien: int=Depends(actor), conn=Depends(conexion))`: El dueño, o el oficial médico de su misión: los clínicos ven el cuerpo completo de la tripulación y cada
- función `listar_fichas(lang: Literal['es', 'en']='es')`: Todas las fichas validadas (`packages/schemas/fichas`, esquema `ficha.schema.json`), en el orden del índice.
- función `leer_ficha(id: str, lang: Literal['es', 'en']='es')`: Una ficha (`que_es`, `como_se_mide_en_vuelo` por perfil, `por_que`, `cuando_avisar`, `fuentes`...).
- función `referencia_entorno(lang: Literal['es', 'en']='es')`: Límites de radiación y CO2, umbral de tormenta y fuentes del panel (`lang=en` en inglés).
- función `historial(id: int=Depends(propio_o_clinico), modo: Literal['real', 'demo']='real', lang: Literal['es', 'en']='es', conn=Depends(conexion))`: Lo que evalúa el motor: `lecturas` por día de misión (días <= 0 = prevuelo) y `entorno_diario`. Con tu id, o con el
- función `tripulacion_de_la_mision(quien: int=Depends(actor), conn=Depends(conexion))`: `{id, alias, rol}` de cada tripulante de la misión de quien pregunta (para saber quién es el oficial médico).
- función `recordatorios(id: int=Depends(propio), lang: Literal['es', 'en']='es')`: Lista de textos (`lang=en` en inglés). Simulado: aún no hay plan de actividades a bordo.
- función `mensajes(id: int=Depends(propio), modo: Literal['real', 'demo']='real', lang: Literal['es', 'en']='es', conn=Depends(conexion))`: `{id, de: astronaut|surgeon, autor, dia, hora, texto}`: las respuestas de tierra a los reportes del tripulante.

**rutas_registro.py**

- función `conexion()`
- función `actor(x_tripulante: str | None=Header(None), conn=Depends(conexion))`
- función `propio(id: int, quien: int=Depends(actor))`
- clase `LecturaIn(BaseModel)`
- clase `SintomaIn(BaseModel)`
- clase `LineaBaseIn(BaseModel)`
- clase `AlertaIn(BaseModel)`
- clase `ReporteIn(BaseModel)`
- clase `ContextoIn(BaseModel)`
- clase `RespuestaIn(BaseModel)`
- clase `AvanceIn(BaseModel)`
- función `crear_lectura(cuerpo: LecturaIn, id: int=Depends(propio), conn=Depends(conexion))`: Guarda una lectura de un indicador (`spo2`, `sueno`, …). Reenviar la misma (indicador, t_real, origen) devuelve
- función `listar_lecturas(indicador: str | None=None, desde: str | None=None, hasta: str | None=None, id: int=Depends(propio), conn=Depends(conexion))`: Lecturas del tripulante por `t_real`; filtros opcionales `indicador`, `desde` y `hasta` (UTC).
- función `crear_sintoma(cuerpo: SintomaIn, id: int=Depends(propio), conn=Depends(conexion))`: Guarda un síntoma con `codigo` (cefalea, nausea, mareo, vision o erupcion) y `gravedad` de 1 a 3.
- función `listar_sintomas(desde: str | None=None, hasta: str | None=None, id: int=Depends(propio), conn=Depends(conexion))`: Síntomas del tripulante por `t_real`; filtros opcionales `desde` y `hasta`.
- función `guardar_linea_base(indicador: str, origen: str, cuerpo: LineaBaseIn, id: int=Depends(propio), conn=Depends(conexion))`: Reemplaza la mediana y el MAD de un indicador para `origen` = tierra o vuelo.
- función `leer_linea_base(indicador: str, origen: str, id: int=Depends(propio), conn=Depends(conexion))`: Devuelve `mediana`, `mad`, `n`, `desde` y `hasta`; 404 si no existe.
- función `crear_alerta(cuerpo: AlertaIn, id: int=Depends(propio), conn=Depends(conexion))`: Guarda la alerta (solo adición). Una roja de la capa A escala al oficial médico (o al comandante si el afectado
- función `listar_alertas(id: int, quien: int=Depends(actor), conn=Depends(conexion))`: Con tu propio id: todas tus alertas. Con el de otro: solo sus alertas rojas escaladas a ti; ese acceso queda
- función `crear_reporte(cuerpo: ReporteIn, id: int=Depends(propio), conn=Depends(conexion))`: Encola un reporte con `retardo_min` de 0 a 22; `llega_t_real` = `creado_t_real` + retardo.
- función `listar_reportes(id: int=Depends(propio), lang: Literal['es', 'en']='es', conn=Depends(conexion))`: Reportes del tripulante con `estado` en_cola, entregado o respondido, y su `contenido` (o null). Con `lang=en`
- función `avanzar(cuerpo: AvanceIn, quien: int=Depends(actor), conn=Depends(conexion))`: Pasa a `entregado` los reportes con `llega_t_real` <= `ahora`; devuelve `{"entregados": n}`.
- función `responder(reporte_id: int, cuerpo: RespuestaIn, quien: int=Depends(actor), conn=Depends(conexion))`: Responde un reporte ya entregado y no antes de su llegada a tierra; si no, 422.
- función `escalamientos_recibidos(quien: int=Depends(actor), conn=Depends(conexion))`: Avisos rojos escalados a ti: `{id, alerta_id, tripulante_id, contenido: {indicador, valor, t_real, tramo},
- función `escalamientos_propios(id: int=Depends(propio), conn=Depends(conexion))`: Transparencia (§5.4): qué avisos salieron sobre ti, a quién y con qué contenido.
- función `agregar_contexto(escalamiento_id: int, cuerpo: ContextoIn, quien: int=Depends(actor), conn=Depends(conexion))`: Solo el afectado puede añadir contexto, una sola vez (no puede cancelar el aviso); otro tripulante recibe 403

### Puntos de entrada

- `apps/api/almacen/__main__.py`

### Configuración y fuentes externas

- Variables de entorno: `DATALAKE_DIR`, `SMART_AUTOREGISTRO`, `SMART_DESACTIVADO`, `SMART_TRIPULANTES`, `SMART_URL`, `VIGIA_DB`, `VIGIA_PRUEBA_A`, `VIGIA_PRUEBA_FIJA`, `VIGIA_RELOJ_SEG`

### Dependencias

- Internas: `gold`, `main`, `puente_reloj`, `rutas_dashboard`, `rutas_registro`
- Paquetes del monorepo: `packages/i18n`
- Externas: `almacen`, `fastapi`, `pydantic`, `websockets`
- Biblioteca estándar: `asyncio`, `collections`, `concurrent`, `contextlib`, `datetime`, `hashlib`, `json`, `math`, `os`, `pathlib`, `re`, `socket`, `sqlite3`, `sys`, `tempfile`, `threading`, `time`, `typing`, `unittest`, `urllib`

### Tests

- `apps/api/test_almacen_alertas.py`: 13 pruebas en Alertas (13)
- `apps/api/test_almacen_base.py`: 4 pruebas en LineaBase (4)
- `apps/api/test_almacen_cola.py`: 5 pruebas en Cola (5)
- `apps/api/test_almacen_db.py`: 8 pruebas en Esquema (8)
- `apps/api/test_almacen_lecturas.py`: 9 pruebas en Lecturas (9)
- `apps/api/test_almacen_tripulacion.py`: 8 pruebas en Tripulacion (8)
- `apps/api/test_api.py`: 13 pruebas en Api (12), Entorno (1)
- `apps/api/test_api_dashboard.py`: 21 pruebas en Dashboard (18), Entorno (3)
- `apps/api/test_api_registro.py`: 19 pruebas en Registro (19)
- `apps/api/test_puente_reloj.py`: 28 pruebas en Estado (12), Persistencia (7), Rutas (7), ExtremoAExtremo (2)
<!-- CONTEXT:AUTO:END -->
