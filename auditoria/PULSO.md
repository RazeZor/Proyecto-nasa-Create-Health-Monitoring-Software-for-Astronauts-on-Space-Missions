# Pulso del ciclo de auditoría (se reescribe cada ~10 min)

**Última actualización:** 2026-11-15 07:55 (UTC-3). Corte del ciclo: 21:59. Envío: 23:59 (lo hace el usuario).

## Dónde estamos
- Rama `fix/auditoria-final`: commits `52ed761` y `d6529d6` (rama subida a origin); árbol limpio salvo `.claude/`. Build de producción OK en `C:/Users/ASUS-07/Documents/vigia-build` (a5e40ee). API local :8000 con a5e40ee y base nueva; puente del reloj conectado a smart-monitor local.
- Presentaciones: generador `scratchpad/deck/deck.js` (pptxgenjs 3.12 en `scratchpad/deck/node_modules`; ejecutar con `NODE_PATH` a esa carpeta y `PPTX_SKILL` a la skill pptx; `sin_carpetas.py` quita las entradas de carpeta del zip; `exportar.ps1` exporta PNG con PowerPoint COM). Salida: `scratchpad/deck/salida/VIGIA-demo-7-slides.pptx` (7) y `VIGIA-pitch.pptx` (12), ya abren en PowerPoint y pasan `validate.py`. Faltan las capturas definitivas (`t3-deck-*.png`) y los datos del equipo (argumentos 4-6 de deck.js).
- El usuario pidió: no usar más Codex; todo con Claude; terminar lo pendiente con varios agentes.
- Agentes en marcha: Tester 3 (reanudado tras el límite de cuota), Evaluador it. 2 (Claude), conversor a Word del informe final (skill docx).

## Pendiente (orden)
1. Tester 3 → regresiones y capturas t3-deck-* → regenerar decks con `node deck.js <capturas> <marca> <salida> "<equipo>" "<integrantes>" "<evento>"` → revisar PNG → copiar los .pptx a `auditoria/`.
2. Evaluador 2 → `INFORME_FINAL.md` (notas it. 2).
3. Merge a `main` y push (ff-only). Redespliegue cuando haya permiso ssh (`NEXT_PUBLIC_VIGIA_MODO=demo NEXT_PUBLIC_VIGIA_PUBLICO=1`).
4. ENVIO.md: equipo e integrantes (los da el usuario). Docx del informe (agente en marcha).
