# Módulo `pipelines/datalake`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Ingesta y datalake local de datos ambientales (radiación) de GOES, DONKI, RadLab y EDA, con un CLI para ingerir y leer.

## Puntos clave

- DONKI prioriza `https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP`, según el cambio publicado por NASA CCMC. Conserva los espejos; elimina claves/tokens de las URLs persistidas y de los errores de fallback. El saneamiento conserva literalmente operadores y campos sin valor de RadLab para no cambiar una consulta reproducible.
- Raw se crea en modo exclusivo: una colisión nunca sobrescribe el original. El manifiesto se reemplaza atómicamente; sigue requiriendo un único escritor (no hay bloqueo entre procesos).

- Estructura: `data/raw/<fuente>/<fecha>/<hora>-<sha8>.<ext>` guarda la respuesta original y nunca se sobrescribe. `data/curated/...json` guarda las filas limpias. `data/manifest.json` registra fuente, URL, hora de consulta, SHA-256 y número de filas.
- Si una fuente cambia de estructura, `clean_*` lanza `EstructuraInesperada` (mensaje `ESTRUCTURA_INESPERADA`) **antes** de escribir, así que una ingesta fallida no deja archivos.
- Toda hora se normaliza a UTC en `t_real` (`YYYY-MM-DDTHH:MM:SSZ`). `read(fuente, desde, hasta)` filtra comparando esas cadenas.
- GOES conserva solo `>=10`, `>=50` y `>=100 MeV`, descarta flujos negativos (relleno) y deduplica por (hora, satélite, energía).
- DONKI prueba tres direcciones en orden (nueva, anterior y espejo `api.nasa.gov`). `NASA_API_KEY` viaja solo al espejo, para que no quede en el manifiesto de las otras. Una respuesta vacía significa "sin eventos".
- RadLab recibe una consulta cruda (claves sueltas y operadores, p. ej. `spacecraft=ISS "timestamp>=2024-05-10T00:00" absorbed_dose_rate`) o un diccionario en el que `ingest("radlab", params)` solicita por defecto `instrument_id`, `absorbed_dose_rate` y `dose_equivalent_rate`. Los DosTel no traen `dose_equivalent_rate` (llega vacío).
- EDA tiene API (`/eda/api/missions/{mision}/telemetry_data/`, aunque el informe §3.3 dice que no): `ingest eda mision=RR-1 start=... end=...` trae temperatura, humedad y CO2 de ISS y tierra cada 5 min, y cada fila lleva su `mision`. La telemetría de otras misiones y `radiation_data` no se han probado (esta última devolvió 500 en una ventana de prueba).
- `DATALAKE_DIR` cambia la carpeta del datalake (por defecto `pipelines/datalake/data/`, ignorada por git).
- Implementa las zonas bronce (`raw`) y plata (`curated`) del patrón de datos (docs/ARQUITECTURA.md). Otros pipelines leen `curated` con `read()`, no los archivos directamente.
- Los mensajes del CLI (`index.py`) salen de `packages/i18n` (claves `cli.datalake.*`): español por defecto, inglés con `VIGIA_LANG=en`. El detalle de los errores internos sigue en español.
- Solo biblioteca estándar. El manifiesto supone un único proceso escribiendo; con ingestas concurrentes hace falta un bloqueo.
- En los tests, `dl.ROOT` y `dl._get` se reemplazan para trabajar sin red y en una carpeta temporal.

## Relación con el informe

- §3.3 Ingesta y puntos de acceso. §3.4 Sincronización temporal (hora real `t_real`). §4.2 Capa de ingesta.

tags: ingesta, datalake, goes, donki, radlab, eda, radiación, utc, cli
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [datalake.py](datalake.py) | 244 | Datalake local de VIGÍA (informe técnico, secciones 3.3 y 4.2). |
| [index.py](index.py) | 35 | CLI del datalake. Mensajes en español por defecto; VIGIA_LANG=en para inglés. |
| [test_datalake.py](test_datalake.py) | 145 | — |

### API pública

**datalake.py**

- clase `EstructuraInesperada(ValueError)`: La fuente devolvió otra estructura: no se guarda nada (informe 3.3).
- función `clean_goes(raw)`
- función `clean_donki(raw)`
- función `clean_radlab(raw)`
- función `clean_eda(raw)`
- función `manifest()`
- función `ingest(fuente, params=None)`: Descarga, limpia y guarda. Si la estructura no es la esperada no escribe nada.
- función `read(fuente, desde=None, hasta=None)`: Filas limpias de la fuente, sin duplicados; desde/hasta son t_real ISO UTC.

### Puntos de entrada

- `pipelines/datalake/index.py`

```
python3 index.py ingest goes|donki|radlab|eda [clave=valor ...]
python3 index.py read <fuente> [desde] [hasta]
python3 index.py manifest
```

### Configuración y fuentes externas

- Variables de entorno: `DATALAKE_DIR`, `NASA_API_KEY`
- `EDA_URL`: https://visualization.osdr.nasa.gov/eda/api/missions/{mision}/telemetry_data/
- `GOES_URL`: https://services.swpc.noaa.gov/json/goes/primary/integral-protons-1-day.json
- `DONKI_URLS`: https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP
- `DONKI_URLS`: https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP
- `DONKI_URLS`: https://api.nasa.gov/DONKI/SEP
- `RADLAB_URL`: https://visualization.osdr.nasa.gov/radlab/api/

### Dependencias

- Internas: `datalake`
- Paquetes del monorepo: `packages/i18n`
- Externas: ninguna
- Biblioteca estándar: `csv`, `datetime`, `hashlib`, `importlib`, `io`, `json`, `os`, `pathlib`, `sys`, `tempfile`, `unittest`, `urllib`

### Tests

- `pipelines/datalake/test_datalake.py`: 12 pruebas en Raiz (1), Limpieza (4), Almacen (7)
<!-- CONTEXT:AUTO:END -->
