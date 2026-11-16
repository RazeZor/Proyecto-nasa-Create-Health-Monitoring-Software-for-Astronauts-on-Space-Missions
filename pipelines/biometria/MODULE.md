# Módulo `pipelines/biometria`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Adquirir y preparar fisiología humana pública de referencia, conservando originales, licencia, tiempos relativos y trazabilidad. La primera fuente es MMASH v1.0.0; no se mezcla con tripulantes actuales ni se usa como validación clínica del motor.

## Puntos clave

- Solo biblioteca estándar. `python pipelines/biometria/index.py mmash [--desde CARPETA]` descarga desde PhysioNet o verifica originales locales y publica un resumen en el gold compartido. Los datos viven en `data/`, ignorada por Git.
- MMASH se verifica contra SHA256SUMS y los hashes de la versión oficial consultada. Raw usa nombres por contenido y creación exclusiva; nunca se extrae el ZIP al sistema de archivos. Se limita tamaño, rutas, duplicados y volumen descomprimido antes de procesar.
- Importa RR y periodos de sueño de todos los sujetos disponibles. Conserva cantidades/ausencias, agrega intervalos positivos con tiempo interpretable a medianas de 5 min y transforma TST de minutos a horas. `60/IBI` es una frecuencia derivada exploratoria, no FC en reposo validada ni HRV.
- Días 1/2 y horas del estudio siguen siendo relativos; `t_real` de medición es null. La hora UTC de importación no se usa como fecha de observación. No se inventan ánimo 1–10 ni signos ausentes a partir de cuestionarios o ceros.
- La versión adquirida contiene 47.599 intervalos con día original `-29`, incompatible con los días positivos documentados: se conservan íntegros en raw y se cuentan por sujeto, sin agregarlos a una fecha inventada ni corregirlos automáticamente.
- Raw conserva también los archivos que no se normalizan. El gold detalla los campos procesados y las limitaciones: referencia humana terrestre de 24 h, sin evaluación clínica ni prueba de deriva de semanas.
- Curated, gold y manifiestos se publican atómicamente por archivo, con SHA-256 y un único escritor. La API consume el contrato de datos; no importa el pipeline. Repetir la misma entrada/procesador conserva artefactos y cantidades.

tags: biometria, mmash, fisiologia, referencia, humanos, sueno, intervalos, trazabilidad
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [index.py](index.py) | 26 | CLI de importación fisiológica. El idioma se resuelve con el catálogo compartido. |
| [mmash.py](mmash.py) | 240 | MMASH: originales verificados y referencia fisiológica; sin fechas UTC de toma inventadas. |
| [test_mmash.py](test_mmash.py) | 77 | Integridad, tiempos relativos y repetición con archivos artificiales pequeños; sin red. |

### API pública

**index.py**

- función `main()`

**mmash.py**

- clase `EstructuraInesperada(ValueError)`: Estructura incompatible: no publicar datos parciales.
- función `sha256(contenido)`
- función `normalizar(contenido)`: Normalizar RR/sueño sin extraer rutas ni convertir los tiempos relativos en calendario.
- función `verificar_archivos(archivos)`: Verificar sumas del proveedor y fijación de la versión antes de escribir raw/curated/gold.
- función `importar_mmash(desde=None, raiz=None, gold=None)`: Descargar/verificar, normalizar y publicar referencia; solo un escritor por manifiesto.

### Puntos de entrada

- `pipelines/biometria/index.py`

### Configuración y fuentes externas

- Variables de entorno: `DATALAKE_DIR`

### Dependencias

- Internas: `mmash`
- Paquetes del monorepo: `packages/i18n`
- Externas: `validador`
- Biblioteca estándar: `argparse`, `collections`, `csv`, `datetime`, `hashlib`, `io`, `json`, `math`, `os`, `pathlib`, `re`, `statistics`, `sys`, `tempfile`, `unittest`, `urllib`, `zipfile`

### Tests

- `pipelines/biometria/test_mmash.py`: 4 pruebas en Biometria (4)
<!-- CONTEXT:AUTO:END -->
