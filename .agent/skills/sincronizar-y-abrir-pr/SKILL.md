---
name: sincronizar-y-abrir-pr
description: Flujo obligatorio de VIGÍA antes de abrir, actualizar o mergear un PR: sincronizar la rama con los últimos cambios de origin/main (o origin/master), resolver conflictos sin editar bloques AUTO a mano, regenerar el contexto y validar tests/CI.
---

# Skill: Sincronizar con `main`/`master` antes de abrir o mergear un PR

Usa esta skill **siempre** antes de crear un Pull Request, actualizar un PR tras varios commits seguidos o hacer un merge, incluso si la rama ya se había sincronizado al inicio.

## Pasos obligatorios

1. **Traer el estado real del remoto (sin asumir que no cambió):**
   - Detecta la rama principal del remoto (`origin/main` o `origin/master`):
     ```sh
     git fetch origin
     ```
2. **Integrar la rama principal en la rama actual antes del push/PR:**
   - Si existe `origin/main`, corre `git merge origin/main`; si el remoto usa `master`, corre `git merge origin/master`.
   - **Nunca** abras ni actualices un PR ni intentes mergear sin haber traído e integrado los últimos commits del remoto.
3. **Resolver conflictos siguiendo `AGENTS.md`:**
   - En bloques `CONTEXT:MANUAL` de cualquier `MODULE.md`: conserva la unión coherente de los puntos clave de ambas ramas.
   - En bloques `CONTEXT:AUTO`, `docs/context/INDEX.md`, `docs/context/index.json` o adaptadores (`CLAUDE.md`, `GEMINI.md`, `.agent/rules/agents.md`, etc.): acepta cualquier lado (`git checkout --ours` o `--theirs`) para quitar marcadores y vuelve a regenerar con:
     ```sh
     python tools/contextgen/contextgen.py
     ```
4. **Verificar todo el CI después de resolver el merge:**
   - `python tools/contextgen/contextgen.py --check`
   - `python tools/contextgen/contextgen.py --lint`
   - `python packages/i18n/i18n.py`
   - `python -m unittest discover -s <modulo>` en todos los módulos (`packages/schemas`, `packages/i18n`, `pipelines/datalake`, `pipelines/reanclaje`, `tools/contextgen`, `apps/api`)
   - En `apps/web`: typecheck (`tsc --noEmit`) y build (`npx next build --webpack`)
   - Estilo/imports Python (`ruff check .` si está instalado, respetando `ruff.toml`).
5. **Commit de merge y push:**
   - Confirma el commit de merge en español (`Integrar cambios de origin/main ...`).
   - Empuja la rama (`git push`) solo cuando el árbol esté limpio y todas las verificaciones posteriores al merge hayan pasado.
