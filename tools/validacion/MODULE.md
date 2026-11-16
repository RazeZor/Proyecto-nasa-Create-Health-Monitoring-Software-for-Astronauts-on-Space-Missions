# Módulo `tools/validacion`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Evaluar el motor TypeScript de producto en un banco sintético de auditoría, con comparadores, ablaciones, intervalos y artefactos congelados antes de calcular resultados.

## Puntos clave

- Node 22.18+, sin dependencias. `node tools/validacion/ejecutar.ts [--publicar]` genera datos, congelación, reporte JSON y resumen Markdown en `data/`, ignorada. `--publicar` copia el reporte a gold con SHA-256; único escritor.
- `protocolo.json` fija semilla, tamaño, escenarios y métricas antes de ejecutar. El generador no importa el simulador Python ni sus supuestos. Se evalúa el motor TS real; no se reajustan umbrales para mejorar resultados.
- Banco exploratorio creado por el mismo equipo/asistente: no es conjunto reservado independiente ni validación humana. Los intervalos Wilson y bootstrap pareado por misión son descriptivos, sin corrección de multiplicidad. La ausencia de un criterio clínico acordado impide declarar innovación clínicamente validada.
- Ablaciones A, A+B, A+C, A+B+C y con contexto usan `OpcionesMotor.capas`; mantienen la política común de referencia robusta, pero desactivan la acumulación/exclusión propia de C cuando C no está activa.
- Detección por episodio y escenario; retraso solo entre detectados y omitidos explícitos; falsos episodios por persona-semana observada fuera del evento y recuperación. Las dos reglas ambientales deterministas se informan en `reglas_ambientales`, aparte de los once escenarios fisiológicos. El negativo cuenta señales ambientales aunque no tenga evento; el test cambia deliberadamente `uso` para comprobar que la métrica detectaría el fallo. La enmienda v1.1 es posterior a inspeccionar v1 y no ajusta el detector.
- El reporte identifica hashes del motor, generador, protocolo y casos. La API comprueba integridad y vigencia respecto al motor instalado antes de presentarlo como resultado actual.

tags: ciencia, validacion, benchmark, ablacion, incertidumbre, motor, reproducibilidad
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
## Mapa del módulo (generado)

> No editar este bloque: lo regenera `tools/contextgen/contextgen.py`.

### Archivos

| Archivo | Líneas | Descripción |
| --- | --- | --- |
| [banco.test.ts](banco.test.ts) | 43 | — |
| [banco.ts](banco.ts) | 96 | — |
| [ejecutar.ts](ejecutar.ts) | 53 | Congela entradas y código antes de medir. Sin descargas, sin reajuste del detector. |
| [generador.ts](generador.ts) | 69 | Generador de auditoría separado del simulador de desarrollo. Sus distribuciones son supuestos de prueba. |
| [metricas.test.ts](metricas.test.ts) | 25 | — |
| [metricas.ts](metricas.ts) | 32 | Métricas por misión; nunca cuenta días correlacionados como sujetos independientes. |

### API pública

**banco.ts**

- constante `CAPAS`
- función `detectar`
- función `evaluarCaso`
- función `ejecutarBanco`

**generador.ts**

- interfaz `CasoAuditoria`
- interfaz `Protocolo`
- función `aleatorio`
- función `generarCaso`

**metricas.ts**

- función `wilson`
- función `medianaOmitible`
- función `contarEpisodios`
- función `diferenciaPareada`

### Configuración y fuentes externas

- Variables de entorno: `DATALAKE_DIR`

### Dependencias

- Internas: `../../packages/engine/engine.ts`, `../../packages/engine/evidencia.ts`, `./banco.ts`, `./generador.ts`, `./metricas.ts`
- Externas: ninguna
- Biblioteca estándar: `node:assert/strict`, `node:child_process`, `node:crypto`, `node:fs`, `node:path`, `node:test`, `node:url`

### Tests

- `tools/validacion/banco.test.ts`: 0 pruebas
- `tools/validacion/metricas.test.ts`: 0 pruebas
<!-- CONTEXT:AUTO:END -->
