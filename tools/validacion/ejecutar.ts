/** Congela entradas y código antes de medir. Sin descargas, sin reajuste del detector. */
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { ejecutarBanco } from "./banco.ts"
import { generarCaso, type Protocolo } from "./generador.ts"

const carpeta = path.dirname(fileURLToPath(import.meta.url)), raiz = path.resolve(carpeta, "../..")
const sha = (contenido: string | Buffer) => createHash("sha256").update(contenido).digest("hex")
const protocoloBytes = readFileSync(path.join(carpeta, "protocolo.json"))
const protocolo = JSON.parse(protocoloBytes.toString()) as Protocolo
const casos = protocolo.escenarios.flatMap((s) => Array.from({ length: protocolo.misiones_por_escenario }, (_, i) => generarCaso(s, i, protocolo)))
const datosBytes = JSON.stringify(casos)
const momento = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
const destino = path.join(carpeta, "data", new Date().toISOString().replace(/[-:.]/g, ""))
mkdirSync(destino, { recursive: true })
const fuentes = ["packages/engine/engine.ts", "packages/engine/evidencia.ts", "tools/validacion/generador.ts", "tools/validacion/metricas.ts", "tools/validacion/banco.ts", "tools/validacion/ejecutar.ts"]
const hashes = Object.fromEntries(fuentes.map((f) => [f, sha(readFileSync(path.join(raiz, f)))]))
const congelacion = { t_real: momento(), protocolo_sha256: sha(protocoloBytes), datos_sha256: sha(datosBytes), archivos: hashes,
  head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: raiz, encoding: "utf8" }).trim(),
  cambios_locales: !!execFileSync("git", ["status", "--porcelain"], { cwd: raiz, encoding: "utf8" }).trim(),
  reglas_ajustadas_en_esta_evaluacion: false, conjunto_independiente: false, datos_humanos: false, contenido_generado_con_ia: true }
writeFileSync(path.join(destino, "protocolo.json"), protocoloBytes)
writeFileSync(path.join(destino, "casos.json"), datosBytes)
writeFileSync(path.join(destino, "congelacion.json"), JSON.stringify(congelacion, null, 2))
console.log(`Entradas congeladas: ${casos.length} misiones sintéticas`)
const informe = { version: "evidencia-v1", t_real: momento(), protocolo, congelacion, ...ejecutarBanco(protocolo, casos) }
for (const archivo of fuentes) if (sha(readFileSync(path.join(raiz, archivo))) !== hashes[archivo]) throw new Error("el código cambió durante la evaluación")
const contenido = JSON.stringify(informe, null, 2)
writeFileSync(path.join(destino, "resultado.json"), contenido)
const filas = informe.resultados.filter((r) => ["deriva_sutil", "control", "cambio_instrumento"].includes(r.escenario))
const fmt = (v: number | null) => v === null ? "sin denominador" : v.toFixed(3)
const resumen = ["# Auditoría sintética del motor", "", "Evaluación exploratoria del mismo equipo; sin validación clínica ni conjunto independiente.", "",
  `Motor SHA-256: ${hashes["packages/engine/engine.ts"]}`, `Protocolo SHA-256: ${congelacion.protocolo_sha256}`, "",
  "| Escenario | Método | Detectados/eventos | No detectados | Retraso mediano (solo detectados) | Falsos/persona-semana |",
  "| --- | --- | --- | --- | --- | --- |", ...filas.map((r) => `| ${r.escenario} | ${r.metodo} | ${r.detectados}/${r.eventos} | ${r.no_detectados} | ${fmt(r.retraso_mediana_solo_detectados_dias)} | ${fmt(r.falsos_por_persona_semana)} |`),
  "", "Los intervalos y las diferencias pareadas por misión están en resultado.json. Las reglas ambientales deterministas se informan aparte. No se afirma superioridad clínica."]
writeFileSync(path.join(destino, "RESUMEN.md"), resumen.join("\n"))
if (process.argv.includes("--publicar")) {
  const gold = path.join(process.env.DATALAKE_DIR || path.join(raiz, "pipelines/datalake/data"), "gold")
  mkdirSync(gold, { recursive: true })
  const guardar = (nombre: string, bytes: string) => { const temporal = path.join(gold, nombre + ".tmp"); writeFileSync(temporal, bytes); renameSync(temporal, path.join(gold, nombre)) }
  const rutaManifiesto = path.join(gold, "manifest.json")
  let manifiesto: Record<string, unknown> = {}
  try { manifiesto = JSON.parse(readFileSync(rutaManifiesto, "utf8")) } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error }
  guardar("validacion.json", contenido)
  manifiesto.validacion = { sha256: sha(contenido), tipo: "auditoria_sintetica", generado: momento(), protocolo: protocolo.version }
  guardar("manifest.json", JSON.stringify(manifiesto, null, 2))
  console.log("Reporte publicado en gold con SHA-256")
}
console.log(destino)
