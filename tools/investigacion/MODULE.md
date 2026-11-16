# Módulo `tools/investigacion`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Recopilar las fuentes públicas de los diez ganadores globales de Space Apps 2025 y registrar qué se pudo consultar, con procedencia y hashes para la comparación de VIGÍA.

## Puntos clave

- Solo biblioteca estándar; descarga secuencial, tiempo límite y tamaño máximo por documento. `fuentes.json` mantiene URLs, categoría y relación con cada proyecto, sin perfiles personales ni contactos.
- `investigar.py` guarda respuestas/textos y un manifiesto en `data/`, ignorado por Git. Nunca ejecuta código de proyectos ajenos ni publica sus páginas completas en el repositorio.
- HTTPS se verifica siempre. `--lector` permite una segunda consulta a r.jina.ai, declarada como representación de un tercero: no se confunde con descarga directa ni acredita que un demo o repositorio funcione.
- Los fallos y el alcance de lectura quedan explícitos. Un premio, descripción de autor o README no equivale a una validación independiente ni prueba por qué ganó un proyecto.

tags: investigacion, spaceapps, ganadores, fuentes, scraping, procedencia
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [investigar.py](investigar.py) | 111 | Recopilar ganadores 2025: python tools/investigacion/investigar.py [--lector]. |
| [test_investigar.py](test_investigar.py) | 43 | — |

### API pública

**investigar.py**

- clase `TextoPublico(HTMLParser)`: Texto y enlaces visibles; excluye scripts y estilos sin interpretar JavaScript.
- función `descargar(url)`
- función `consultar(url, destino, lector=False, obtener=descargar)`
- función `main(argv=None)`

### Puntos de entrada

- `tools/investigacion/investigar.py`

### Dependencias

- Internas: `investigar`
- Externas: ninguna
- Biblioteca estándar: `argparse`, `datetime`, `hashlib`, `html`, `json`, `pathlib`, `re`, `tempfile`, `time`, `unittest`, `urllib`

### Tests

- `tools/investigacion/test_investigar.py`: 4 pruebas en Investigacion (4)
<!-- CONTEXT:AUTO:END -->
