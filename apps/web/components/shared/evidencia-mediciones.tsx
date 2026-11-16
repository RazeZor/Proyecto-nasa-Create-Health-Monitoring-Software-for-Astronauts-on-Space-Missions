"use client"
import { useApp } from "@/components/app-context"
import { evidenciasDelDia } from "@/lib/evidencia-mediciones"
import { textoSistema as t, IDIOMA } from "@/lib/strings"

export function EvidenciaMediciones() {
  const { checkIns, catalogo, day, mode, analisis } = useApp()
  if (mode !== "real") return null
  const ahora = new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
  const medidas = evidenciasDelDia(checkIns, catalogo.historial, day, ahora)
  return <aside className="my-4 rounded-2xl border bg-card p-4" aria-label={t("evidencia.titulo")}>
    <h2 className="text-xl font-semibold">{t("evidencia.titulo")}</h2>
    <p className="mt-2">{medidas.length === 0 ? t("evidencia.sin_datos") : medidas.every((m) => m.estado === "utilizable") ? t("evidencia.utilizable") : t("evidencia.incompleta")}</p>
    {analisis.alerts(day).filter((a) => a.requiereConfirmacion).map((a) => <p key={a.id} className="mt-2 border-l-4 border-status-watch pl-3">{t("evidencia.extremo")} · {a.value} · {a.time}</p>)}
    <details className="mt-2"><summary className="cursor-pointer py-2">{t("evidencia.detalle")}</summary><ul className="grid gap-2">{medidas.map((m) => {
      const nombres: Record<string, string> = { fc_reposo_lpm: "restingHr", pas_mmHg: "systolic", spo2_pct: "spo2", temp_central_c: "tempC", sueno_h: "sleepH", animo_1_10: "mood", glucosa_mg_dl: "glucose", masa_kg: "massKg" }
      const indicador = catalogo.indicadores[nombres[m.campo] as keyof typeof catalogo.indicadores]
      return <li key={m.campo}>{indicador?.label ?? t("evidencia.diastolica")} · {new Intl.NumberFormat(IDIOMA).format(m.valor)} {indicador?.unit ?? "mmHg"} · {m.t_real ? new Date(m.t_real).toLocaleString(IDIOMA) : t("evidencia.hora_desconocida")} · {m.estado === "utilizable" ? t("evidencia.utilizable") : t("evidencia.antiguo")}</li>
    })}</ul></details>
  </aside>
}
