# VIGÍA

Monitoreo de salud para astronautas en misión: NASA Space Apps 2026, reto *Health Monitoring Software*.

- **Primer paso tras clonar:** [docs/SETUP.md](docs/SETUP.md) (hook, `.env`, Python y tu asistente de IA)
- Patrón de carpetas y arquitectura: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)
- Convenciones obligatorias (nombres, git, i18n, datos, tests): [docs/CONVENCIONES.md](docs/CONVENCIONES.md)
- Mapa del repositorio por módulo: [docs/context/INDEX.md](docs/context/INDEX.md)
- Instrucciones para colaborar (personas y cualquier asistente de IA): [AGENTS.md](AGENTS.md)
- Informe técnico del reto: [documentacion/](documentacion/)

```
apps/        interfaces (apps/web: PWA a bordo)
pipelines/   ingesta y procesamiento de datos (pipelines/datalake)
packages/    librerías compartidas (i18n es/en, motor híbrido, contratos de datos)
tools/       herramientas del equipo (tools/contextgen)
```
