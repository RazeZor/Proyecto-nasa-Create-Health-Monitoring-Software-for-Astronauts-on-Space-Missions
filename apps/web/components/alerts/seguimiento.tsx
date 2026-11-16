"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useApp } from "@/components/app-context"
import { leerSeguimiento, registrarEvento, resolverConflicto, sincronizarSeguimiento, type Episodio, type TipoEvento } from "@/lib/seguimiento"
import { TRIPULANTE } from "@/lib/sincronizacion"
import { textoSistema as t, MOTOR, IDIOMA } from "@/lib/strings"
import { nuevoId } from "@/lib/utils"

export function SeguimientoEpisodios() {
  const { mode, analisis, day, role, checkIns } = useApp()
  const [episodios, setEpisodios] = useState<Episodio[]>([])
  const [confirmadas, setConfirmadas] = useState<string[]>([])
  const [conflictos, setConflictos] = useState<string[]>([])
  const [nota, setNota] = useState("")
  const [error, setError] = useState(false)
  const etiqueta = (clave: string) => (MOTOR.indicador as Record<string, string>)[clave] ?? t("seguimiento.personal")
  const recargar = useCallback(async () => {
    try { const b = await leerSeguimiento(); setEpisodios(b.episodios); setConfirmadas(b.confirmadas); setConflictos(b.conflictos) }
    catch { setError(true) }
  }, [])
  useEffect(() => {
    void recargar()
    const sincronizar = () => {
      if (mode === "real" && TRIPULANTE) void sincronizarSeguimiento(TRIPULANTE).then(recargar).catch(() => setError(true))
    }
    sincronizar()
    const reloj = window.setInterval(sincronizar, 15000)
    window.addEventListener("online", sincronizar)
    return () => { clearInterval(reloj); window.removeEventListener("online", sincronizar) }
  }, [mode, recargar])
  const guardar = async (tipo: TipoEvento, e?: Episodio, clave?: string) => {
    if (!nota.trim()) { setError(true); return }
    const ultimaAccion = e?.eventos.findLast((v) => ["abrir", "reabrir", "accion", "impedimento"].includes(v.tipo))?.t_real
    const limite = ultimaAccion ? Date.parse(ultimaAccion) + 999 : Infinity
    const observaciones = ["abrir", "remedicion"].includes(tipo) ? checkIns.filter((c) => c.day === day).flatMap((c) =>
      Object.keys(c.tiemposMedicion ?? {}).filter((k) => c[k as keyof typeof c] != null &&
        (tipo === "abrir" || Date.parse(c.tiemposMedicion?.[k as keyof NonNullable<typeof c.tiemposMedicion>] ?? "") > limite)).map((k) => {
        const ids: Record<string, string> = { restingHr: "frecuencia_cardiaca_reposo", systolic: "presion_arterial_sistolica", diastolic: "presion_arterial_diastolica", spo2: "spo2", tempC: "temperatura_central", sleepH: "sueno", mood: "estado_animo", glucose: "glucosa", massKg: "masa_corporal" }
        return ids[k] ? `${c.id}:${ids[k]}` : ""
      }).filter(Boolean)) : []
    try {
      await registrarEvento({ id: nuevoId(), episodio_id: e?.id ?? nuevoId(), clave: e?.clave ?? clave ?? "seguimiento-personal",
        indicador: e?.indicador ?? clave ?? "personal", tipo, nota: nota.trim(), observaciones,
        t_real: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), version_previa: e?.version ?? 0 })
      setNota(""); setError(false); await recargar()
      if (mode === "real" && TRIPULANTE) await sincronizarSeguimiento(TRIPULANTE)
      await recargar()
    } catch { setError(true) }
  }
  return <section aria-labelledby="seguimiento-titulo" className="my-6 grid gap-4 rounded-3xl border bg-card p-5">
    <h2 id="seguimiento-titulo" className="text-2xl font-semibold">{t("seguimiento.titulo")}</h2>
    <p>{t("seguimiento.detalle")}</p>
    <label className="grid gap-2">{t("seguimiento.motivo")}<textarea value={nota} onChange={(e) => setNota(e.target.value)} maxLength={2000} className="min-h-20 rounded-xl border p-3" /></label>
    {role === "astronaut" && <div className="flex flex-wrap gap-3">{[...new Set(analisis.alerts(day).filter((a) => !a.informative).map((a) => a.key ?? a.id)), "seguimiento-personal"].map((clave) =>
      <button key={clave} disabled={episodios.some((e) => e.clave === clave && e.estado !== "cerrado")} className="min-h-12 rounded-xl border px-4 disabled:opacity-40" onClick={() => void guardar("abrir", undefined, clave)}>{t("seguimiento.abrir")} · {etiqueta(clave)}</button>)}</div>}
    {episodios.length === 0 && <p>{t("seguimiento.vacio")}</p>}
    {episodios.map((e) => <article key={e.id} className="grid gap-3 rounded-xl border p-4">
      <h3 className="text-xl font-semibold">{etiqueta(e.indicador)} · {t(`seguimiento.${e.estado}`)}</h3>
      <p role="status">{conflictos.includes(e.id) ? t("seguimiento.conflicto") : e.eventos.every((v) => confirmadas.includes(v.id)) ? t("seguimiento.sincronizado") : t("seguimiento.pendiente")}</p>
      {conflictos.includes(e.id) && <button className="min-h-12 rounded-xl border px-4" onClick={() => { if (TRIPULANTE) void resolverConflicto(TRIPULANTE, e.id).then(recargar).catch(() => setError(true)) }}>{t("seguimiento.resolver")}</button>}
      <div className="flex flex-wrap gap-2">{(e.estado === "cerrado" ? ["reabrir"] : ["accion", "impedimento", "remedicion", "solicitar_revision"]).map((tipo) =>
        <button key={tipo} className="min-h-12 rounded-xl border px-4" onClick={() => void guardar(tipo as TipoEvento, e)}>{t(`seguimiento.${({ solicitar_revision: "revision", remedicion: "remedir" } as Record<string, string>)[tipo] ?? tipo}`)}</button>)}
        <Link className="min-h-12 rounded-xl border px-4 py-3" href="/astronauta/check-in">{t("seguimiento.tomar")}</Link>
      </div>
      <details><summary className="cursor-pointer py-2">{t("seguimiento.historia")}</summary><ol className="grid gap-2">{e.eventos.map((v) => <li key={v.id} className="border-l-2 pl-3"><time>{new Date(v.t_real).toLocaleString(IDIOMA)}</time> · {v.nota}{v.observaciones.length > 0 && <p className="break-all text-sm">{t("seguimiento.comparacion")}: {v.observaciones.join(", ")}</p>}</li>)}</ol></details>
    </article>)}
    {error && <p role="alert">{t("seguimiento.error")}</p>}
  </section>
}
