# Módulo `apps/api`

<!-- CONTEXT:MANUAL:START -->
## Propósito

API FastAPI: sirve la zona gold del ETL (`pipelines/reanclaje`, solo lectura) y guarda el registro de la tripulación en una base SQLite local (`almacen/`).

## Puntos clave

- No importa el pipeline (regla 3 de la arquitectura): lee `<DATALAKE_DIR>/gold/*.json` y `gold/manifest.json`. No ejecuta el ETL ni escribe nada; para generar datos se corre `pipelines/reanclaje/index.py`.
- Endpoints: `GET /salud`; `GET /escenarios`, `/escenarios/{nombre}` (filtros `fuente`, `variable`, `dia_mision`), `/escenarios/{nombre}/serie` y `/diario`; `GET /paneles`, `/paneles/{nombre}` y `/paneles/{nombre}/{dosis|protones|cabina|eventos}`; `GET /perfiles`; `GET /simulacion/caso-referencia` y `GET /simulacion/kpi`.
- Documentación para agentes: `AGENTES.md` (cómo leer los datos y sus trampas) y `GET /openapi.json` (contrato, con resumen y descripción en cada ruta). Un test exige que cada ruta tenga ambos y aparezca en la guía; al agregar una ruta, documéntala en las dos partes.
- Escenario, panel o simulación se distinguen por el resumen del manifiesto del ETL (`serie5min` = escenario, `dosis` = panel, `tipo == "simulacion"` = simulación), no por el nombre: un escenario puede llamarse `panel-demo` y los archivos de simulación no aparecen en `/paneles` ni `/escenarios`. La API agrega `panel-` por dentro: el panel del escenario `x` es `/paneles/x` (archivo `panel-x.json`). Pedir un tipo como otro da 404.
- La clave se valida contra el manifiesto, así que no se sirven rutas arbitrarias. Antes de responder se comprueba el SHA-256 del archivo contra el manifiesto: si no coincide, 500 (falla cerrado).
- Si `index.py panel` se corre con `destino`, el archivo no queda en `gold/` y la API no lo ve.
- Arranque: `uvicorn main:app --port 8000` desde `apps/api`. `DATALAKE_DIR` apunta a otro datalake; por defecto usa `pipelines/datalake/data`.
- Almacén SQLite (`almacen/`, solo biblioteca estándar): lecturas, síntomas, línea base, alertas, escalamientos, cola con retardo y auditoría. Archivo en `VIGIA_DB` (por defecto `apps/api/data/vigia.db`, fuera de git). Esquema en `almacen/migraciones/NNN_*.sql`; `python3 -m almacen migrar|sembrar`. Diseño: `docs/superpowers/specs/2026-11-14-base-datos-local-design.md`.
- Privacidad en el servidor: verde y ámbar solo los ve su dueño; una roja de la capa A escala al oficial médico (o al comandante) con el dato mínimo y solo con consentimiento. `alerta`, `escalamiento` y `auditoria` son de solo adición (triggers). Quien recibe un escalamiento ve solo el dato mínimo (nunca la explicación); cada acceso a alertas ajenas queda en `auditoria`. El afectado ve qué se envió y puede añadir contexto una vez.
- Reloj de la cola: al arrancar, `ciclo_de_vida` en `main.py` lanza una tarea que cada `VIGIA_RELOJ_SEG` s (por defecto 5; 0 la apaga) pasa a `entregado` los reportes cuyo retardo ya pasó, con la hora real del servidor. Ya no hace falta llamar a `POST /reportes/avanzar` (queda para pruebas y para forzar una hora). Con varios procesos, cada uno corre su reloj: es idempotente.
- CORS abierto a `GET`, `POST` y `PUT` desde cualquier origen (atajo, sin autenticación real; acotar `allow_origins` al desplegar).
- Vocabulario: los códigos de síntoma salen de `packages/schemas/vocabulario.json` (`almacen/vocabulario.py` lo lee); el retardo de reporte es 0 a 22 min (migración 002) y existe el indicador `presion_arterial_diastolica` (sin reglas ni ficha).
- La conexión SQLite es por petición y con `check_same_thread=False` (FastAPI la usa desde varios hilos); `migrar` es atómica y con bloqueo; `recursive_triggers` está activo para que `INSERT OR REPLACE` no eluda la solo adición. `t_real` debe ser canónico (`10:00:00Z`).
- El tripulante se declara en la cabecera `X-Tripulante` (atajo, sin autenticación real). `lectura.t_mision` es null antes del día 1 de la misión. Las rutas de registro están en `rutas_registro.py`; el motor híbrido no vive aquí: quien lo ejecute envía las alertas por `POST /tripulantes/{id}/alertas`.
- Única dependencia de servidor del repo: `requirements.txt` (fastapi, uvicorn, httpx para los tests). El CI instala el `requirements.txt` de cada módulo antes de sus tests. Incluye CORS de solo lectura (`GET`) para que `apps/web` consulte la API desde el navegador en entorno local.
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
| [almacen/__main__.py](almacen/__main__.py) | 13 | CLI: python3 -m almacen migrar\|sembrar (desde apps/api). |
| [almacen/alertas.py](almacen/alertas.py) | 99 | Alertas del motor, escalamiento al oficial médico, auditoría y visibilidad (privacidad §5.4). |
| [almacen/base.py](almacen/base.py) | 18 | Línea base (mediana y MAD) por tripulante, indicador y origen (tierra o vuelo). |
| [almacen/cola.py](almacen/cola.py) | 35 | Cola de reportes hacia tierra con el retardo del día de misión (0 a 22 min; informe §4.2). |
| [almacen/db.py](almacen/db.py) | 44 | Conexión y migraciones del almacén SQLite (solo biblioteca estándar). |
| [almacen/lecturas.py](almacen/lecturas.py) | 50 | Lecturas de indicadores y síntomas de un tripulante. |
| [almacen/tripulacion.py](almacen/tripulacion.py) | 79 | Misión, tripulantes y consentimiento; conversión de t_real a hora de misión. |
| [almacen/vocabulario.py](almacen/vocabulario.py) | 7 | Vocabulario compartido con la interfaz: lee el contrato packages/schemas/vocabulario.json. |
| [main.py](main.py) | 207 | API de solo lectura sobre la zona gold del ETL (pipelines/reanclaje). |
| [rutas_registro.py](rutas_registro.py) | 213 | Endpoints de registro de la tripulación sobre el almacén SQLite (ver almacen/ y AGENTES.md). |
| [test_almacen_alertas.py](test_almacen_alertas.py) | 134 | — |
| [test_almacen_base.py](test_almacen_base.py) | 40 | — |
| [test_almacen_cola.py](test_almacen_cola.py) | 53 | — |
| [test_almacen_db.py](test_almacen_db.py) | 92 | — |
| [test_almacen_lecturas.py](test_almacen_lecturas.py) | 73 | — |
| [test_almacen_tripulacion.py](test_almacen_tripulacion.py) | 59 | — |
| [test_api.py](test_api.py) | 112 | — |
| [test_api_registro.py](test_api_registro.py) | 201 | — |

### API pública

**almacen/alertas.py**

- función `anotar(conn, actor_id, accion, entidad, entidad_id, detalle=None)`
- función `escalar(conn, alerta_id)`
- función `registrar_alerta(conn, tripulante_id, indicador, capa, nivel, valor, t_real, explicacion, regla_version, tramo=None)`: Guarda la alerta; una roja de la capa A escala en la misma transacción.
- función `agregar_contexto(conn, escalamiento_id, texto)`: El astronauta añade contexto una sola vez; el trigger rechaza cambiarlo o editar lo demás.
- función `listar_escalamientos(conn, destinatario_id=None, tripulante_id=None)`: Escalamientos recibidos por `destinatario_id` o enviados por el afectado `tripulante_id`.
- función `alertas_visibles(conn, actor_id, tripulante_id)`: El dueño ve todas sus alertas. Otro tripulante recibe solo el dato mínimo de las escaladas a él

**almacen/base.py**

- función `guardar_linea_base(conn, tripulante_id, indicador, origen, mediana, mad, n, desde, hasta)`: Reemplaza la fila de la misma clave. El peso w(d) de §5.2 se calcula al leer, no se guarda.
- función `obtener_linea_base(conn, tripulante_id, indicador, origen)`

**almacen/cola.py**

- función `encolar_reporte(conn, tripulante_id, creado_t_real, retardo_min)`
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
- función `sembrar_demo(conn)`: Misión `demo` con astronauta, oficial médico y comandante, todos con consentimiento. Idempotente.

**main.py**

- función `ciclo_de_vida(_app)`: Reloj de la cola de reportes: cada `VIGIA_RELOJ_SEG` s (por defecto 5; 0 lo apaga).
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
- función `listar_reportes(id: int=Depends(propio), conn=Depends(conexion))`: Reportes del tripulante con `estado` en_cola, entregado o respondido.
- función `avanzar(cuerpo: AvanceIn, quien: int=Depends(actor), conn=Depends(conexion))`: Pasa a `entregado` los reportes con `llega_t_real` <= `ahora`; devuelve `{"entregados": n}`.
- función `responder(reporte_id: int, cuerpo: RespuestaIn, quien: int=Depends(actor), conn=Depends(conexion))`: Responde un reporte ya entregado y no antes de su llegada a tierra; si no, 422.
- función `escalamientos_recibidos(quien: int=Depends(actor), conn=Depends(conexion))`: Avisos rojos escalados a ti: `{id, alerta_id, tripulante_id, contenido: {indicador, valor, t_real, tramo},
- función `escalamientos_propios(id: int=Depends(propio), conn=Depends(conexion))`: Transparencia (§5.4): qué avisos salieron sobre ti, a quién y con qué contenido.
- función `agregar_contexto(escalamiento_id: int, cuerpo: ContextoIn, quien: int=Depends(actor), conn=Depends(conexion))`: Solo el afectado puede añadir contexto, una sola vez (no puede cancelar el aviso); otro tripulante recibe 403

### Puntos de entrada

- `apps/api/almacen/__main__.py`

### Configuración y fuentes externas

- Variables de entorno: `DATALAKE_DIR`, `VIGIA_DB`, `VIGIA_RELOJ_SEG`

### Dependencias

- Internas: `main`, `rutas_registro`
- Paquetes del monorepo: `packages/i18n`
- Externas: `almacen`, `fastapi`, `pydantic`
- Biblioteca estándar: `asyncio`, `concurrent`, `contextlib`, `datetime`, `hashlib`, `json`, `math`, `os`, `pathlib`, `re`, `sqlite3`, `sys`, `tempfile`, `threading`, `time`, `typing`, `unittest`

### Tests

- `apps/api/test_almacen_alertas.py`: 13 pruebas en Alertas (13)
- `apps/api/test_almacen_base.py`: 4 pruebas en LineaBase (4)
- `apps/api/test_almacen_cola.py`: 5 pruebas en Cola (5)
- `apps/api/test_almacen_db.py`: 8 pruebas en Esquema (8)
- `apps/api/test_almacen_lecturas.py`: 9 pruebas en Lecturas (9)
- `apps/api/test_almacen_tripulacion.py`: 8 pruebas en Tripulacion (8)
- `apps/api/test_api.py`: 10 pruebas en Api (10)
- `apps/api/test_api_registro.py`: 18 pruebas en Registro (18)
<!-- CONTEXT:AUTO:END -->
