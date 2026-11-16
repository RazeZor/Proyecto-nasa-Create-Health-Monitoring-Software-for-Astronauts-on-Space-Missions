/** Generador de auditoría separado del simulador de desarrollo. Sus distribuciones son supuestos de prueba. */
import type { CambioInstrumento, EntornoDia, Lectura, Tripulante } from "../../packages/engine/engine.ts"

export interface CasoAuditoria {
  id: string
  escenario: string
  tripulante: Tripulante
  entorno: Record<number, EntornoDia>
  uso: "referencia" | "escenario"
  cambios: CambioInstrumento[]
  evento: { inicio: number; fin: number; tipo: "deriva" | "extremo" | "ambiente"; canales?: string[] } | null
}
export interface Protocolo { semilla: number; misiones_por_escenario: number; dias_prevuelo: number; dias_vuelo: number; escenarios: string[]; recuperacion_excluida_dias: number; bootstrap_repeticiones: number; comparadores: string[]; [clave: string]: unknown }

export function aleatorio(semilla: number) {
  let estado = semilla >>> 0
  return () => {
    estado += 0x6d2b79f5
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generarCaso(escenario: string, indice: number, protocolo: Protocolo, factores: { magnitud?: number; duracion?: number } = {}): CasoAuditoria {
  const cod = protocolo.escenarios.indexOf(escenario)
  if (cod < 0) throw new Error("escenario no registrado en protocolo")
  const azar = aleatorio(protocolo.semilla + cod * 100_003 + indice * 97)
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(azar(), 1e-12))) * Math.cos(2 * Math.PI * azar())
  const base = { fc: 57 + azar() * 12, pas: 111 + azar() * 10, sueno: 7 + azar(), animo: 7 + azar() }
  const serie: Lectura[] = []
  const entorno: Record<number, EntornoDia> = {}
  const inicio = escenario === "deriva_tardia" ? 55 : 27
  const deriva = ["deriva_intensa", "deriva_sutil", "deriva_tardia", "sin_prevuelo", "datos_ausentes", "ausencias_parciales", "ausencias_informativas", "deriva_breve"].includes(escenario)
  const fin = Math.min(protocolo.dias_vuelo, inicio + (factores.duracion ?? (escenario === "deriva_breve" ? 5 : 20)) - 1)
  let correlacion = 0
  for (let d = 1 - protocolo.dias_prevuelo; d <= protocolo.dias_vuelo; d++) {
    if (escenario === "sin_prevuelo" && d <= 0) continue
    correlacion = 0.8 * correlacion + 0.6 * normal()
    const ruido = () => escenario === "ruido_correlacionado" ? correlacion
      : escenario === "colas_pesadas" ? normal() / Math.sqrt((normal() ** 2 + normal() ** 2 + normal() ** 2) / 3) * 0.55 : normal()
    const adaptacion = d < 1 ? 0 : 1 - Math.exp(-d / (escenario === "adaptacion_prolongada" ? 16 : 4))
    const progreso = deriva && d >= inicio && d <= fin ? Math.min(1, (d - inicio + 1) / 10) : 0
    const intensidad = factores.magnitud ?? (escenario === "deriva_sutil" ? 0.3 : 1)
    const r: Lectura = {
      dia_mision: d, fc_reposo_lpm: base.fc + 3 * adaptacion + ruido() * 2 + 14 * progreso * intensidad,
      pas_mmHg: base.pas - 4 * adaptacion + ruido() * 3, spo2_pct: Math.min(100, 98 + normal() * 0.25),
      temp_central_c: 36.7 + normal() * 0.1, sueno_h: base.sueno - 0.6 * adaptacion + ruido() * 0.3 - 2.4 * progreso * intensidad,
      animo_1_10: Math.max(1, Math.min(10, base.animo + ruido() * 0.5 - 2 * progreso * intensidad)),
      glucosa_mg_dl: null, sintomas: [], durante_tormenta: false,
    }
    if (escenario === "cambio_instrumento" && d >= 30) r.fc_reposo_lpm! += 8
    if (escenario === "sensor_fijo" && d >= 20) r.fc_reposo_lpm = 64
    if (escenario === "estacionalidad") { r.fc_reposo_lpm! += 2 * Math.sin(d * 2 * Math.PI / 7); r.sueno_h! += 0.3 * Math.sin(d * 2 * Math.PI / 7) }
    if (escenario === "ausencias_parciales" && d >= inicio && d <= fin && d % 3 === 0) r.sueno_h = null
    if (escenario === "ausencias_informativas" && progreso > 0.5) r.fc_reposo_lpm = null
    if (escenario === "datos_ausentes" && d >= 30 && d <= 40) {
      r.fc_reposo_lpm = r.pas_mmHg = r.spo2_pct = r.temp_central_c = r.sueno_h = r.animo_1_10 = null
    }
    if (escenario === "extremo" && d === 36) r.spo2_pct = 89
    if (escenario.startsWith("entorno_") && d === 36) {
      entorno[d] = { co2_mmhg_max_horario: 4.6 }
      r.sintomas = ["cefalea"]
    }
    serie.push(r)
  }
  return { id: `${escenario}-${indice}`, escenario, tripulante: { id: `sintetico-${indice}`, lecturas: serie }, entorno,
    uso: escenario === "entorno_referencia" ? "referencia" : "escenario",
    cambios: escenario === "cambio_instrumento" ? [{ dia_mision: 30, indicador: "fc" }] : [],
    evento: deriva ? { inicio, fin, tipo: "deriva" } : escenario === "extremo" ? { inicio: 36, fin: 36, tipo: "extremo" }
      : escenario === "entorno_escenario" ? { inicio: 36, fin: 36, tipo: "ambiente" } : null }
}
