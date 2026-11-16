"use client"

import { useEffect, useRef, useState } from "react"
import { useApp } from "@/components/app-context"
import { guardarEstudio, leerEstudios, sincronizarEstudios } from "@/lib/estudios"
import { crearRespaldo, restaurarRespaldo } from "@/lib/respaldo"
import { resumirReaccion, type EnsayoReaccion } from "../../../../packages/engine/ciencia"
import { TRIPULANTE } from "@/lib/sincronizacion"
import { textoSistema as t, IDIOMA } from "@/lib/strings"
import { nuevoId } from "@/lib/utils"
import { API_BASE_URL } from "@/lib/api-registro"
import { peticion } from "@/lib/sesion"

export function ModulosCientificos() {
  const { role, mode } = useApp()
  const [metodo, setMetodo] = useState("diario")
  const [horas, setHoras] = useState("")
  const [turno, setTurno] = useState("")
  const [carga, setCarga] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [fase, setFase] = useState<"inactivo" | "espera" | "estimulo">("inactivo")
  const [resultados, setResultados] = useState<EnsayoReaccion[]>([])
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inicio = useRef<number | null>(null)
  const estimulo = useRef<number | null>(null)
  const fotograma = useRef(0)
  const interrumpida = useRef(false)
  const ensayosRef = useRef<EnsayoReaccion[]>([])
  const activa = useRef(false)
  const cancelar = () => { if (reloj.current !== null) clearTimeout(reloj.current); reloj.current = null; estimulo.current = null }
  useEffect(() => {
    const detener = () => {
      if (!activa.current) return
      activa.current = false; cancelar(); interrumpida.current = true; setFase("inactivo"); setMensaje(t("ciencia.interrumpida"))
      void guardar("reaccion", { ...resumirReaccion(ensayosRef.current, true), ensayos: ensayosRef.current, interrumpida: true, motivo: "visibilidad_o_foco", plataforma: navigator.userAgent })
    }
    const visibilidad = () => { if (document.visibilityState !== "visible") detener() }
    document.addEventListener("visibilitychange", visibilidad)
    window.addEventListener("blur", detener)
    return () => { cancelar(); document.removeEventListener("visibilitychange", visibilidad); window.removeEventListener("blur", detener) }
  }, [])
  const guardar = async (tipo: "sueno_contexto" | "reaccion", datos: Record<string, unknown>) => {
    try {
      await guardarEstudio({ id: nuevoId(), t_real: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), tipo,
        protocolo: tipo === "reaccion" ? "reaccion-practica-v1" : "diario-sueno-v1", datos })
      setMensaje(datos.interrumpida ? t("ciencia.interrumpida") : t("seguimiento.registrado"))
      if (mode === "real" && TRIPULANTE) await sincronizarEstudios(TRIPULANTE)
    } catch { setMensaje(t("seguimiento.error")) }
  }
  const programar = () => {
    setFase("espera"); estimulo.current = null
    reloj.current = setTimeout(() => {
      if (interrumpida.current) return
      const antes = performance.now()
      requestAnimationFrame(() => {
        if (interrumpida.current) return
        fotograma.current = performance.now() - antes
        estimulo.current = performance.now(); setFase("estimulo")
        reloj.current = setTimeout(() => {
          activa.current = false; interrumpida.current = true; setFase("inactivo"); setMensaje(t("ciencia.interrumpida"))
          void guardar("reaccion", { ...resumirReaccion(ensayosRef.current, true), ensayos: ensayosRef.current, interrumpida: true, motivo: "sin_respuesta_10s", plataforma: navigator.userAgent })
        }, 10000)
      })
    }, 1000 + Math.random() * 2000)
  }
  const responder = (interaccion: "pointerdown" | "keydown") => {
    if (!activa.current) return
    if (fase !== "estimulo" || estimulo.current === null) {
      activa.current = false; cancelar(); interrumpida.current = true; setFase("inactivo"); setMensaje(t("ciencia.interrumpida"))
      void guardar("reaccion", { ...resumirReaccion(ensayosRef.current, true), ensayos: ensayosRef.current, interrumpida: true, motivo: "respuesta_anticipada", plataforma: navigator.userAgent })
      return
    }
    const nuevo = [...ensayosRef.current, { estimulo_ms: estimulo.current - inicio.current!, respuesta_ms: performance.now() - inicio.current!, fotograma_ms: fotograma.current, interrupcion: interrumpida.current, interaccion }]
    cancelar(); ensayosRef.current = nuevo; setResultados(nuevo)
    if (nuevo.length === 5) { activa.current = false; setFase("inactivo"); void guardar("reaccion", { ...resumirReaccion(nuevo, true), ensayos: nuevo, plataforma: navigator.userAgent, ensayos_contados: nuevo.length }) }
    else programar()
  }
  if (role !== "astronaut") return null
  return <section className="my-4 rounded-3xl border bg-card p-5">
    <h2 className="text-2xl font-semibold">{t("ciencia.titulo")}</h2><p className="my-3">{t("ciencia.detalle")}</p>
    <details><summary className="cursor-pointer py-3 text-xl">{t("ciencia.sueno")}</summary>
      <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); void guardar("sueno_contexto", { horas: horas === "" ? null : Number(horas), metodo, turno, carga: carga === "" ? null : Number(carga) }) }}>
        <label className="grid gap-1">{t("ciencia.sueno")}<input type="number" min={0} max={24} step={0.1} value={horas} onChange={(e) => setHoras(e.target.value)} className="min-h-12 rounded-xl border p-3" /></label>
        <label className="grid gap-1">{t("ciencia.metodo")}<select value={metodo} onChange={(e) => setMetodo(e.target.value)} className="min-h-12 rounded-xl border p-3"><option value="diario">{t("ciencia.diario")}</option><option value="estimado">{t("ciencia.estimado")}</option></select></label>
        <label className="grid gap-1">{t("ciencia.turno")}<input value={turno} maxLength={100} onChange={(e) => setTurno(e.target.value)} className="min-h-12 rounded-xl border p-3" /></label>
        <label className="grid gap-1">{t("ciencia.carga")}<input type="number" min={0} max={10} step={1} value={carga} onChange={(e) => setCarga(e.target.value)} className="min-h-12 rounded-xl border p-3" /></label>
        <button className="min-h-12 rounded-xl border px-4">{t("ciencia.guardar")}</button>
      </form>
    </details>
    <details><summary className="cursor-pointer py-3 text-xl">{t("ciencia.reaccion")}</summary>
      <p>{t("ciencia.practica")}</p>
      {fase === "inactivo" ? <button className="my-3 min-h-14 rounded-xl border px-5" onClick={() => { cancelar(); activa.current = true; ensayosRef.current = []; interrumpida.current = false; inicio.current = performance.now(); setResultados([]); setMensaje(""); programar() }}>{t("ciencia.iniciar")}</button> :
        <button className={`my-3 min-h-40 w-full rounded-2xl border px-5 text-3xl ${fase === "estimulo" ? "bg-primary text-primary-foreground" : "bg-muted"}`} onPointerDown={(e) => { e.preventDefault(); responder("pointerdown") }} onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); responder("keydown") } }}>{fase === "estimulo" ? t("ciencia.responder") : t("ciencia.esperar")}</button>}
      <p>{t("ciencia.resultado")}: {new Intl.NumberFormat(IDIOMA).format(resultados.length)}</p>
    </details>
    <button className="mt-3 min-h-12 rounded-xl border px-4" onClick={() => { void (async () => {
      await leerEstudios()
      const respaldo = await crearRespaldo()
      const objeto = URL.createObjectURL(new Blob([JSON.stringify(respaldo)], { type: "application/json" }))
      const enlace = document.createElement("a"); enlace.href = objeto; enlace.download = "vigia-respaldo-privado.json"; enlace.click(); URL.revokeObjectURL(objeto)
      setMensaje(t("ciencia.respaldo"))
    })().catch(() => setMensaje(t("seguimiento.error"))) }}>{t("ciencia.exportar")}</button>
    <label className="mt-3 grid gap-2">{t("ciencia.restaurar")}<input type="file" accept="application/json" onChange={(e) => {
      const archivo = e.target.files?.[0]
      if (!archivo) return
      if (archivo.size > 20_000_000) { setMensaje(t("seguimiento.error")); return }
      void archivo.text().then(restaurarRespaldo).then(() => setMensaje(t("seguimiento.registrado"))).catch(() => setMensaje(t("seguimiento.error")))
    }} /></label>
    <details className="mt-3"><summary className="cursor-pointer py-3">{t("acceso.consentimientos")}</summary><p>{t("acceso.alcance_clinico")}</p>
      {([true, false] as const).map((aceptado) => <button key={String(aceptado)} className="m-1 min-h-12 rounded-xl border px-4" onClick={() => { void (async () => {
        if (!TRIPULANTE || mode !== "real") { setMensaje(t("seguimiento.error")); return }
        const r = await peticion(`${API_BASE_URL}/tripulantes/${TRIPULANTE}/consentimientos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ regla: "historial_clinico", aceptado }) })
        setMensaje(r.ok ? t("seguimiento.registrado") : t("seguimiento.error"))
      })().catch(() => setMensaje(t("seguimiento.error"))) }}>{t(aceptado ? "acceso.conceder" : "acceso.revocar")}</button>)}
    </details>
    {mensaje && <p role="status" className="mt-3">{mensaje}</p>}
  </section>
}
