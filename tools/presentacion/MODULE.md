# Módulo `tools/presentacion`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Genera las presentaciones de VIGÍA para NASA Space Apps (la demo oficial de 7 diapositivas en inglés y el pitch de 4 minutos) como `.pptx`, y toma las capturas limpias de la app que llevan dentro.

## Puntos clave

- `deck.js` (pptxgenjs): `node deck.js <carpeta_capturas> <carpeta_marca> <salida> "[equipo]" "[integrantes]" "[evento]"`. Sin los tres últimos argumentos deja los marcadores `[TEAM NAME]`, `[Team members]` y `[Local Event]` en la portada. Los textos y cifras salen de `auditoria/DEMO.md`, `GUIONES.md` y `packages/engine/fixtures/kpi.json`: si cambian los KPI, cámbialos aquí a mano.
- La demo oficial debe tener **como máximo 7 diapositivas** (regla de la guía de envío 2026): `demo()` crea exactamente 7; no añadas más sin quitar otra.
- Formas con `pres.ShapeType.roundRect` / `ellipse`, nunca el nombre como cadena: PowerPoint no abre el archivo si `prstGeom` lleva un valor inválido, aunque `validate.py` lo dé por bueno.
- pptxgenjs en Windows escribe entradas de carpeta en el zip; `sin_carpetas.py <pptx…>` las quita (sin eso algunos servicios en la nube no abren el archivo).
- `exportar.ps1 -Carpeta <dir> -Nombres "a,b"` exporta cada diapositiva a PNG con PowerPoint (COM) para revisarlas; necesita PowerPoint instalado. Es la revisión visual obligatoria antes de entregar.
- `capturas-finales.js` (puppeteer-core + Chrome) toma las capturas de la app en `http://localhost:3000` (demo, inglés, día 27) ocultando los avisos emergentes y el indicador de next dev, y comprueba de paso que no quede español con `lang=en` ni avisos sobre el dial del registro. Las capturas publicadas viven en `docs/capturas/`.
- Marca: colores y logotipos de `docs/brand` (Noche `0B1020`, Casco `F2F5FA`, estados ok/atención/alerta del tema claro). Fuente Calibri (segura para la revisión); sin logotipos de la NASA.
- Dependencias en `package.json` (`npm install` en esta carpeta); `apply_theme.js` viene de la skill `pptx` de Claude Code (`PPTX_SKILL`), opcional: sin ella el tema de colores queda en el de Office.

## Relación con el informe

- §8.4 Demo oficial (30 s o 7 diapositivas) y §8.3 guion de pitch.

tags: herramientas, presentacion, pptx, pptxgenjs, capturas, puppeteer, demo
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [capturas-deck.js](capturas-deck.js) | 66 | — |
| [capturas-finales.js](capturas-finales.js) | 76 | — |
| [deck-es.js](deck-es.js) | 329 | — |
| [deck.js](deck.js) | 327 | — |
| [sin_carpetas.py](sin_carpetas.py) | 14 | — |

### Configuración y fuentes externas

- Variables de entorno: `PPTX_SKILL`, `SIN_TEMA`

### Dependencias

- Externas: ninguna
- Biblioteca estándar: `os`, `shutil`, `sys`, `zipfile`
<!-- CONTEXT:AUTO:END -->
