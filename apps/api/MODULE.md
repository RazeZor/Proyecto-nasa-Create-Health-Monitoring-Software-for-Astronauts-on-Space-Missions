# Módulo `apps/api`

<!-- CONTEXT:MANUAL:START -->
## Propósito

API FastAPI de solo lectura que expone la zona gold del ETL (`pipelines/reanclaje`): escenarios reanclados y paneles de entorno, para que la app los consuma por HTTP.

## Puntos clave

- No importa el pipeline (regla 3 de la arquitectura): lee `<DATALAKE_DIR>/gold/*.json` y `gold/manifest.json`. No ejecuta el ETL ni escribe nada; para generar datos se corre `pipelines/reanclaje/index.py`.
- Endpoints: `GET /salud`, `GET /gold` (manifiesto) y `GET /gold/{clave}` (escenario o panel; filtros `fuente`, `variable`, `dia_mision` sobre `serie5min` y `diario`).
- La clave se valida contra el manifiesto, así que no se sirven rutas arbitrarias. Antes de responder se comprueba el SHA-256 del archivo contra el manifiesto: si no coincide, 500 (falla cerrado).
- Los paneles se publican con la clave `panel-<nombre del escenario>` (`panel-dosis-equivalente`). Si `index.py panel` se corre con `destino`, el archivo no queda en `gold/` y la API no lo ve.
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
| [main.py](main.py) | 66 | API de solo lectura sobre la zona gold del ETL (pipelines/reanclaje). |
| [test_api.py](test_api.py) | 62 | — |

### API pública

**main.py**

- función `salud()`
- función `listar()`: Manifiesto del gold: una entrada por escenario o panel, con su SHA-256.
- función `leer(clave: str, fuente: str | None=None, variable: str | None=None, dia_mision: int | None=None)`: JSON de un escenario (`ejemplo`) o de un panel (`panel-demo`). Los filtros recortan

### Configuración y fuentes externas

- Variables de entorno: `DATALAKE_DIR`

### Dependencias

- Internas: `main`
- Paquetes del monorepo: `packages/i18n`
- Externas: `fastapi`
- Biblioteca estándar: `hashlib`, `json`, `os`, `pathlib`, `sys`, `tempfile`, `unittest`

### Tests

- `apps/api/test_api.py`: 5 pruebas en Api (5)
<!-- CONTEXT:AUTO:END -->
