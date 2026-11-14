# Módulo `tools/sincro-smart`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Avisa al repositorio smart-monitor (servidor y app del Galaxy Watch4) de los cambios de VIGÍA que lo afectan: escribe en `<SMART_DIR>/PENDIENTES-VIGIA.md` qué hay que revisar allí.

## Puntos clave

- Lo llaman los hooks `.githooks/post-commit` (`HEAD~1..HEAD`), `post-merge` y `post-rewrite` (`ORIG_HEAD..HEAD`). Se activan con `git config core.hooksPath .githooks`, igual que el pre-commit.
- `SMART_DIR` sale de `--smart`, de la variable de entorno o del `.env` de la raíz. Sin carpeta válida no hace nada y sale con 0: los hooks nunca bloquean.
- Qué afecta a smart-monitor lo decide `REGLAS` (patrones de ruta, qué es y qué revisar). Si cambia el contrato del puente (`apps/api/puente_reloj.py`), actualiza también la regla correspondiente.
- Idempotente: cada entrada lleva la marca `<!-- vigia:<rango> -->` y no se repite. Solo agrega al final; nunca borra ni hace commits en smart-monitor.
- `evaluar()` y `bloque()` son puras; el IO está en `cambios()` (git) y `agregar()` (archivo). Solo biblioteca estándar.
- `--simular` imprime la entrada sin escribirla, útil para revisar un rango (`--desde main`).

## Relación con el informe

- Anexo A (Galaxy Watch4 como sustituto de demostración): mantiene alineado el contrato entre VIGÍA y el servidor del reloj.

tags: herramientas, reloj, galaxy-watch, smart-monitor, hooks, git, sincronizacion
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [sincro_smart.py](sincro_smart.py) | 173 | Avisa al repositorio smart-monitor (servidor y app del Galaxy Watch4) de los cambios de VIGÍA que lo afectan. |
| [test_sincro_smart.py](test_sincro_smart.py) | 65 | — |

### API pública

**sincro_smart.py**

- función `evaluar(archivos)`: [(qué es, qué revisar, archivos que lo tocaron)] para las reglas que aplican. Pura.
- función `bloque(id_rango, commits, pendientes, cuando)`: Texto Markdown de una entrada, con la marca que evita repetirla.
- función `agregar(ruta, texto, id_rango)`: Agrega la entrada al final. False si esa entrada ya estaba (idempotente).
- función `cambios(desde, hasta)`: (archivos cambiados, [(hash, asunto)]) entre `desde` y `hasta`. Sin `desde` válido: solo `hasta`.
- función `dir_smart(argumento=None)`: Carpeta de smart-monitor: argumento, variable SMART_DIR o `SMART_DIR=` del .env. None si no hay.
- función `main(argv=None)`

### Puntos de entrada

- `tools/sincro-smart/sincro_smart.py`

```
python tools/sincro-smart/sincro_smart.py                       # último commit (HEAD~1..HEAD)
python tools/sincro-smart/sincro_smart.py --desde ORIG_HEAD     # lo que trajo un pull o un merge
python tools/sincro-smart/sincro_smart.py --desde main --simular   # muestra el resultado sin escribir
```

### Configuración y fuentes externas

- Variables de entorno: `SMART_DIR`

### Dependencias

- Internas: `sincro_smart`
- Externas: ninguna
- Biblioteca estándar: `argparse`, `datetime`, `fnmatch`, `os`, `pathlib`, `subprocess`, `sys`, `tempfile`, `unittest`

### Tests

- `tools/sincro-smart/test_sincro_smart.py`: 7 pruebas en Evaluar (4), Archivo (3)
<!-- CONTEXT:AUTO:END -->
