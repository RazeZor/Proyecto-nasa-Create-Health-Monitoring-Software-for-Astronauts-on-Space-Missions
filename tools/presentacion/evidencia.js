// Los generadores de diapositivas consumen el mismo reporte que la app; nunca KPI escritos a mano.
const fs = require("node:fs")
const path = require("node:path")
const { createHash } = require("node:crypto")
const RAIZ = path.resolve(__dirname, "../..")
const ARCHIVOS = ["packages/engine/engine.ts", "packages/engine/evidencia.ts", "tools/validacion/generador.ts", "tools/validacion/metricas.ts", "tools/validacion/banco.ts", "tools/validacion/ejecutar.ts"]
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex")

function leerAuditoria(raiz = RAIZ, gold = path.join(process.env.DATALAKE_DIR || path.join(raiz, "pipelines/datalake/data"), "gold")) {
  const contenido = fs.readFileSync(path.join(gold, "validacion.json"))
  const manifiesto = JSON.parse(fs.readFileSync(path.join(gold, "manifest.json"), "utf8"))
  if (manifiesto.validacion?.tipo !== "auditoria_sintetica" || manifiesto.validacion?.sha256 !== sha(contenido)) throw new Error("Auditoría ausente o alterada; ejecutar tools/validacion/ejecutar.ts --publicar")
  const informe = JSON.parse(contenido)
  if (informe.version !== "evidencia-v1" || informe.conclusion !== "exploratoria_sin_validacion_clinica") throw new Error("Reporte incompatible")
  const hashes = { ...informe.congelacion.archivos, "tools/validacion/protocolo.json": informe.congelacion.protocolo_sha256 }
  for (const archivo of [...ARCHIVOS, "tools/validacion/protocolo.json"]) {
    if (hashes[archivo] !== sha(fs.readFileSync(path.join(raiz, archivo)))) throw new Error("Auditoría desactualizada; repetir antes de generar el pitch")
  }
  const fila = (escenario) => {
    const r = informe.resultados.find((r) => r.escenario === escenario && r.metodo === "ABC_contexto")
    if (!r || !Number.isSafeInteger(r.detectados) || !Number.isSafeInteger(r.eventos)) throw new Error("Escenario requerido ausente")
    return r
  }
  return { informe, sutil: fila("deriva_sutil"), intensa: fila("deriva_intensa"), ruido: fila("colas_pesadas") }
}
module.exports = { leerAuditoria }
