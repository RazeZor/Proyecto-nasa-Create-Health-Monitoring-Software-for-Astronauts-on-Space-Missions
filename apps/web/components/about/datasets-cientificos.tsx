"use client"

import { useEffect, useState } from "react"
import { leerDatasets, type CatalogoDatasets } from "@/lib/datasets-cientificos"
import { API_BASE_URL } from "@/lib/etl-client"
import { guardarCache, leerCache } from "@/lib/storage"
import { IDIOMA, textoCiencia as texto } from "@/lib/strings"

export function DatasetsCientificos() {
  const [catalogo, fijarCatalogo] = useState<CatalogoDatasets | null>(null)
  const [estado, fijarEstado] = useState("datasets_cargando")
  useEffect(() => {
    let activo = true, respondio = false
    const controlador = new AbortController()
    const limite = setTimeout(() => controlador.abort(), 8000)
    void (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/ciencia/datasets`, { signal: controlador.signal, cache: "no-store" })
        respondio = true
        if (!r.ok) throw new Error("datos_no_verificados")
        const datos = leerDatasets(await r.json())
        if (!datos) throw new Error("contrato_incompatible")
        if (activo) { fijarCatalogo(datos); fijarEstado(datos.datasets.length ? "datasets_disponibles" : "datasets_vacio"); guardarCache("datasets-ciencia-v1", datos) }
      } catch {
        const copia = !respondio ? leerDatasets(leerCache("datasets-ciencia-v1")) : null
        if (activo) { fijarCatalogo(copia); fijarEstado(copia ? "cache" : "datasets_error") }
      } finally { clearTimeout(limite) }
    })()
    return () => { activo = false; clearTimeout(limite); controlador.abort() }
  }, [])
  const n = (v: number) => v.toLocaleString(IDIOMA)
  return <section aria-labelledby="datasets-cientificos" className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-7">
    <h2 id="datasets-cientificos" className="text-2xl font-semibold">{texto("datasets_titulo")}</h2>
    <p className="mt-3 text-muted-foreground">{texto("datasets_alcance")}</p>
    <p className="mt-3" role="status">{texto(estado)}</p>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">{catalogo?.datasets.map((d) => <article key={d.id} data-dataset={d.id} className="min-w-0 rounded-2xl border border-border p-4">
      <h3 className="text-lg font-semibold">{d.nombre} · {d.version}</h3>
      <p className="mt-1 text-sm font-medium">{texto(`datasets_tipo_${d.tipo}`)}</p>
      <dl className="mt-3 space-y-2 text-sm">
        <div><dt className="inline">{texto("datasets_registros")}: </dt><dd className="inline font-mono">{n(d.registros)}</dd></div>
        {d.sujetos !== undefined && <div><dt className="inline">{texto("datasets_sujetos")}: </dt><dd className="inline font-mono">{n(d.sujetos)}</dd></div>}
        {d.registros_utilizados !== undefined && <div><dt className="inline">{texto("datasets_utilizados")}: </dt><dd className="inline font-mono">{n(d.registros_utilizados)}</dd></div>}
        {d.periodos_sueno !== undefined && <div><dt className="inline">{texto("datasets_sueno")}: </dt><dd className="inline font-mono">{n(d.periodos_sueno)}</dd></div>}
        {d.detectores !== undefined && <div><dt className="inline">{texto("datasets_detectores")}: </dt><dd className="inline font-mono">{n(d.detectores)}</dd></div>}
        <div><dt className="inline">{texto("datasets_puntos")}: </dt><dd className="inline font-mono">{n(d.puntos_5min)}</dd></div>
        {d.desde && <div><dt className="inline">{texto("datasets_ventana")}: </dt><dd className="inline">{d.desde} – {d.hasta}</dd></div>}
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">{texto(`datasets_limite_${d.id}`)}</p>
      <p className="mt-3 break-all font-mono text-xs">{texto("datasets_hash")}: {d.sha256}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <a className="underline" href={d.fuente} target="_blank" rel="noreferrer">{texto("fuentes")}</a>
        <a className="underline" href={`${API_BASE_URL}/ciencia/datasets/${d.id}`} target="_blank" rel="noreferrer">{texto("datasets_detalle")}</a>
      </div>
    </article>)}</div>
  </section>
}
