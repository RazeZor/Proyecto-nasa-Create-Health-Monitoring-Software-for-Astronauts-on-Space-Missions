# Pulso del ciclo de auditoría (se reescribe cada ~10 min)

**Última actualización:** 2026-11-15 02:00 (UTC-3). Corte del ciclo: 21:59. Envío: 23:59 (lo hace el usuario).

## Dónde estamos
- Rama `fix/auditoria-final` con cambios sin commit (ver `git status`). Nada roto: tests de Node y Python en verde tras mis ediciones.
- Hecho: `RUBRICA.md`, `ENVIO.md` (borrador completo en inglés), `BACKLOG.md`, `EXPLORADOR-iteracion-1.md`, `FUENTES.md` (Investigador), `GUIA-MENTOR.md`.
- Correcciones ya aplicadas por Claude (A5, A6, B1, B2, B3, B4, B5, B6, A12 parcial): simulador solo en demo (`app-context.tsx`), ánimo solo si se confirma (`checkin-form.tsx`, `types.ts`), retardo real en modo real (`retardoEnvio` en `api-registro.ts` + test), `listarReportes` devuelve null sin red y la UI avisa, etiquetas «Real» solo con datos (`environment-view.tsx`), recordatorios rotulados como ejemplo, aviso de prototipo en la pantalla de error, hilo de tierra filtrado por `contenido.demo` y con `lang` (`rutas_dashboard.py` + test; `demo/mensajes.en.json`), `transit-docked` retardo 0 (vocabulario + copia web), readme (NEWS2 bien atribuido, recursos oficiales, IA), nuevas claves i18n.
- En marcha: Tester (informe `TESTER-iteracion-1.md`), Implementador A (inglés residual web + interruptor del simulador deshabilitado en real), Implementador B (informe, fichas es/en con `unidad`, MODULE API, comentario etl-client).
- Codex: su sandbox en Windows bloquea toda escritura y el clasificador no permite saltárselo. Solo sirve como evaluador de solo lectura (nivel 3).

## Pendiente (orden)
1. Al terminar A y B: revisar `git diff`, tests, `contextgen --check`; cambiar en i18n las frases NEWS2 (es.json líneas ~731, 788, 893, 898 y sus pares en en.json) a «tramos NEWS2 con cortes propios».
2. Informe del Tester → backlog B10 → corregir.
3. Evaluador Codex (solo lectura): `codex.cmd exec --cd <repo> --model gpt-6.1-sol -c model_reasoning_effort="high" --sandbox read-only --output-last-message <out> - < <prompt>`; darle RUBRICA.md, readme, ENVIO.md, capturas.
4. Build de producción en worktree (`git worktree add ../vigia-build`, junction a node_modules) + `tsc --noEmit`.
5. `DEMO.md` (7 diapositivas en inglés) e `INFORME_FINAL.md`.
6. Commit(s) en español, merge a main tras tests, push; redespliegue (requiere permiso ssh: `Bash(ssh -p 15661 naiki@198.22.204.17 *)`, `Bash(tar *)`).
