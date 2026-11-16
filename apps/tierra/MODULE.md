# Módulo `apps/tierra`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Receptor independiente de ensayo del enlace a Tierra. Persiste mensajes y respuestas en otra base SQLite y confirma identificadores y hashes; no importa código de ninguna otra app.

## Puntos clave

- `uvicorn receptor:app --port 8100` desde esta carpeta. `VIGIA_TIERRA_DB` elige la base (por defecto `data/tierra.db`, ignorada). Una recepción se confirma después del commit, con ID/hash/UTC persistentes tras reinicio.
- `VIGIA_TIERRA_CLAVE` (32 caracteres o más) autoriza recepción/consulta. `VIGIA_TIERRA_OPERADOR_CLAVE` es otra credencial para responder: un mensaje debe existir y cada respuesta enlaza su ID. No hay contraseñas predeterminadas.
- Los IDs repetidos con contenido distinto producen 409. El reloj de a bordo no interviene en el acuse. Es un ensayo de transporte; no acredita una instalación terrestre real, revisión médica ni autorización de vuelo.
- Cada petición tiene su conexión SQLite; `check_same_thread=False` permite las dependencias de FastAPI. No se comparte una conexión entre peticiones. Las pruebas usan carpetas temporales y no hacen red.

tags: tierra, transporte, acuses, sqlite, causalidad, autenticacion
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [receptor.py](receptor.py) | 100 | Proceso Tierra independiente. Arranque: uvicorn receptor:app --port 8100. |
| [test_receptor.py](test_receptor.py) | 50 | Un receptor reiniciado conserva acuses y detecta colisiones. |

### API pública

**receptor.py**

- función `autorizado(authorization: str | None=Header(None))`
- función `operador(authorization: str | None=Header(None))`
- función `conexion()`
- clase `MensajeIn(BaseModel)`
- función `recibir(cuerpo: MensajeIn, request: Request, conn=Depends(conexion))`
- función `consultar(id: str, conn=Depends(conexion))`
- clase `RespuestaIn(BaseModel)`
- función `responder(id: str, cuerpo: RespuestaIn, conn=Depends(conexion))`

### Configuración y fuentes externas

- Variables de entorno: `VIGIA_TIERRA_CLAVE`, `VIGIA_TIERRA_DB`, `VIGIA_TIERRA_OPERADOR_CLAVE`

### Dependencias

- Internas: `receptor`
- Paquetes del monorepo: `packages/i18n`
- Externas: `fastapi`, `pydantic`
- Biblioteca estándar: `datetime`, `hashlib`, `hmac`, `json`, `os`, `pathlib`, `sqlite3`, `sys`, `tempfile`, `typing`, `unittest`

### Tests

- `apps/tierra/test_receptor.py`: 3 pruebas en Receptor (3)
<!-- CONTEXT:AUTO:END -->
