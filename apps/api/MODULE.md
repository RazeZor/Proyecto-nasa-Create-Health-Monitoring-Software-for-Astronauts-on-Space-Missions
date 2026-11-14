# Módulo `apps/api`

<!-- CONTEXT:MANUAL:START -->
## Propósito

API FastAPI de solo lectura que expone la zona gold del ETL (`pipelines/reanclaje`): escenarios reanclados y paneles de entorno, para que la app los consuma por HTTP.

## Puntos clave

- No importa el pipeline (regla 3 de la arquitectura): lee `<DATALAKE_DIR>/gold/*.json` y `gold/manifest.json`. No ejecuta el ETL ni escribe nada; para generar datos se corre `pipelines/reanclaje/index.py`.
- Endpoints: `GET /salud`; `GET /escenarios`, `/escenarios/{nombre}` (filtros `fuente`, `variable`, `dia_mision`), `/escenarios/{nombre}/serie` y `/diario`; `GET /paneles`, `/paneles/{nombre}` y `/paneles/{nombre}/{dosis|protones|cabina|eventos}`.
- Documentación para agentes: `AGENTES.md` (cómo leer los datos y sus trampas) y `GET /openapi.json` (contrato, con resumen y descripción en cada ruta). Un test exige que cada ruta tenga ambos y aparezca en la guía; al agregar una ruta, documéntala en las dos partes.
- Escenario o panel se distingue por el resumen del manifiesto del ETL (`serie5min` = escenario, `dosis` = panel), no por el nombre: un escenario puede llamarse `panel-demo`. La API agrega `panel-` por dentro: el panel del escenario `x` es `/paneles/x` (archivo `panel-x.json`). Pedir un escenario como panel, o al revés, da 404.
- La clave se valida contra el manifiesto, así que no se sirven rutas arbitrarias. Antes de responder se comprueba el SHA-256 del archivo contra el manifiesto: si no coincide, 500 (falla cerrado).
- Si `index.py panel` se corre con `destino`, el archivo no queda en `gold/` y la API no lo ve.
- Arranque: `uvicorn main:app --port 8000` desde `apps/api`. `DATALAKE_DIR` apunta a otro datalake; por defecto usa `pipelines/datalake/data`.
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
| [almacen/db.py](almacen/db.py) | 36 | Conexión y migraciones del almacén SQLite (solo biblioteca estándar). |
| [almacen/lecturas.py](almacen/lecturas.py) | 47 | Lecturas de indicadores y síntomas de un tripulante. |
| [almacen/tripulacion.py](almacen/tripulacion.py) | 76 | Misión, tripulantes y consentimiento; conversión de t_real a hora de misión. |
| [main.py](main.py) | 127 | API de solo lectura sobre la zona gold del ETL (pipelines/reanclaje). |
| [test_almacen_alertas.py](test_almacen_alertas.py) | 108 | — |
| [test_almacen_base.py](test_almacen_base.py) | 40 | — |
| [test_almacen_db.py](test_almacen_db.py) | 38 | — |
| [test_almacen_lecturas.py](test_almacen_lecturas.py) | 63 | — |
| [test_almacen_tripulacion.py](test_almacen_tripulacion.py) | 54 | — |
| [test_api.py](test_api.py) | 89 | — |

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

- función `salud()`: Devuelve {"estado": "ok"} si el servicio responde. No toca el gold.
- función `listar_escenarios()`: Lista de `nombre` válidos para `/escenarios/{nombre}`. Vacía si el ETL no ha publicado nada.
- función `leer_escenario(nombre: str, fuente: str | None=None, variable: str | None=None, dia_mision: int | None=None)`: Objeto con `escenario`, `ventanas` (fuente y fechas reales de cada serie), `serie5min`, `diario` y `eventos`
- función `leer_serie(nombre: str, fuente: str | None=None, variable: str | None=None, dia_mision: int | None=None)`: Lista de puntos `{t_mision, t_real, fuente, serie, variable, valor, n, naturaleza}`. `n` = lecturas dentro
- función `leer_diario(nombre: str, fuente: str | None=None, variable: str | None=None, dia_mision: int | None=None)`: Lista de `{dia_mision, fuente, serie, variable, max, bins}` más `dosis` (en las tasas de dosis, µGy o µSv
- función `listar_paneles()`: Lista de `nombre` válidos para `/paneles/{nombre}`; coincide con el escenario del que sale cada panel.
- función `leer_panel(nombre: str)`: Objeto con `limites`, `perfiles_presion_mmhg`, `ventanas`, `aviso`, `dosis` (puede ser null), `protones`,
- función `leer_seccion(nombre: str, seccion: Literal['dosis', 'protones', 'cabina', 'eventos'])`: Solo `dosis` (objeto o null), `protones`, `cabina` o `eventos` (listas). Otra sección da 422.

### Puntos de entrada

- `apps/api/almacen/__main__.py`

### Configuración y fuentes externas

- Variables de entorno: `DATALAKE_DIR`, `VIGIA_DB`

### Dependencias

- Internas: `main`
- Paquetes del monorepo: `packages/i18n`
- Externas: `almacen`, `fastapi`
- Biblioteca estándar: `datetime`, `hashlib`, `json`, `math`, `os`, `pathlib`, `re`, `sqlite3`, `sys`, `tempfile`, `typing`, `unittest`

### Tests

- `apps/api/test_almacen_alertas.py`: 10 pruebas en Alertas (10)
- `apps/api/test_almacen_base.py`: 4 pruebas en LineaBase (4)
- `apps/api/test_almacen_db.py`: 4 pruebas en Esquema (4)
- `apps/api/test_almacen_lecturas.py`: 7 pruebas en Lecturas (7)
- `apps/api/test_almacen_tripulacion.py`: 7 pruebas en Tripulacion (7)
- `apps/api/test_api.py`: 9 pruebas en Api (9)
<!-- CONTEXT:AUTO:END -->
