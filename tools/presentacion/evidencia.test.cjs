const assert = require("node:assert/strict")
const test = require("node:test")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { createHash } = require("node:crypto")
const { leerAuditoria } = require("./evidencia.js")

test("el pitch rechaza evidencia ausente, alterada y de otro código", () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "vigia-pitch-"))
  const gold = path.join(raiz, "gold")
  fs.mkdirSync(gold)
  try {
    assert.throws(() => leerAuditoria(raiz, gold))
    const archivos = ["packages/engine/engine.ts", "packages/engine/evidencia.ts", "tools/validacion/generador.ts", "tools/validacion/metricas.ts", "tools/validacion/banco.ts", "tools/validacion/ejecutar.ts", "tools/validacion/protocolo.json"]
    const hashes = {}
    for (const archivo of archivos) {
      fs.mkdirSync(path.dirname(path.join(raiz, archivo)), { recursive: true })
      fs.writeFileSync(path.join(raiz, archivo), archivo)
      hashes[archivo] = createHash("sha256").update(archivo).digest("hex")
    }
    const publicar = () => {
      const bytes = JSON.stringify({ version: "evidencia-v1", conclusion: "exploratoria_sin_validacion_clinica",
        congelacion: { archivos: hashes, protocolo_sha256: hashes["tools/validacion/protocolo.json"] },
        resultados: ["deriva_sutil", "deriva_intensa", "colas_pesadas"].map((escenario) => ({ escenario, metodo: "ABC_contexto", detectados: 1, eventos: 60 })) })
      fs.writeFileSync(path.join(gold, "validacion.json"), bytes)
      fs.writeFileSync(path.join(gold, "manifest.json"), JSON.stringify({ validacion: { tipo: "auditoria_sintetica", sha256: createHash("sha256").update(bytes).digest("hex") } }))
    }
    publicar()
    assert.equal(leerAuditoria(raiz, gold).sutil.detectados, 1)
    fs.appendFileSync(path.join(gold, "validacion.json"), " ")
    assert.throws(() => leerAuditoria(raiz, gold), /alterada/)
    publicar()
    fs.appendFileSync(path.join(raiz, archivos[0]), "cambio")
    assert.throws(() => leerAuditoria(raiz, gold), /desactualizada/)
  } finally {
    assert.equal(path.dirname(raiz), path.resolve(os.tmpdir()))
    fs.rmSync(raiz, { recursive: true, force: true })
  }
})
