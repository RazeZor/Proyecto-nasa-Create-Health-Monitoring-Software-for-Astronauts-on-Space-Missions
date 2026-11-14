# Índice de contexto del repositorio

> Generado por `tools/contextgen/contextgen.py`. No editar a mano: cambia el `MODULE.md` de cada módulo.

Empieza aquí. Cada módulo tiene un `MODULE.md` con su propósito, sus puntos clave y su mapa de código.

| Módulo | Propósito | Tags | Archivos |
| --- | --- | --- | --- |
| [apps/web](../../apps/web/MODULE.md) | Interfaz a bordo de VIGÍA: registro diario, figura humana con el estado por sistema y vista del médico de vuelo. Todavía no está implementada (`app.tsx` está vacío). | frontend, interfaz, react, pwa, offline, motor-híbrido, figura-humana, pendiente | 1 |
| [pipelines/datalake](../../pipelines/datalake/MODULE.md) | Ingesta y datalake local de datos ambientales (radiación) de GOES, DONKI, RadLab y EDA, con un CLI para ingerir y leer. | ingesta, datalake, goes, donki, radlab, eda, radiación, utc, cli | 3 |
| [tools/contextgen](../../tools/contextgen/MODULE.md) | Genera el contexto del repositorio para cualquier asistente de IA: los `MODULE.md`, `docs/context/` y los adaptadores por herramienta. | herramientas, documentación, contexto, ia, agents.md, ci, pre-commit | 2 |

## Dónde está cada símbolo

| Símbolo | Tipo | Archivo |
| --- | --- | --- |
| `Almacen` | clase | [pipelines/datalake/test_datalake.py](../../pipelines/datalake/test_datalake.py) |
| `EstructuraInesperada` | clase | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `Generador` | clase | [tools/contextgen/test_contextgen.py](../../tools/contextgen/test_contextgen.py) |
| `Limpieza` | clase | [pipelines/datalake/test_datalake.py](../../pipelines/datalake/test_datalake.py) |
| `analizar` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `analizar_js` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `analizar_py` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `archivos` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `bloque` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `clean_donki` | función | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `clean_eda` | función | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `clean_goes` | función | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `clean_radlab` | función | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `es_test` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `generar` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `ingest` | función | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `leer` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `leer_manual` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `lint` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `main` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `manifest` | función | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `modulo_de` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `modulos` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `pendientes` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `read` | función | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `render_auto` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `render_indice` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `render_modulo` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
