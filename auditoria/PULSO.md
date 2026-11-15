# Pulso del ciclo de auditoría (se reescribe cada ~10 min)

**Última actualización:** 2026-11-15 08:20 (UTC-3). Corte del ciclo: 21:59. Envío: 23:59 (lo hace el usuario).

## Dónde estamos
- `fix/auditoria-final` = `c99506c` (5 commits de auditoría), subida a origin. **La fusión en `main` la denegó el clasificador de permisos**: la hace el usuario (`git checkout main && git merge --ff-only fix/auditoria-final && git push origin main`) o abre el PR en GitHub. Tests, tsc, ruff, contextgen en verde. API local :8000 con el código actual.
- Evaluador it. 2: 84/100. Tester 3: sin regresiones en escritorio; móvil corregido.
- Presentaciones: `scratchpad/deck/deck.js` ya apunta a las capturas definitivas (`t3-deck-*`, `t4-deck-*`); regenerar y copiar a `auditoria/`. Word: `auditoria/VIGIA-Final-Project-Report.docx` (regenerado con §9.3; falta pasar `validate.ps1` para actualizar el índice).

## Pendiente (orden)
1. Regenerar decks → revisar PNG → copiar a `auditoria/` → `validate.ps1` del docx.
2. `INFORME_FINAL.md` completo (notas, puertas, cambios, pendientes).
3. Redespliegue (permiso ssh del usuario) con `NEXT_PUBLIC_VIGIA_MODO=demo NEXT_PUBLIC_VIGIA_PUBLICO=1`; resembrar base del servidor; probar en ventana privada.
4. Datos del equipo (nombre, integrantes, evento) en ENVIO.md, diapositiva 1 y portada del Word: los da el usuario. Cronometrar 5 registros con personas (I3): lo hace el equipo.
