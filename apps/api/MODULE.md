# Módulo `apps/api`

<!-- CONTEXT:MANUAL:START -->
## Propósito

API FastAPI: sirve la zona gold del ETL (`pipelines/reanclaje`, solo lectura) y guarda el registro de la tripulación en una base SQLite local (`almacen/`).

## Puntos clave

- No importa el pipeline (regla 3 de la arquitectura): lee `<DATALAKE_DIR>/gold/*.json` y `gold/manifest.json`. No ejecuta el ETL ni escribe nada; para generar datos se corre `pipelines/reanclaje/index.py`.
- Endpoints: `GET /salud`; `GET /escenarios`, `/escenarios/{nombre}` (filtros `fuente`, `variable`, `dia_mision`), `/escenarios/{nombre}/serie` y `/diario`; `GET /paneles`, `/paneles/{nombre}` y `/paneles/{nombre}/{dosis|protones|cabina|eventos}`.
- Documentación para agentes: `AGENTES.md` (cómo leer los datos y sus trampas) y `GET /openapi.json` (contrato, con resumen y descripción en cada ruta). Un test exige que cada ruta tenga ambos y aparezca en la guía; al agregar una ruta, documéntala en las dos partes.
- Escenario o panel se distingue por el resumen del manifiesto del ETL (`serie5min` = escenario, `dosis` = panel), no por el nombre: un escenario puede llamarse `panel-demo`. La API agrega `panel-` por dentro: el panel del escenario `x` es `/paneles/x` (archivo `panel-x.json`). Pedir un escenario como panel, o al revés, da 404.
- La clave se valida contra el manifiesto, así que no se sirven rutas arbitrarias. Antes de responder se comprueba el SHA-256 del archivo contra el manifiesto: si no coincide, 500 (falla cerrado).
- Si `index.py panel` se corre con `destino`, el archivo no queda en `gold/` y la API no lo ve.
- Arranque: `uvicorn main:app --port 8000` desde `apps/api`. `DATALAKE_DIR` apunta a otro datalake; por defecto usa `pipelines/datalake/data`.
- Almacén SQLite (`almacen/`, solo biblioteca estándar): lecturas, síntomas, línea base, alertas, escalamientos, cola con retardo y auditoría. Archivo en `VIGIA_DB` (por defecto `apps/api/data/vigia.db`, fuera de git). Esquema en `almacen/migraciones/NNN_*.sql`; `python3 -m almacen migrar|sembrar`. Diseño: `docs/superpowers/specs/2026-11-14-base-datos-local-design.md`.
- Privacidad en el servidor: verde y ámbar solo los ve su dueño; una roja de la capa A escala al oficial médico (o al comandante) con el dato mínimo y solo con consentimiento. `alerta`, `escalamiento` y `auditoria` son de solo adición (triggers). Cada acceso a alertas ajenas queda en `auditoria`.
- El tripulante se declara en la cabecera `X-Tripulante` (atajo, sin autenticación real). `lectura.t_mision` es null antes del día 1 de la misión. Las rutas de registro están en `rutas_registro.py`; el motor híbrido no vive aquí: quien lo ejecute envía las alertas por `POST /tripulantes/{id}/alertas`.
- Única dependencia de servidor del repo: `requirements.txt` (fastapi, uvicorn, httpx para los tests). El CI instala el `requirements.txt` de cada módulo antes de sus tests. Sin CORS ni autenticación: es para uso local o de tierra.
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
| [almacen/alertas.py](almacen/alertas.py) | 85 | Alertas del motor, escalamiento al oficial médico, auditoría y visibilidad (privacidad §5.4). |
| [almacen/base.py](almacen/base.py) | 18 | Línea base (mediana y MAD) por tripulante, indicador y origen (tierra o vuelo). |
| [almacen/cola.py](almacen/cola.py) | 35 | Cola de reportes hacia tierra con el retardo del día de misión (3 a 22 min, informe §4.2). |
| [almacen/db.py](almacen/db.py) | 36 | Conexión y migraciones del almacén SQLite (solo biblioteca estándar). |
| [almacen/lecturas.py](almacen/lecturas.py) | 47 | Lecturas de indicadores y síntomas de un tripulante. |
| [almacen/tripulacion.py](almacen/tripulacion.py) | 76 | Misión, tripulantes y consentimiento; conversión de t_real a hora de misión. |
| [main.py](main.py) | 137 | API de solo lectura sobre la zona gold del ETL (pipelines/reanclaje). |
| [rutas_registro.py](rutas_registro.py) | 177 | Endpoints de registro de la tripulación sobre el almacén SQLite (ver almacen/ y AGENTES.md). |
| [test_almacen_alertas.py](test_almacen_alertas.py) | 108 | — |
| [test_almacen_base.py](test_almacen_base.py) | 40 | — |
| [test_almacen_cola.py](test_almacen_cola.py) | 50 | — |
| [test_almacen_db.py](test_almacen_db.py) | 38 | — |
| [test_almacen_lecturas.py](test_almacen_lecturas.py) | 63 | — |
| [test_almacen_tripulacion.py](test_almacen_tripulacion.py) | 54 | — |
| [test_api.py](test_api.py) | 89 | — |
| [test_api_registro.py](test_api_registro.py) | 106 | — |

### API pública

**almacen/alertas.py**

- función `anotar(conn, actor_id, accion, entidad, entidad_id, detalle=None)`
- función `escalar(conn, alerta_id)`
- función `registrar_alerta(conn, tripulante_id, indicador, capa, nivel, valor, t_real, explicacion, regla_version, tramo=None)`: Guarda la alerta; una roja de la capa A escala en la misma transacción.
- función `agregar_contexto(conn, escalamiento_id, texto)`: El astronauta añade contexto una sola vez; el trigger rechaza cambiarlo o editar lo demás.
- función `alertas_visibles(conn, actor_id, tripulante_id)`: El dueño ve todas sus alertas; otro tripulante, solo las rojas escaladas a él. El acceso ajeno se audita.

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

- función `dato_invalido(_, e)`
- función `salud()`: Devuelve {"estado": "ok"} si el servicio responde. No toca el gold.
- función `listar_escenarios()`: Lista de `nombre` válidos para `/escenarios/{nombre}`. Vacía si el ETL no ha publicado nada.
- función `leer_escenario(nombre: str, fuente: str | None=None, variable: str | None=None, dia_mision: int | None=None)`: Objeto con `escenario`, `ventanas` (fuente y fechas reales de cada serie), `serie5min`, `diario` y `eventos`
- función `leer_serie(nombre: str, fuente: str | None=None, variable: str | None=None, dia_mision: int | None=None)`: Lista de puntos `{t_mision, t_real, fuente, serie, variable, valor, n, naturaleza}`. `n` = lecturas dentro
- función `leer_diario(nombre: str, fuente: str | None=None, variable: str | None=None, dia_mision: int | None=None)`: Lista de `{dia_mision, fuente, serie, variable, max, bins}` más `dosis` (en las tasas de dosis, µGy o µSv
- función `listar_paneles()`: Lista de `nombre` válidos para `/paneles/{nombre}`; coincide con el escenario del que sale cada panel.
- función `leer_panel(nombre: str)`: Objeto con `limites`, `perfiles_presion_mmhg`, `ventanas`, `aviso`, `dosis` (puede ser null), `protones`,
- función `leer_seccion(nombre: str, seccion: Literal['dosis', 'protones', 'cabina', 'eventos'])`: Solo `dosis` (objeto o null), `protones`, `cabina` o `eventos` (listas). Otra sección da 422.

**rutas_registro.py**

- función `conexion()`
- función `actor(x_tripulante: str | None=Header(None), conn=Depends(conexion))`
- función `propio(id: int, quien: int=Depends(actor))`
- clase `LecturaIn(BaseModel)`
- clase `SintomaIn(BaseModel)`
- clase `LineaBaseIn(BaseModel)`
- clase `AlertaIn(BaseModel)`
- clase `ReporteIn(BaseModel)`
- clase `RespuestaIn(BaseModel)`
- clase `AvanceIn(BaseModel)`
- función `crear_lectura(cuerpo: LecturaIn, id: int=Depends(propio), conn=Depends(conexion))`: Guarda una lectura de un indicador (`spo2`, `sueno`, …). Reenviar la misma (indicador, t_real, origen) devuelve
- función `listar_lecturas(indicador: str | None=None, desde: str | None=None, hasta: str | None=None, id: int=Depends(propio), conn=Depends(conexion))`: Lecturas del tripulante por `t_real`; filtros opcionales `indicador`, `desde` y `hasta` (UTC).
- función `crear_sintoma(cuerpo: SintomaIn, id: int=Depends(propio), conn=Depends(conexion))`: Guarda un síntoma con `codigo` y `gravedad` de 1 a 3.
- función `listar_sintomas(desde: str | None=None, hasta: str | None=None, id: int=Depends(propio), conn=Depends(conexion))`: Síntomas del tripulante por `t_real`; filtros opcionales `desde` y `hasta`.
- función `guardar_linea_base(indicador: str, origen: str, cuerpo: LineaBaseIn, id: int=Depends(propio), conn=Depends(conexion))`: Reemplaza la mediana y el MAD de un indicador para `origen` = tierra o vuelo.
- función `leer_linea_base(indicador: str, origen: str, id: int=Depends(propio), conn=Depends(conexion))`: Devuelve `mediana`, `mad`, `n`, `desde` y `hasta`; 404 si no existe.
- función `crear_alerta(cuerpo: AlertaIn, id: int=Depends(propio), conn=Depends(conexion))`: Guarda la alerta (solo adición). Una roja de la capa A escala al oficial médico (o al comandante si el afectado
- función `listar_alertas(id: int, quien: int=Depends(actor), conn=Depends(conexion))`: Con tu propio id: todas tus alertas. Con el de otro: solo sus alertas rojas escaladas a ti; ese acceso queda
- función `crear_reporte(cuerpo: ReporteIn, id: int=Depends(propio), conn=Depends(conexion))`: Encola un reporte con `retardo_min` de 3 a 22; `llega_t_real` = `creado_t_real` + retardo.
- función `listar_reportes(id: int=Depends(propio), conn=Depends(conexion))`: Reportes del tripulante con `estado` en_cola, entregado o respondido.
- función `avanzar(cuerpo: AvanceIn, quien: int=Depends(actor), conn=Depends(conexion))`: Pasa a `entregado` los reportes con `llega_t_real` <= `ahora`; devuelve `{"entregados": n}`.
- función `responder(reporte_id: int, cuerpo: RespuestaIn, quien: int=Depends(actor), conn=Depends(conexion))`: Responde un reporte ya entregado y no antes de su llegada a tierra; si no, 422.

### Puntos de entrada

- `apps/api/almacen/__main__.py`

### Configuración y fuentes externas

- Variables de entorno: `DATALAKE_DIR`, `VIGIA_DB`

### Dependencias

- Internas: `main`, `rutas_registro`
- Paquetes del monorepo: `packages/i18n`
- Externas: `almacen`, `fastapi`, `pydantic`
- Biblioteca estándar: `datetime`, `hashlib`, `json`, `math`, `os`, `pathlib`, `re`, `sqlite3`, `sys`, `tempfile`, `typing`, `unittest`

### Tests

- `apps/api/test_almacen_alertas.py`: 10 pruebas en Alertas (10)
- `apps/api/test_almacen_base.py`: 4 pruebas en LineaBase (4)
- `apps/api/test_almacen_cola.py`: 4 pruebas en Cola (4)
- `apps/api/test_almacen_db.py`: 4 pruebas en Esquema (4)
- `apps/api/test_almacen_lecturas.py`: 7 pruebas en Lecturas (7)
- `apps/api/test_almacen_tripulacion.py`: 7 pruebas en Tripulacion (7)
- `apps/api/test_api.py`: 9 pruebas en Api (9)
- `apps/api/test_api_registro.py`: 8 pruebas en Registro (8)
<!-- CONTEXT:AUTO:END -->
