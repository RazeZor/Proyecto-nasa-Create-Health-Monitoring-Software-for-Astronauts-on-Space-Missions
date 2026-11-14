# Convenciones del repositorio

Reglas que siguen todas las personas y todos los asistentes de IA que trabajan en VIGÍA. Si una regla estorba, se cambia con un PR a este archivo, no se ignora. La estructura de carpetas está en [ARQUITECTURA.md](ARQUITECTURA.md); la configuración del entorno, en [SETUP.md](SETUP.md).

Las marcadas con **(CI)** las verifica la integración continua y bloquean el merge. El resto se revisa en el PR.

## 1. Idioma

| Qué | Idioma |
| --- | --- |
| Identificadores, comentarios y docstrings | Español |
| Documentación, `MODULE.md`, commits, ramas y PR | Español |
| Mensajes de error internos y logs para devs | Español |
| **Texto que ve un usuario** (interfaz, CLI, reportes) | **Vía i18n**: español principal, inglés secundario (sección 2) |
| Nombres impuestos por terceros (campos de una API, `timestamp`, `flux`) | Se conservan tal cual |

## 2. Internacionalización (i18n)

El **español es el idioma principal y el único obligatorio**. El **inglés es secundario**: se traduce cuando se pueda y nunca bloquea un cambio.

- Todo texto visible para un usuario sale de `packages/i18n` con `t("area.clave")`. No se escriben strings literales en la interfaz ni en los mensajes de un CLI.
- Toda clave nueva se agrega **primero en `packages/i18n/locales/es.json`**, con el texto en español.
- `en.json` puede ir atrasado: una clave sin traducir muestra el español. Para ver lo pendiente: `python packages/i18n/i18n.py` (CI lo informa sin fallar).
- **(CI)** Prohibido: claves en `en.json` que no existan en `es.json`, textos vacíos, o `{variables}` distintas entre idiomas.
- Claves en español, en minúscula, sin tildes ni ñ, anidadas por área: `alertas.rojo`, `registro_diario.titulo`, `cli.datalake.error`.
- Variables con llaves y nombre en español: `"error: {detalle}"`. No concatenes textos traducidos: arma la frase completa en el catálogo.
- El idioma por defecto es `es`. En Python se elige con `VIGIA_LANG=en`; en la web, con `detectarIdioma(preferenciaGuardada, navigator.language)`.
- Las horas y los números se formatean al mostrarlos con el idioma activo (`Intl.DateTimeFormat`); se guardan siempre en UTC (sección 6).

## 3. Estructura

- **(CI, aviso)** El código vive en `apps/`, `pipelines/`, `packages/` o `tools/`. Cada subcarpeta es un módulo con su `MODULE.md` ([ARQUITECTURA.md](ARQUITECTURA.md)).
- `apps` y `pipelines` pueden importar de `packages`. `apps` y `pipelines` no se importan entre sí. Un módulo no importa de otro del mismo contenedor.
- `packages/` no hace IO (red, disco o almacenamiento del navegador). Recibe datos y devuelve datos.
- Cada módulo declara sus dependencias en su carpeta (`requirements.txt` o `package.json`). `pipelines/datalake`, `packages/i18n` y `tools/contextgen` usan **solo la biblioteca estándar**.

## 4. Nombres

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Carpetas y módulos | minúscula, `kebab-case` | `registro-diario`, `pipelines/datalake` |
| Archivos Python | `snake_case.py` | `datalake.py`, `test_datalake.py` |
| Funciones y variables Python | `snake_case` | `clean_goes`, `t_real` |
| Clases | `PascalCase` | `EstructuraInesperada` |
| Constantes | `MAYUSCULAS` | `GOES_URL`, `PRINCIPAL` |
| Privado (no es API pública) | prefijo `_` | `_get`, `_utc` |
| Archivos TS/JS | `kebab-case.ts` | `figura-humana.ts` |
| Componentes React | `PascalCase.tsx` | `FiguraHumana.tsx` |
| Funciones y variables TS | `camelCase` | `detectarIdioma` |
| Variables de entorno | `MAYUSCULAS`, prefijo `VIGIA_` si son propias | `VIGIA_LANG`, `DATALAKE_DIR`, `NASA_API_KEY` |
| Claves i18n | `area.sub_area.clave` | `cli.datalake.uso` |

## 5. Git

- **Ramas:** `<tipo>/<tema-en-kebab-case>` desde `main` actualizado. Los tipos son `feat`, `fix`, `docs`, `refactor`, `test`, `data` (pipelines y fuentes) y `chore`. Ejemplo: `feat/figura-humana`.
- **Commits:** en español, en infinitivo y con la primera línea de 72 caracteres como máximo: `Agregar ingesta de RadLab`, `Corregir zona horaria de DONKI`. El cuerpo explica el porqué cuando no es obvio.
- **Nada directo a `main`.** Todo entra por PR, con **(CI)** en verde y al menos una revisión de otra persona del equipo.
- Un PR resuelve una cosa. Si mezcla cosas, se divide.
- **Hook obligatorio:** `git config core.hooksPath .githooks`. Regenera el contexto en cada commit.

## 6. Datos y tiempo

- Las horas se guardan en UTC ISO 8601, `YYYY-MM-DDTHH:MM:SSZ`, en el campo `t_real`. La conversión a hora local solo ocurre al mostrarla.
- Zonas del datalake: `raw` es inmutable y nunca se sobrescribe; `curated` se regenera desde `raw`; `gold` es lo que consumen las apps. Cada escritura queda en el manifiesto con su SHA-256.
- Si una fuente cambia de estructura, se falla sin escribir nada (`EstructuraInesperada`).
- Los pipelines son idempotentes: la misma ventana dos veces no duplica filas.
- **Los datos nunca van a git.** Solo suben las fixtures pequeñas de los tests.
- Un módulo lee los datos de otro solo por su API pública (`read()`) o por un contrato de `packages/schemas`.

## 7. Secretos y configuración

- Los secretos van en `.env` (ignorado por git). **Nunca** en el código, en los commits ni en los logs.
- Si agregas una variable de entorno, agrégala también a `.env.example` con un comentario, y a la sección de configuración de tu `MODULE.md`.
- Las claves de API viajan solo a la URL que las necesita (por ejemplo, `NASA_API_KEY` va solo a `api.nasa.gov`) y no quedan en manifiestos.

## 8. Tests

- Van junto al código: `test_<modulo>.py` con `unittest`. En TS, `<archivo>.test.ts` cuando exista `apps/web`.
- Sin red ni disco real: se reemplazan las funciones de IO (`dl._get`) y se usan carpetas temporales.
- **(CI)** Los tests de todo módulo con `test_*.py` se corren solos. Un bug corregido llega con el test que lo reproduce.

## 9. Contexto para IA

- `AGENTS.md` es la única fuente de instrucciones. Los adaptadores (`CLAUDE.md`, `GEMINI.md`, `.cursor/`, etc.) son generados: no se editan.
- Cuando cambia el comportamiento, una decisión o una trampa de un módulo, se actualiza el bloque **MANUAL** de su `MODULE.md` (propósito, puntos clave y tags) en el mismo PR.
- **(CI)** El bloque **AUTO** y `docs/context/` están al día (`contextgen.py --check`). No se editan a mano. Si hay conflicto de merge en ellos, se regeneran.
- Un módulo nuevo llega con su `MODULE.md` completo, sin TODOs.
