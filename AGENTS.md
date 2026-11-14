# AGENTS.md: instrucciones para personas y asistentes de IA

Este archivo es la **única fuente** de instrucciones del repositorio para cualquier herramienta de IA (Codex, Claude Code, Google Antigravity, Gemini CLI, Copilot, Cursor, Windsurf, Cline…). Los archivos `CLAUDE.md`, `GEMINI.md`, `.agent/rules/`, `.github/copilot-instructions.md`, `.cursor/rules/`, `.windsurf/rules/` y `.clinerules/` son adaptadores generados que solo apuntan aquí. No los edites: cambia este archivo.

## Qué es VIGÍA

VIGÍA es un software de monitoreo de salud para astronautas (reto *Health Monitoring Software*, NASA Space Apps 2026). Cruza los registros diarios y los sensores del tripulante con el entorno de radiación (GOES, DONKI, RadLab, EDA). Un motor híbrido (capa clínica, capa de desviación personal y capa de deriva) detecta desviaciones y propone el siguiente paso. Todo funciona a bordo, sin conexión. El diseño completo está en [documentacion/VIGA-informe-tcnico-…md](documentacion/VIGA-informe-tcnico-para-el-reto-Health-Monitoring-Software-NASA-Space-Apps-2026.md), en las secciones 3 y 4.

## Cómo encontrar contexto

1. Empieza por [docs/context/INDEX.md](docs/context/INDEX.md): el mapa de módulos, sus tags y el lugar de cada función o clase.
2. Abre el `MODULE.md` del módulo que vas a tocar (por ejemplo [pipelines/datalake/MODULE.md](pipelines/datalake/MODULE.md)). Arriba tiene el propósito y los **puntos clave**; abajo, el mapa de código generado.
3. Para búsquedas automáticas o RAG usa [docs/context/index.json](docs/context/index.json): lo mismo en formato máquina.

## Dónde va cada cosa

Monorepo por unidad desplegable. El detalle y los ejemplos están en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md). Cada subcarpeta de estos contenedores es un módulo:

- `apps/`: lo que usa una persona. `apps/web` es la PWA a bordo, organizada por funcionalidad (`src/features/<feature>/`).
- `pipelines/`: ingesta y procesamiento de datos con el patrón medallón (raw → curated → gold), idempotentes y con manifiesto.
- `packages/`: librerías compartidas puras, sin IO: traducciones (`i18n`), motor híbrido (`engine`) y contratos de datos (`schemas`).
- `tools/`: herramientas del equipo.

Regla de dependencias:

- `apps` y `pipelines` pueden importar de `packages`. `packages` no importa de nadie.
- `apps` y `pipelines` **no se importan entre sí**: se comunican por datos que siguen `packages/schemas`.
- Un módulo no importa de otro módulo del mismo contenedor. El código compartido sube a `packages/`.
- No crees código fuera de estos contenedores; `contextgen --lint` lo avisa.

## Reglas del repositorio

Las convenciones completas (nombres, git, i18n, datos, tests) están en [docs/CONVENCIONES.md](docs/CONVENCIONES.md) y son obligatorias. Las más importantes:

- Idioma: español en el código, los comentarios, los commits y la documentación.
- **i18n:** todo texto que ve un usuario sale de `packages/i18n` con `t("area.clave")`, nunca como string literal. El español es el principal y el obligatorio: toda clave nueva va primero en `locales/es.json`. El inglés es **secundario**: si sabes traducirla, agrégala a `en.json`; si no, no pasa nada, se muestra en español. Nunca agregues a `en.json` una clave que no esté en `es.json`.
- Ramas `<tipo>/<tema>` (`feat/`, `fix/`, `docs/`, `data/`…), commits en español y en infinitivo, y nada directo a `main`.
- Cada módulo declara sus dependencias en su carpeta (`requirements.txt` o `package.json`). `pipelines/datalake`, `packages/i18n` y `tools/contextgen` usan **solo la biblioteca estándar**; no les agregues dependencias sin acordarlo con el equipo.
- Los datos nunca van a git. Solo suben las fixtures pequeñas de los tests.
- Las horas se guardan en UTC ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`) en el campo `t_real`.
- El datalake nunca sobrescribe `data/raw/`. Si una fuente cambia de estructura, se lanza `EstructuraInesperada` y no se escribe nada.
- Nunca subas secretos. `NASA_API_KEY` va en `.env` (ignorado por git); la plantilla está en `.env.example`.

## Mantener el contexto al día (obligatorio)

Cada `MODULE.md` tiene dos bloques:

- `CONTEXT:MANUAL`: propósito, puntos clave y tags. **Lo actualizas tú o tu IA** cuando cambia el comportamiento, una decisión o una trampa del módulo. Pocos bullets y concretos.
- `CONTEXT:AUTO`: archivos, API pública, configuración, dependencias y tests. **No se edita a mano**; lo regenera el script.

Un módulo nuevo es cualquier subcarpeta con código de `apps/`, `pipelines/`, `packages/` o `tools/`. El script le crea su `MODULE.md` con TODOs; complétalos en el mismo PR.

La configuración inicial de cada dev (hook, `.env`, Python y la IA de cada uno) está en [docs/SETUP.md](docs/SETUP.md).

```sh
git config core.hooksPath .githooks            # una sola vez por clon: activa el pre-commit
python tools/contextgen/contextgen.py          # regenera (el hook lo hace solo en cada commit)
python tools/contextgen/contextgen.py --check  # lo mismo que corre CI
python tools/contextgen/contextgen.py --lint   # avisa de TODOs y de puntos clave sin revisar
```

En Windows, si `python` no está en el PATH, usa `py`. Si hay un conflicto de merge en un bloque AUTO o en `docs/context/`, no lo resuelvas a mano: quédate con cualquier versión y vuelve a correr el script.

## Comandos

```sh
python -m unittest discover -s pipelines/datalake        # tests del datalake
python -m unittest discover -s tools/contextgen          # tests del generador de contexto
python -m unittest discover -s packages/i18n             # tests y reglas de los catálogos
python packages/i18n/i18n.py                             # traducciones al inglés pendientes
cd pipelines/datalake && python index.py ingest goes     # ingesta (goes | donki | radlab | eda)
cd pipelines/datalake && python index.py read goes       # filas limpias
```

## Antes de abrir un PR

- Tests en verde y `contextgen.py --check` sin cambios pendientes (CI lo exige).
- Los puntos clave del `MODULE.md` que tocaste siguen siendo ciertos.
