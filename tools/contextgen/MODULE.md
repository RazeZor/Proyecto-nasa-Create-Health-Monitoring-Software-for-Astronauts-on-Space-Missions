# Módulo `tools/contextgen`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Genera el contexto del repositorio para cualquier asistente de IA: los `MODULE.md`, `docs/context/` y los adaptadores por herramienta.

## Puntos clave

- Un módulo es cada subcarpeta de `apps/`, `pipelines/`, `packages/` o `tools/` (`CONTENEDORES`, `modulo_de()`) con archivos de código versionados (`git ls-files --cached`). El código fuera de esos contenedores se documenta igual, pero `--lint` avisa. Los archivos sin `git add` no aparecen. Se omiten `data/`, `node_modules/`, `__pycache__/` y las carpetas ocultas.
- En cada `MODULE.md`, el bloque `CONTEXT:MANUAL` nunca se modifica; solo se reescribe `CONTEXT:AUTO`. Si falta, se crea con una plantilla de TODOs.
- Python se analiza con `ast` (sin ejecutar código). TS/JS se analiza con regex ligeras: solo `export` e `import`, sin firmas.
- La salida es determinista (orden estable, sin fechas, LF). Por eso `--check` coincide entre máquinas y CI. Al comparar, normaliza CRLF.
- `ADAPTADORES` define los archivos por herramienta (Claude, Gemini/Antigravity, Copilot, Cursor, Windsurf, Cline). Todos apuntan a `AGENTS.md`. Para sumar una herramienta, agrega una línea ahí.
- `--lint` solo avisa (no falla): TODOs pendientes, o código del módulo en stage sin cambios en su bloque MANUAL.
- El hook `.githooks/pre-commit` regenera y hace `git add` solo de los archivos que cambió.

## Relación con el informe

- No implementa secciones del informe. Es infraestructura del equipo.

tags: herramientas, documentación, contexto, ia, agents.md, ci, pre-commit
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [contextgen.py](contextgen.py) | 409 | Genera el contexto del repositorio para cualquier asistente de IA (AGENTS.md). |
| [test_contextgen.py](test_contextgen.py) | 149 | — |

### API pública

**contextgen.py**

- función `archivos(root)`: Archivos versionados (o en el índice) de root; sin git, recorre la carpeta.
- función `modulo_de(ruta)`: Módulo al que pertenece una ruta: <contenedor>/<nombre> o, fuera del patrón, la carpeta de primer nivel.
- función `modulos(root)`: {módulo: [rutas de código]}. Ver docs/ARQUITECTURA.md.
- función `es_test(ruta)`
- función `leer(path)`
- función `analizar_py(texto)`
- función `analizar_js(texto)`
- función `analizar(root, ruta)`
- función `render_auto(nombre, infos)`
- función `bloque(texto, ini, fin)`
- función `render_modulo(nombre, infos, actual)`
- función `leer_manual(texto)`: (propósito, puntos clave, tags) del bloque MANUAL.
- función `render_indice(datos)`
- función `generar(root)`: {ruta relativa: contenido esperado} de todo lo que mantiene el generador.
- función `pendientes(root, esperado)`
- función `lint(root)`
- función `main(argv=None)`

### Puntos de entrada

- `tools/contextgen/contextgen.py`

```
python tools/contextgen/contextgen.py           regenera y lista los archivos que cambió
python tools/contextgen/contextgen.py --check   sale con 1 si algo está desactualizado
python tools/contextgen/contextgen.py --lint    avisa de puntos clave pendientes o sin tocar
```

### Dependencias

- Internas: `contextgen`
- Externas: ninguna
- Biblioteca estándar: `argparse`, `ast`, `contextlib`, `io`, `json`, `pathlib`, `re`, `subprocess`, `sys`, `tempfile`, `textwrap`, `unittest`

### Tests

- `tools/contextgen/test_contextgen.py`: 9 pruebas en Generador (9)
<!-- CONTEXT:AUTO:END -->
