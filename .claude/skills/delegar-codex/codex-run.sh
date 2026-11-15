#!/usr/bin/env bash
# Uso: codex-run.sh <1|2|3> <archivo_prompt> [directorio_de_trabajo]
# Ejecuta Codex como agente de desarrollo según el nivel de la tarea.
# Imprime solo el mensaje final de Codex; el registro completo queda en .claude/codex-logs/.
set -euo pipefail
export PATH="$PATH:/c/Program Files/nodejs:/c/Users/ASUS-07/AppData/Roaming/npm"

NIVEL="${1:?falta nivel 1|2|3}"; PROMPT="${2:?falta archivo de prompt}"; DIR="${3:-$PWD}"
case "$NIVEL" in
  1) MODELO="gpt-5.6-luna";  ESFUERZO="low" ;;
  2) MODELO="gpt-6.1-terra"; ESFUERZO="medium" ;;
  3) MODELO="gpt-6.1-sol";   ESFUERZO="high" ;;
  *) echo "nivel inválido" >&2; exit 2 ;;
esac

LOGS="$DIR/.claude/codex-logs"; mkdir -p "$LOGS"
SELLO="$(date +%Y%m%d-%H%M%S)-n$NIVEL"
FINAL="$LOGS/$SELLO.final.txt"; LOG="$LOGS/$SELLO.log"
REDACTAR='s/sk-[A-Za-z0-9_-]{20,}/sk-REDACTADA/g'

codex.cmd exec --cd "$DIR" --model "$MODELO" -c "model_reasoning_effort=\"$ESFUERZO\"" \
  --sandbox workspace-write --output-last-message "$FINAL" - < "$PROMPT" 2>&1 \
  | sed -u -E "$REDACTAR" > "$LOG" || { echo "Codex falló; ver $LOG" >&2; tail -15 "$LOG" >&2; exit 1; }

echo "== Nivel $NIVEL | $MODELO | esfuerzo $ESFUERZO | log: $LOG =="
sed -E "$REDACTAR" "$FINAL"
