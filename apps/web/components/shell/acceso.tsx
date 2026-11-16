"use client"

import { useEffect, useState } from "react"
import { acceder, iniciarDemo, registrarCuenta, type SesionVerificada } from "@/lib/sesion"
import { Logo } from "@/components/shared/logo"
import { textoSistema as t } from "@/lib/strings"

export function Acceso({ alAcceder }: { alAcceder: (s: SesionVerificada) => void }) {
  const [usuario, setUsuario] = useState("")
  const [clave, setClave] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [invitacion, setInvitacion] = useState("")
  const [crear, setCrear] = useState(false)
  const [error, setError] = useState(false)
  const [clavesDistintas, setClavesDistintas] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    setCrear(new URLSearchParams(window.location.search).get("alta") === "1")
  }, [])

  function abrirAlta() {
    window.location.assign("/?lang=en&alta=1")
  }

  function volverAcceso() {
    window.location.assign("/?lang=en")
  }

  return <main className="flex min-h-dvh items-center justify-center bg-black px-5 py-10 text-white">
    <section className="flex w-full max-w-md flex-col gap-6 rounded-3xl border border-white/15 bg-zinc-950 p-7 shadow-2xl sm:p-9">
      <Logo className="h-12 text-white" />
      {crear ? <>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{t("acceso.alta_titulo")}</h1>
          <p className="text-sm leading-6 text-zinc-300">{t("acceso.alta_detalle")}</p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={async (e) => {
          e.preventDefault(); setOcupado(true); setError(false); setClavesDistintas(false)
          if (clave !== confirmar) { setClavesDistintas(true); setOcupado(false); return }
          try {
            if (!await registrarCuenta(invitacion.trim(), usuario, clave)) { setError(true); return }
            const sesion = await acceder(usuario, clave)
            if (sesion) { setClave(""); setConfirmar(""); alAcceder(sesion) }
            else setError(true)
          } catch { setError(true) } finally { setOcupado(false) }
        }}>
          <label className="grid gap-2 text-sm">{t("acceso.alta_invitacion")}<input autoComplete="one-time-code" value={invitacion} onChange={(e) => setInvitacion(e.target.value)} required maxLength={2048} className="min-h-12 rounded-xl border border-zinc-700 bg-black px-3 text-white outline-none focus:border-white" /></label>
          <label className="grid gap-2 text-sm">{t("acceso.usuario")}<input autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} required minLength={3} maxLength={100} className="min-h-12 rounded-xl border border-zinc-700 bg-black px-3 text-white outline-none focus:border-white" /></label>
          <label className="grid gap-2 text-sm">{t("acceso.clave")}<input type="password" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} required minLength={12} maxLength={200} className="min-h-12 rounded-xl border border-zinc-700 bg-black px-3 text-white outline-none focus:border-white" /></label>
          <label className="grid gap-2 text-sm">{t("acceso.alta_confirmar")}<input type="password" autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required minLength={12} maxLength={200} className="min-h-12 rounded-xl border border-zinc-700 bg-black px-3 text-white outline-none focus:border-white" /></label>
          <button disabled={ocupado} className="mt-2 min-h-12 rounded-xl bg-white px-5 font-semibold text-black disabled:opacity-50">{t("acceso.alta_crear")}</button>
          {clavesDistintas && <p role="alert" className="text-sm text-zinc-200">{t("acceso.alta_claves")}</p>}
          {error && <p role="alert" className="text-sm text-zinc-200">{t("acceso.alta_error")}</p>}
        </form>
        <button className="self-start text-sm text-zinc-300 underline underline-offset-4" onClick={volverAcceso}>{t("acceso.alta_volver")}</button>
      </> : <>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{t("acceso.titulo")}</h1>
          <p className="text-sm leading-6 text-zinc-300">{t("acceso.detalle")}</p>
        </div>
        <button disabled={ocupado} className="min-h-14 rounded-xl bg-white px-6 text-lg font-semibold text-black disabled:opacity-50" onClick={async () => {
          setOcupado(true); setError(false)
          try { const s = await iniciarDemo(); if (s) alAcceder(s); else setError(true) }
          catch { setError(true) } finally { setOcupado(false) }
        }}>{t("acceso.explorar_demo")}</button>
        <p className="-mt-4 text-sm text-zinc-400">{t("acceso.demo_detalle")}</p>
        <details className="rounded-2xl border border-white/15 p-4"><summary className="cursor-pointer py-2 font-semibold">{t("acceso.cuenta_personal")}</summary>
          <form className="mt-4 flex flex-col gap-4" onSubmit={async (e) => {
            e.preventDefault(); setOcupado(true); setError(false)
            try { const s = await acceder(usuario, clave); setClave(""); if (s) alAcceder(s); else setError(true) }
            catch { setError(true) } finally { setOcupado(false) }
          }}>
            <label className="grid gap-2 text-sm">{t("acceso.usuario")}<input autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} required maxLength={100} className="min-h-12 rounded-xl border border-zinc-700 bg-black px-3 text-white outline-none focus:border-white" /></label>
            <label className="grid gap-2 text-sm">{t("acceso.clave")}<input type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required maxLength={200} className="min-h-12 rounded-xl border border-zinc-700 bg-black px-3 text-white outline-none focus:border-white" /></label>
            <button disabled={ocupado} className="min-h-12 rounded-xl border border-white/30 px-5 font-semibold text-white disabled:opacity-50">{t("acceso.entrar")}</button>
          </form>
        </details>
        <button className="self-start text-sm text-zinc-300 underline underline-offset-4" onClick={abrirAlta}>{t("acceso.crear_cuenta")}</button>
        {error && <p role="alert" className="text-sm text-zinc-200">{t("acceso.error")}</p>}
      </>}
    </section>
  </main>
}
