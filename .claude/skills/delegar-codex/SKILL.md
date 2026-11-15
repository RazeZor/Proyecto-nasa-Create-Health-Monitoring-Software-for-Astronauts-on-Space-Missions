---
name: delegar-codex
description: Delega tareas de desarrollo a Codex (OpenAI) como agente, clasificándolas en 3 niveles de complejidad (modelo y esfuerzo distintos) y revisándolas después. Úsala cuando el usuario entregue un plan de desarrollo o pida delegar trabajo técnico a Codex.
---

# Delegar a Codex

Claude orquesta y revisa; Codex implementa. Codex ya tiene login con API key (no la pidas ni la imprimas).

## 1. Clasificar cada requerimiento

| Nivel | Cuándo | Modelo / esfuerzo | Quién |
|---|---|---|---|
| **1 · Mecánico** | Cambio acotado y claro: renombrar, i18n, boilerplate, tests simples, 1-2 archivos | `gpt-5.6-luna` / low | Codex |
| **2 · Estándar** | Funcionalidad o pipeline con diseño ya definido, varios archivos, tests incluidos | `gpt-6.1-terra` / medium | Codex |
| **3 · Complejo** | Lógica difícil, concurrencia, rendimiento, migraciones, 3D/WebGL, ambigüedad técnica | `gpt-6.1-sol` / high | Codex, con revisión estricta |
| **Reservado** | Decisiones de arquitectura, reglas clínicas del motor (`packages/engine`), seguridad, borrar datos | — | **Claude lo hace; no se delega** |

Ante duda entre dos niveles, sube uno. Si un requerimiento mezcla niveles, pártelo.

## 2. Preparar el trabajo
- Rama `<tipo>/<tema>` (nunca `main`); para trabajos paralelos usa `git worktree` o `Agent` con `isolation: "worktree"`, un directorio por tarea.
- Escribe el prompt en un archivo temporal del scratchpad. Debe incluir: objetivo, archivos/módulos a tocar, criterios de aceptación, comandos de test, y "sigue AGENTS.md y el MODULE.md del módulo; español; i18n con `t()`; no toques fuera del alcance; no hagas commit".

## 3. Ejecutar
```
bash .claude/skills/delegar-codex/codex-run.sh <1|2|3> <archivo_prompt> [directorio]
```
Devuelve el mensaje final de Codex; el log completo queda en `.claude/codex-logs/` (ignorado por git). Tareas independientes pueden lanzarse en paralelo con `run_in_background`.

## 4. Revisar (obligatorio, nunca aceptes a ciegas)
1. `git status` y `git diff`: ¿tocó solo lo pedido? ¿hay secretos, datos o archivos fuera de los contenedores?
2. Corre los tests del módulo y `python tools/contextgen/contextgen.py --check` (Python en `C:\Users\ASUS-07\AppData\Local\Programs\Python\Python314\python.exe`).
3. Verifica reglas de AGENTS.md: i18n, UTC `t_real`, dependencias, MODULE.md actualizado.
4. Si falla, reenvía a Codex las correcciones concretas (máximo 2 vueltas); si sigue mal, súbelo de nivel o hazlo tú.
5. El commit lo haces tú, en español e infinitivo.
