# Pulso del ciclo de auditoría (se reescribe cada ~10 min)

**Última actualización:** 2026-11-15 02:20 (UTC-3). Corte del ciclo: 21:59. Envío: 23:59 (lo hace el usuario).

## Dónde estamos
- Rama `fix/auditoria-final`, commit `52ed761` + cambios sin commit: MODULE web, LICENSE (MIT), fixtures kpi/barrido, README (licencia, fixtures), CI con build web, home con línea «Registras → compara → sabes qué hacer» y zonas «sin medir» sin datos, ENVIO con resumen corto, GLOSARIO.md, GUIONES.md, EXPLORADOR-reloj.md, EVALUADOR-iteracion-1.md (62/100), INFORME_FINAL.md (borrador con notas it. 1).
- Build de producción OK en el worktree `C:/Users/ASUS-07/Documents/vigia-build` (junction a node_modules). `tsc` OK.
- En marcha: Tester iteración 2; Implementador del puente del reloj (solo apps/api: vínculo por API, sin alta automática, metodo unificado, caducidad, .env, SMART_URL por defecto, ip_lan).
- Codex: evaluador funciona con material embebido (`scratchpad/codex/EVAL-prompt.md` + `-i capturas`), modelo gpt-6.1-sol, ~10 min.

## Pendiente (orden)
1. Tester 2 → regresiones. Reloj API → luego la parte web del reloj (device-view: diagnóstico por pasos, botón «Este es mi reloj», URL para el reloj, autoconexión; reloj.ts con `recibido_hace_s`) + README/ENVIO (cómo conectar el reloj).
2. Commit 2; `git fetch origin && git merge origin/main`; merge a main y push.
3. Evaluador iteración 2 (mismo prompt con material actualizado y capturas nuevas).
4. Redespliegue (permiso ssh pendiente del usuario) con `NEXT_PUBLIC_VIGIA_MODO=demo NEXT_PUBLIC_VIGIA_PUBLICO=1`; resembrar base; probar en ventana privada.
5. Entregables D: pptx (skill `anthropic-skills:pptx`): demo 7 diapositivas + pitch; informe final del proyecto en inglés (D2, docx o docs); INFORME_FINAL.md; ENVIO con equipo (lo da el usuario).
