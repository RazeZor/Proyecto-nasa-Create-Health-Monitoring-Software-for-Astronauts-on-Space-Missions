"use client"

import { useEffect, useState } from "react"
import { leerEvidencia, type EvidenciaCientifica } from "@/lib/ciencia"
import { API_BASE_URL } from "@/lib/etl-client"
import { guardarCache, leerCache } from "@/lib/storage"
import { IDIOMA, textoCiencia as texto } from "@/lib/strings"

export function EvidenciaCientificaPanel() {
  const [datos, fijarDatos] = useState<EvidenciaCientifica | null>(null)
  const [estado, fijarEstado] = useState("cargando")
  const [escenario, fijarEscenario] = useState("deriva_sutil")
  useEffect(() => {
    let activo = true
    const controlador = new AbortController()
    const tiempo = setTimeout(() => controlador.abort(), 8000)
    async function cargar() {
      let respondio = false
      try {
        const r = await fetch(`${API_BASE_URL}/ciencia/evidencia`, { signal: controlador.signal, cache: "no-store" })
        respondio = true
        if (!r.ok) throw new Error("evidencia_no_verificada")
        const evidencia = leerEvidencia(await r.json())
        if (!evidencia) throw new Error("contrato_incompatible")
        if (activo) { fijarDatos(evidencia); fijarEstado(evidencia.estado); guardarCache("ciencia-v1", evidencia) }
      } catch {
        // Una respuesta corrupta del servidor nunca se oculta detrás de una copia antigua.
        const copia = !respondio ? leerEvidencia(leerCache("ciencia-v1")) : null
        if (activo) { fijarDatos(copia); fijarEstado(copia ? "cache" : "fallo") }
      } finally { clearTimeout(tiempo) }
    }
    void cargar()
    return () => { activo = false; clearTimeout(tiempo); controlador.abort() }
  }, [])
  const informe = datos?.informe
  const filas = informe?.resultados.filter((r) => r.escenario === escenario) ?? []
  const decimal = (v: number | null) => v === null ? texto("sin_dato") : v.toLocaleString(IDIOMA, { maximumFractionDigits: 3 })
  return <section aria-labelledby="evidencia-cientifica" className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-7">
    <h2 id="evidencia-cientifica" className="text-2xl font-semibold">{texto("titulo")}</h2>
    <p className="mt-3 font-semibold text-status-watch">{texto("alcance")}</p>
    <p className="mt-3 text-muted-foreground">{texto("introduccion")}</p>
    <p role="status" className="mt-3 font-medium">{texto(estado)}</p>
    {informe && <>
      <p className="mt-4 text-sm">{texto("fecha")}: {informe.t_real}</p>
      <p className="mt-1 break-all font-mono text-xs">{texto("codigo")}: {informe.congelacion.archivos["packages/engine/engine.ts"]}</p>
      <label className="mt-5 flex flex-col gap-2">{texto("escenario")}
        <select className="rounded-lg border border-border bg-background p-2" value={escenario} onChange={(e) => fijarEscenario(e.target.value)}>
          {[...new Set(informe.resultados.map((r) => r.escenario))].map((s) => <option key={s} value={s}>{texto(`escenarios.${s}`)}</option>)}
        </select>
      </label>
      <p className="mt-3 text-sm text-muted-foreground md:hidden">{texto("deslizar")}</p>
      <div className="mt-4 overflow-x-auto" role="region" aria-label={texto("tabla")} tabIndex={0}>
        <table className="w-full text-left text-sm tabular-nums">
          <caption className="sr-only">{texto("titulo")}</caption>
          <thead><tr>{["metodo", "deteccion", "omitidos", "intervalo", "retraso", "falsas", "exposicion"].map((k) => <th key={k} scope="col" className="p-3 align-top">{texto(k)}</th>)}</tr></thead>
          <tbody>{filas.map((r) => <tr key={r.metodo} className="border-t border-border">
            <th scope="row" className="p-3 whitespace-nowrap">{texto(`metodos.${r.metodo}`)}</th>
            <td className="p-3">{r.detectados} / {r.eventos}</td><td className="p-3">{r.no_detectados}</td>
            <td className="p-3 whitespace-nowrap">{r.ic95_deteccion ? r.ic95_deteccion.map((v) => `${(100 * v).toLocaleString(IDIOMA, { maximumFractionDigits: 1 })} %`).join(" – ") : texto("sin_dato")}</td>
            <td className="p-3">{decimal(r.retraso_mediana_solo_detectados_dias)}</td>
            <td className="p-3">{decimal(r.falsos_por_persona_semana)}</td>
            <td className="p-3">{r.falsos_episodios} / {r.dias_observados_fuera_evento}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{texto("limites_banco")}</p>
      <a className="mt-4 inline-block underline" href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(datos, null, 2))}`} download="vigia-evidencia.json">{texto("descargar")}</a>
    </>}
    {datos && <><h3 className="mt-7 text-xl font-semibold">{texto("afirmaciones_titulo")}</h3>
      <dl className="mt-3 divide-y divide-border">{datos.catalogo.afirmaciones.map((a) => <div className="py-4" key={a.id}>
        <dt className="font-semibold">{texto(`afirmaciones.${a.id}`)} <span className="font-normal text-muted-foreground">· {texto(`estados.${a.estado}`)}</span></dt>
        <dd className="mt-2 text-sm text-muted-foreground">{texto(`limites.${a.id}`)}</dd>
        <dd className="mt-2 break-words font-mono text-xs">{texto("artefactos")}: {a.artefactos.join(", ")}</dd>
        {a.fuentes.map((u) => <dd key={u} className="mt-2 break-all text-sm"><a className="underline" href={u} target="_blank" rel="noreferrer">{texto("fuentes")}: {new URL(u).hostname}</a></dd>)}
      </div>)}</dl>
    </>}
  </section>
}
