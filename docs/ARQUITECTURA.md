# Arquitectura y patrón de carpetas

VIGÍA es un **monorepo organizado por unidad desplegable**. Cada tipo de trabajo tiene su contenedor: ingesta y procesamiento de datos, aplicaciones, librerías compartidas y herramientas. Cada subcarpeta de un contenedor es un **módulo** autocontenido, con su `MODULE.md`, sus dependencias y sus tests. Así, el equipo de datos y el de producto trabajan en paralelo sin pisarse.

```
apps/                 Lo que usa una persona: interfaces y servicios
  web/                PWA a bordo (registro diario, figura humana, alertas, vista de tierra)
  api/                (solo si hace falta) servicio de tierra; el MVP no tiene servidor
pipelines/            Ingesta y procesamiento de datos, de un script a big data
  datalake/           Ingesta GOES, DONKI, RadLab y EDA → zonas raw y curated
packages/             Librerías compartidas, sin efectos secundarios
  engine/             (próximo) motor híbrido A/B/C en TypeScript puro
  schemas/            (próximo) contratos de datos: JSON Schema de filas y fichas
  i18n/               traducciones: español principal, inglés secundario (Python y TS)
tools/                Herramientas del equipo, no van al producto
  contextgen/         Genera el contexto para IA (MODULE.md, docs/context)
docs/                 Arquitectura, setup y contexto generado
documentacion/        Informe técnico del reto (entregable)
```

Las carpetas marcadas "(próximo)" todavía no existen. Se crean cuando haya código, siguiendo esta guía.

## Regla de dependencias

```mermaid
flowchart LR
  apps --> packages
  pipelines --> packages
  pipelines -. datos curated/gold + schemas .-> apps
```

1. `apps/` y `pipelines/` pueden importar de `packages/`.
2. `packages/` **no** importa de `apps/` ni de `pipelines/`, y no hace IO (red, disco o almacenamiento del navegador). Recibe datos y devuelve datos.
3. `apps/` **no** importa código de `pipelines/`, ni al revés. Se comunican solo por **datos**: lo que un pipeline publica (zona curated o gold, o un JSON exportado) con la forma que define `packages/schemas`.
4. Un módulo no importa de otro módulo del mismo contenedor. Si dos lo necesitan, ese código sube a `packages/`.
5. `tools/` no es dependencia de nadie.

El motivo de la regla 3: el informe (§4.1) separa la preparación de datos, que ocurre antes de la misión, del dispositivo de a bordo, que funciona sin conexión. Si la app importara un pipeline, arrastraría dependencias de servidor al navegador.

## `pipelines/`: datos, de un script a big data

Cada pipeline sigue el patrón **medallón**:

| Zona | Nombre en el repo | Qué contiene | Regla |
| --- | --- | --- | --- |
| Bronce | `raw/` | Respuesta original de la fuente | Inmutable: nunca se sobrescribe ni se borra |
| Plata | `curated/` | Filas limpias, deduplicadas, con `t_real` en UTC | Se regenera desde bronce |
| Oro | `gold/` | Agregados listos para consumir (ventanas de misión, índices) | Lo que leen las apps |

Cada escritura queda en un **manifiesto** con fuente, URL, hora, SHA-256 y número de filas. Así cualquier dato es trazable hasta su origen. `pipelines/datalake` ya lo hace para bronce y plata.

Estructura de un pipeline:

```
pipelines/<nombre>/
  MODULE.md             propósito, puntos clave y contrato de salida
  requirements.txt      dependencias propias (el datalake no tiene: solo biblioteca estándar)
  <nombre>.py           o un paquete con extract.py / transform.py / load.py si crece
  index.py              CLI: ingest, read y lo que haga falta
  test_*.py             con fixtures pequeñas en memoria, sin red
  data/                 local e ignorado por git (DATALAKE_DIR lo cambia)
```

Reglas para pipelines:

- **Idempotente:** correr dos veces la misma ventana no duplica filas.
- **Falla cerrado:** si la estructura de la fuente cambia, se lanza un error y no se escribe nada (`EstructuraInesperada`).
- **Escalado:** primero JSON o CSV con la biblioteca estándar. Si el volumen crece, Parquet particionado por `fuente=<f>/fecha=<YYYY-MM-DD>` y Polars o DuckDB. Si no cabe en una máquina, Spark. El contrato de salida y el manifiesto no cambian; solo el motor.
- **Datos fuera de git:** los datos se guardan en `data/` (ignorado) o, en equipo, en un almacenamiento compartido apuntado con `DATALAKE_DIR`. A git solo suben las fixtures de test.
- Cada pipeline nuevo es su propio módulo (`pipelines/biometria/`, `pipelines/watch4/`…) y lee la zona curated de otro solo a través de su API pública (`read()`), nunca abriendo sus archivos directamente.

## `apps/`: front y back

**`apps/web`** (React + Vite, PWA sin conexión; informe §4.3) se organiza **por funcionalidad**, no por tipo de archivo:

```
apps/web/
  package.json
  src/
    app/                 arranque, rutas, providers
    features/
      registro-diario/   components/ hooks/ store.ts index.ts
      figura-humana/
      alertas/
      sincronizacion/    cola de reportes con retardo
      vista-tierra/
    shared/              UI genérica, sin lógica de negocio
  public/                datos JSON exportados por los pipelines, manifest de la PWA
```

Una feature solo expone lo que exporta su `index.ts`. Las features se comunican por el store o por props, no importando archivos internos de otra feature.

**`apps/api`** (solo si hace falta un servidor; el MVP no lo tiene) se organiza **por capas hexagonales**: `dominio/` (reglas puras), `aplicacion/` (casos de uso) y `adaptadores/` (HTTP, base de datos y colas). El dominio no importa adaptadores.

## `packages/`: lógica compartida

- `packages/engine`: motor híbrido (capa A clínica, capa B de desviación personal, capa C de deriva; informe §5.1). Usa funciones puras con tests unitarios: los mismos datos dan siempre el mismo nivel. Lo usan `apps/web` y, si existe, `apps/api`.
- `packages/schemas`: JSON Schema de las filas curadas (`t_real`, fuente…) y de las fichas de indicador (los seis campos del reto más la URL de la fuente). Es el contrato entre `pipelines/` y `apps/`. Si cambia, se versiona.
- `packages/i18n`: catálogos de traducción. Español principal y obligatorio; inglés secundario, que cae al español si falta. Todo texto que ve un usuario sale de aquí.

## De las capas del informe a las carpetas

| Capa (informe §4.2) | Dónde vive |
| --- | --- |
| Ingesta | `pipelines/datalake` |
| Reanclaje a la línea de tiempo de misión | `pipelines/<reanclaje>`, que genera la zona gold |
| Captura, almacén, permisos, decisión, sincronización | `apps/web/src/features/*` |
| Motor híbrido | `packages/engine` |
| Fichas de indicador | `packages/schemas` (forma) + `apps/web/public` (datos) |
| Vista de tierra | `apps/web/src/features/vista-tierra` |

## Convenciones

Los nombres, el idioma, i18n, git, los datos y los tests se definen en [CONVENCIONES.md](CONVENCIONES.md).

## Agregar un módulo nuevo

1. Crea `apps/<x>`, `pipelines/<x>`, `packages/<x>` o `tools/<x>` según lo que sea. Si dudas: si lo usa una persona es `apps/`; si mueve datos, `pipelines/`; si lo comparten dos módulos, `packages/`.
2. Agrega el código y los tests y haz `git add`. En el commit, el hook crea `MODULE.md` con TODOs.
3. Completa el bloque MANUAL de `MODULE.md`: propósito, puntos clave, tags y, en pipelines, el contrato de salida.
4. Si hay tests de Python (`test_*.py`), CI los corre solo. Para tests de Node, agrega el paso en `.github/workflows/context.yml`.

`contextgen --lint` avisa si aparece código fuera de estos contenedores.
