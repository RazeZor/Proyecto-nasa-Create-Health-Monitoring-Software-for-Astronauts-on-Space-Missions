# Módulo `packages/i18n`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Traducciones compartidas de VIGÍA. El español es el idioma principal y el inglés el secundario, para Python (`i18n.py`) y TypeScript (`i18n.ts`).

## Puntos clave

- `locales/es.json` es la fuente de verdad y el **único obligatorio**. Toda clave nueva nace ahí, en español.
- `locales/en.json` es **secundario**: puede ir atrasado. Una clave sin traducir muestra el texto en español y no rompe tests ni CI. `python packages/i18n/i18n.py` lista lo pendiente; CI lo informa sin fallar.
- Lo que sí falla en CI: claves en `en.json` que no existen en `es.json`, textos vacíos, o `{variables}` distintas entre idiomas.
- Las claves van anidadas por área y se usan con puntos: `alertas.rojo`, `cli.datalake.uso`. Una clave inexistente devuelve la propia clave, para que se note en pantalla.
- Python: `t(clave, idioma=None, **variables)`. El idioma sale de `VIGIA_LANG` (`es` por defecto). Desde otro módulo se importa agregando `packages/i18n` al `sys.path` (ver `pipelines/datalake/index.py`).
- TypeScript: `t(clave, idioma, variables)` es puro. La app elige el idioma con `detectarIdioma(preferenciaGuardada, navigator.language)`. Requiere `resolveJsonModule`; los JSON se importan con `with { type: "json" }` para que el mismo archivo corra en Node (tests) y en el empaquetador.
- Todos los textos de `apps/web` viven en el subárbol `web` (`web.S.*` para la interfaz y `web.MOTOR.*` para las alertas del motor); `apps/web/lib/strings.ts` solo les da forma y tipos. Un texto nuevo de la interfaz nace aquí, en español.
- Las dos implementaciones deben comportarse igual. Si cambias una, cambia la otra.

## Relación con el informe

- §6.1 Usuarios (tripulación y médicos de vuelo de agencias asociadas) y §8.1–8.2 (entrega en español e inglés).

tags: i18n, idiomas, español, inglés, traducciones, packages
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [i18n.py](i18n.py) | 71 | Traducciones de VIGÍA: español es el idioma principal e inglés el secundario. |
| [i18n.ts](i18n.ts) | 45 | Traducciones de VIGÍA: español es el idioma principal e inglés el secundario. |
| [test_i18n.py](test_i18n.py) | 58 | — |

### API pública

**i18n.py**

- función `catalogo(idioma)`: {clave.con.puntos: texto} del idioma.
- función `normalizar(idioma)`: 'en-US', 'EN_us' → 'en'; cualquier idioma no soportado → el principal.
- función `idioma_actual()`
- función `t(clave, idioma=None, **variables)`: Texto traducido de la clave, con {variables} reemplazadas.
- función `pendientes(idioma='en')`: Claves de es.json que aún no están traducidas en el idioma secundario.

**i18n.ts**

- tipo `Idioma`
- constante `PRINCIPAL`
- constante `IDIOMAS`
- función `normalizar`
- función `detectarIdioma`
- función `t`

### Puntos de entrada

- `packages/i18n/i18n.py`

```
python packages/i18n/i18n.py        lista las traducciones al inglés pendientes
```

### Configuración y fuentes externas

- Variables de entorno: `VIGIA_LANG`

### Dependencias

- Internas: `./locales/en.json`, `./locales/es.json`, `i18n`
- Externas: ninguna
- Biblioteca estándar: `functools`, `json`, `os`, `pathlib`, `re`, `sys`, `unittest`

### Tests

- `packages/i18n/test_i18n.py`: 8 pruebas en Catalogos (3), Traduccion (5)
<!-- CONTEXT:AUTO:END -->
