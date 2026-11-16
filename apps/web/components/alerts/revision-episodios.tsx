"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { API_BASE_URL, leerTripulacion } from "@/lib/api-registro"
import { peticion } from "@/lib/sesion"
import { TRIPULANTE } from "@/lib/sincronizacion"
import { textoSistema as t, IDIOMA } from "@/lib/strings"
import { nuevoId } from "@/lib/utils"
import type { Episodio } from "@/lib/seguimiento"

export function RevisionEpisodios() {
  const [equipo, setEquipo] = useState<{ id: number; alias: string }[]>([])
  const [sujeto, setSujeto] = useState(0)
  const [episodios, setEpisodios] = useState<Episodio[]>([])
  const [nota, setNota] = useState("")
  const [fallo, setFallo] = useState(false)
  const [tomas, setTomas] = useState<{ id: string; valor: number; unidad: string; t_real: string | null }[]>([])
  const consulta = useRef(0)
  const cargar = useCallback(async () => {
    if (!sujeto) return
    const numero = ++consulta.current
    try {
      const [r, medidas] = await Promise.all([peticion(`${API_BASE_URL}/tripulantes/${sujeto}/episodios`, { cache: "no-store" }),
        peticion(`${API_BASE_URL}/tripulantes/${sujeto}/observaciones`, { cache: "no-store" })])
      if (numero !== consulta.current) return
      if (!r.ok || !medidas.ok) { setEpisodios([]); setTomas([]); setFallo(true); return }
      setEpisodios(await r.json() as Episodio[]); setTomas(await medidas.json() as typeof tomas); setFallo(false)
    } catch { setFallo(true) }
  }, [sujeto])
  useEffect(() => { if (TRIPULANTE) void leerTripulacion(TRIPULANTE).then((e) => { if (e) setEquipo(e) }) }, [])
  useEffect(() => { void cargar() }, [cargar])
  return <section className="my-4 grid gap-3 rounded-3xl border bg-card p-5">
    <h2 className="text-2xl font-semibold">{t("seguimiento.revision")}</h2>
    <select aria-label={t("seguimiento.revision")} value={sujeto} className="min-h-12 rounded-xl border p-3" onChange={(e) => { consulta.current++; setEpisodios([]); setTomas([]); setSujeto(Number(e.target.value)) }}><option value={0}>{t("seguimiento.revision")}</option>{equipo.map((e) => <option key={e.id} value={e.id}>{e.alias}</option>)}</select>
    <label className="grid gap-2">{t("seguimiento.motivo")}<textarea maxLength={2000} value={nota} onChange={(e) => setNota(e.target.value)} className="min-h-20 rounded-xl border p-3" /></label>
    {episodios.map((e) => <article key={e.id} className="rounded-xl border p-4"><h3>{e.indicador} · {t(`seguimiento.${e.estado}`)}</h3><ol>{e.eventos.map((v) => <li key={v.id}>{new Date(v.t_real).toLocaleString(IDIOMA)} · {v.nota}<ul>{v.observaciones.map((id) => { const o = tomas.find((m) => m.id === id); return <li key={id}>{o ? `${new Intl.NumberFormat(IDIOMA).format(o.valor)} ${o.unidad} · ${o.t_real ? new Date(o.t_real).toLocaleString(IDIOMA) : t("evidencia.sin_datos")}` : id}</li> })}</ul></li>)}</ol>
      {e.estado === "en_revision" && <button className="mt-3 min-h-12 rounded-xl border px-4" disabled={!nota.trim()} onClick={() => { void (async () => {
        const r = await peticion(`${API_BASE_URL}/tripulantes/${sujeto}/episodios/eventos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
          id: nuevoId(), episodio_id: e.id, clave: e.clave, indicador: e.indicador, tipo: "cerrar", nota: nota.trim(), observaciones: [], t_real: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), version_previa: e.version,
        }) })
        if (!r.ok) { setFallo(true); return }
        setNota(""); await cargar()
      })().catch(() => setFallo(true)) }}>{t("seguimiento.cerrar")}</button>}
    </article>)}
    {fallo && <p role="alert">{t("seguimiento.error")}</p>}
  </section>
}
