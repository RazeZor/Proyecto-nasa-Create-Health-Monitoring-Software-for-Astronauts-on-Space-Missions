# Módulo `apps/api`

<!-- CONTEXT:MANUAL:START -->
## Propósito

API FastAPI de solo lectura que expone la zona gold del ETL (`pipelines/reanclaje`): escenarios reanclados y paneles de entorno, para que la app los consuma por HTTP.

## Puntos clave

- No importa el pipeline (regla 3 de la arquitectura): lee `<DATALAKE_DIR>/gold/*.json` y `gold/manifest.json`. No ejecuta el ETL ni escribe nada; para generar datos se corre `pipelines/reanclaje/index.py`.
- Endpoints: `GET /salud`; `GET /escenarios`, `/escenarios/{nombre}` (filtros `fuente`, `variable`, `dia_mision`), `/escenarios/{nombre}/serie` y `/diario`; `GET /paneles`, `/paneles/{nombre}` y `/paneles/{nombre}/{dosis|protones|cabina|eventos}`.
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
| [main.py](main.py) | 103 | API de solo lectura sobre la zona gold del ETL (pipelines/reanclaje). |
| [test_api.py](test_api.py) | 82 | — |

### API pública

**main.py**

- función `salud()`
- función `listar_escenarios()`
- función `leer_escenario(nombre: str, fuente: str | None=None, variable: str | None=None, dia_mision: int | None=None)`: Gold completo; los filtros recortan `serie5min` y `diario`.
- función `leer_serie(nombre: str, fuente: str | None=None, variable: str | None=None, dia_mision: int | None=None)`
- función `leer_diario(nombre: str, fuente: str | None=None, variable: str | None=None, dia_mision: int | None=None)`
- función `listar_paneles()`
- función `leer_panel(nombre: str)`
- función `leer_seccion(nombre: str, seccion: Literal['dosis', 'protones', 'cabina', 'eventos'])`

### Configuración y fuentes externas

- Variables de entorno: `DATALAKE_DIR`

### Dependencias

- Internas: `main`
- Paquetes del monorepo: `packages/i18n`
- Externas: `fastapi`
- Biblioteca estándar: `hashlib`, `json`, `os`, `pathlib`, `sys`, `tempfile`, `typing`, `unittest`

### Tests

- `apps/api/test_api.py`: 8 pruebas en Api (8)
<!-- CONTEXT:AUTO:END -->
