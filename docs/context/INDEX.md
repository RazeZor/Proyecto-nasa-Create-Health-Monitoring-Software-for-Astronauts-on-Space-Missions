# Índice de contexto del repositorio

> Generado por `tools/contextgen/contextgen.py`. No editar a mano: cambia el `MODULE.md` de cada módulo.

Empieza aquí. Cada módulo tiene un `MODULE.md` con su propósito, sus puntos clave y su mapa de código.

| Módulo | Propósito | Tags | Archivos |
| --- | --- | --- | --- |
| [apps/api](../../apps/api/MODULE.md) | API FastAPI de solo lectura que expone la zona gold del ETL (`pipelines/reanclaje`): escenarios reanclados y paneles de entorno, para que la app los consuma por HTTP. | api, fastapi, gold, etl, panel, solo-lectura | 8 |
| [apps/web](../../apps/web/MODULE.md) | Interfaz a bordo de VIGÍA: registro diario, figura humana con el estado por sistema y vista del médico de vuelo. Todavía no está implementada (`app.tsx` está vacío). | frontend, interfaz, react, pwa, offline, motor-híbrido, figura-humana, pendiente | 1 |
| [packages/i18n](../../packages/i18n/MODULE.md) | Traducciones compartidas de VIGÍA. El español es el idioma principal y el inglés el secundario, para Python (`i18n.py`) y TypeScript (`i18n.ts`). | i18n, idiomas, español, inglés, traducciones, packages | 3 |
| [packages/schemas](../../packages/schemas/MODULE.md) | Contratos de datos entre `pipelines/` y `apps/`. Hoy contiene el esquema de las fichas de indicador y la prueba que valida las fichas publicadas en `apps/web/public/fichas/`. | schemas, contratos, fichas, indicadores, json-schema, peligros, hrp | 1 |
| [pipelines/datalake](../../pipelines/datalake/MODULE.md) | Ingesta y datalake local de datos ambientales (radiación) de GOES, DONKI, RadLab y EDA, con un CLI para ingerir y leer. | ingesta, datalake, goes, donki, radlab, eda, radiación, utc, cli | 3 |
| [pipelines/reanclaje](../../pipelines/reanclaje/MODULE.md) | ETL que toma la zona curated de `pipelines/datalake` (GOES, DONKI, RadLab, EDA), reancla cada ventana real a la línea de tiempo de misión y publica la zona gold y el JSON del panel de entorno que consume la app. | etl, reanclaje, gold, rejilla, misión, t_mision, t_real, dosis, co2, flujo-protones | 5 |
| [tools/contextgen](../../tools/contextgen/MODULE.md) | Genera el contexto del repositorio para cualquier asistente de IA: los `MODULE.md`, `docs/context/` y los adaptadores por herramienta. | herramientas, documentación, contexto, ia, agents.md, ci, pre-commit | 2 |
| [tools/validar-referencias](../../tools/validar-referencias/MODULE.md) | Comprueba que las referencias científicas del informe existen y dicen lo que citamos. Consulta Crossref y Europe PMC para cada DOI de `referencias.json`. El resultado legible está en [documentacion/referencias-validadas.md](../../documentacion/referencias-validadas.md). | herramientas, referencias, papers, doi, crossref, europe-pmc, validación, informe | 2 |

## Dónde está cada símbolo

| Símbolo | Tipo | Archivo |
| --- | --- | --- |
| `Almacen` | clase | [pipelines/datalake/test_datalake.py](../../pipelines/datalake/test_datalake.py) |
| `Api` | clase | [apps/api/test_api.py](../../apps/api/test_api.py) |
| `Catalogo` | clase | [tools/validar-referencias/test_validar_referencias.py](../../tools/validar-referencias/test_validar_referencias.py) |
| `Catalogos` | clase | [packages/i18n/test_i18n.py](../../packages/i18n/test_i18n.py) |
| `Construir` | clase | [pipelines/reanclaje/test_reanclaje.py](../../pipelines/reanclaje/test_reanclaje.py) |
| `Esquema` | clase | [apps/api/test_almacen_db.py](../../apps/api/test_almacen_db.py) |
| `EstructuraInesperada` | clase | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `Evaluar` | clase | [tools/validar-referencias/test_validar_referencias.py](../../tools/validar-referencias/test_validar_referencias.py) |
| `Fichas` | clase | [packages/schemas/test_fichas.py](../../packages/schemas/test_fichas.py) |
| `Generador` | clase | [tools/contextgen/test_contextgen.py](../../tools/contextgen/test_contextgen.py) |
| `IDIOMAS` | constante | [packages/i18n/i18n.ts](../../packages/i18n/i18n.ts) |
| `Idioma` | tipo | [packages/i18n/i18n.ts](../../packages/i18n/i18n.ts) |
| `Limpieza` | clase | [pipelines/datalake/test_datalake.py](../../pipelines/datalake/test_datalake.py) |
| `PRINCIPAL` | constante | [packages/i18n/i18n.ts](../../packages/i18n/i18n.ts) |
| `Panel` | clase | [pipelines/reanclaje/test_panel.py](../../pipelines/reanclaje/test_panel.py) |
| `Pasos` | clase | [pipelines/reanclaje/test_reanclaje.py](../../pipelines/reanclaje/test_reanclaje.py) |
| `Publicar` | clase | [pipelines/reanclaje/test_panel.py](../../pipelines/reanclaje/test_panel.py) |
| `Traduccion` | clase | [packages/i18n/test_i18n.py](../../packages/i18n/test_i18n.py) |
| `Tripulacion` | clase | [apps/api/test_almacen_tripulacion.py](../../apps/api/test_almacen_tripulacion.py) |
| `Validar` | clase | [tools/validar-referencias/test_validar_referencias.py](../../tools/validar-referencias/test_validar_referencias.py) |
| `analizar` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `analizar_js` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `analizar_py` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `archivos` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `bloque` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `catalogo` | función | [packages/i18n/i18n.py](../../packages/i18n/i18n.py) |
| `clean_donki` | función | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `clean_eda` | función | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `clean_goes` | función | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `clean_radlab` | función | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `conectar` | función | [apps/api/almacen/db.py](../../apps/api/almacen/db.py) |
| `consentir` | función | [apps/api/almacen/tripulacion.py](../../apps/api/almacen/tripulacion.py) |
| `construir` | función | [pipelines/reanclaje/reanclaje.py](../../pipelines/reanclaje/reanclaje.py) |
| `construir_panel` | función | [pipelines/reanclaje/panel.py](../../pipelines/reanclaje/panel.py) |
| `corrimiento` | función | [pipelines/reanclaje/reanclaje.py](../../pipelines/reanclaje/reanclaje.py) |
| `crear_mision` | función | [apps/api/almacen/tripulacion.py](../../apps/api/almacen/tripulacion.py) |
| `crear_tripulante` | función | [apps/api/almacen/tripulacion.py](../../apps/api/almacen/tripulacion.py) |
| `crossref` | función | [tools/validar-referencias/validar_referencias.py](../../tools/validar-referencias/validar_referencias.py) |
| `d` | función | [pipelines/reanclaje/test_panel.py](../../pipelines/reanclaje/test_panel.py) |
| `detectarIdioma` | función | [packages/i18n/i18n.ts](../../packages/i18n/i18n.ts) |
| `dia_de_vuelo` | función | [apps/api/almacen/tripulacion.py](../../apps/api/almacen/tripulacion.py) |
| `diario` | función | [pipelines/reanclaje/reanclaje.py](../../pipelines/reanclaje/reanclaje.py) |
| `es_test` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `europepmc` | función | [tools/validar-referencias/validar_referencias.py](../../tools/validar-referencias/validar_referencias.py) |
| `evaluar` | función | [tools/validar-referencias/validar_referencias.py](../../tools/validar-referencias/validar_referencias.py) |
| `eventos` | función | [pipelines/reanclaje/reanclaje.py](../../pipelines/reanclaje/reanclaje.py) |
| `faltantes` | función | [tools/validar-referencias/validar_referencias.py](../../tools/validar-referencias/validar_referencias.py) |
| `generar` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `guardar` | función | [pipelines/reanclaje/reanclaje.py](../../pipelines/reanclaje/reanclaje.py) |
| `idioma_actual` | función | [packages/i18n/i18n.py](../../packages/i18n/i18n.py) |
| `ingest` | función | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `leer` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `leer_diario` | función | [apps/api/main.py](../../apps/api/main.py) |
| `leer_escenario` | función | [apps/api/main.py](../../apps/api/main.py) |
| `leer_manual` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `leer_panel` | función | [apps/api/main.py](../../apps/api/main.py) |
| `leer_seccion` | función | [apps/api/main.py](../../apps/api/main.py) |
| `leer_serie` | función | [apps/api/main.py](../../apps/api/main.py) |
| `lint` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `listar_escenarios` | función | [apps/api/main.py](../../apps/api/main.py) |
| `listar_paneles` | función | [apps/api/main.py](../../apps/api/main.py) |
| `main` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `main` | función | [tools/validar-referencias/validar_referencias.py](../../tools/validar-referencias/validar_referencias.py) |
| `manifest` | función | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `medidas` | función | [pipelines/reanclaje/reanclaje.py](../../pipelines/reanclaje/reanclaje.py) |
| `migrar` | función | [apps/api/almacen/db.py](../../apps/api/almacen/db.py) |
| `modulo_de` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `modulos` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `normalizar` | función | [packages/i18n/i18n.py](../../packages/i18n/i18n.py) |
| `normalizar` | función | [packages/i18n/i18n.ts](../../packages/i18n/i18n.ts) |
| `pendientes` | función | [packages/i18n/i18n.py](../../packages/i18n/i18n.py) |
| `pendientes` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `publicar` | función | [pipelines/reanclaje/panel.py](../../pipelines/reanclaje/panel.py) |
| `radlab` | función | [pipelines/reanclaje/test_reanclaje.py](../../pipelines/reanclaje/test_reanclaje.py) |
| `read` | función | [pipelines/datalake/datalake.py](../../pipelines/datalake/datalake.py) |
| `rejilla` | función | [pipelines/reanclaje/reanclaje.py](../../pipelines/reanclaje/reanclaje.py) |
| `render_auto` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `render_indice` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `render_modulo` | función | [tools/contextgen/contextgen.py](../../tools/contextgen/contextgen.py) |
| `ruta_por_defecto` | función | [apps/api/almacen/db.py](../../apps/api/almacen/db.py) |
| `salud` | función | [apps/api/main.py](../../apps/api/main.py) |
| `sembrar_demo` | función | [apps/api/almacen/tripulacion.py](../../apps/api/almacen/tripulacion.py) |
| `t` | función | [packages/i18n/i18n.py](../../packages/i18n/i18n.py) |
| `t` | función | [packages/i18n/i18n.ts](../../packages/i18n/i18n.ts) |
| `t_mision` | función | [apps/api/almacen/tripulacion.py](../../apps/api/almacen/tripulacion.py) |
| `texto_completo` | función | [tools/validar-referencias/validar_referencias.py](../../tools/validar-referencias/validar_referencias.py) |
| `tiene_consentimiento` | función | [apps/api/almacen/tripulacion.py](../../apps/api/almacen/tripulacion.py) |
| `validar` | función | [packages/schemas/test_fichas.py](../../packages/schemas/test_fichas.py) |
| `validar` | función | [pipelines/reanclaje/reanclaje.py](../../pipelines/reanclaje/reanclaje.py) |
| `validar` | función | [tools/validar-referencias/validar_referencias.py](../../tools/validar-referencias/validar_referencias.py) |
