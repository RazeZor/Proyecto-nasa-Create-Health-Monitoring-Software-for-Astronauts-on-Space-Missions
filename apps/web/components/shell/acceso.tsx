"use client"

import { useState } from "react"
import { acceder, iniciarDemo, type SesionVerificada } from "@/lib/sesion"
import { textoSistema as t } from "@/lib/strings"

export function Acceso({ alAcceder }: { alAcceder: (s: SesionVerificada) => void }) {
  const [usuario, setUsuario] = useState("")
  const [clave, setClave] = useState("")
  const [error, setError] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6">
    <h1 className="text-3xl font-semibold">{t("acceso.titulo")}</h1>
    <p>{t("acceso.detalle")}</p>
    <button disabled={ocupado} className="min-h-14 rounded-2xl bg-primary px-6 text-lg font-semibold text-primary-foreground" onClick={async () => {
      setOcupado(true); setError(false)
      try { const s = await iniciarDemo(); if (s) alAcceder(s); else setError(true) }
      catch { setError(true) } finally { setOcupado(false) }
    }}>{t("acceso.explorar_demo")}</button>
    <p className="text-sm text-muted-foreground">{t("acceso.demo_detalle")}</p>
    <details className="rounded-2xl border p-4"><summary className="cursor-pointer py-2 font-semibold">{t("acceso.cuenta_personal")}</summary>
    <form className="mt-4 flex flex-col gap-4" onSubmit={async (e) => {
      e.preventDefault(); setOcupado(true); setError(false)
      try { const s = await acceder(usuario, clave); setClave(""); if (s) alAcceder(s); else setError(true) }
      catch { setError(true) } finally { setOcupado(false) }
    }}>
      <label className="grid gap-2">{t("acceso.usuario")}<input autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} required maxLength={100} className="min-h-12 rounded-xl border p-3" /></label>
      <label className="grid gap-2">{t("acceso.clave")}<input type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required maxLength={200} className="min-h-12 rounded-xl border p-3" /></label>
      <button disabled={ocupado} className="min-h-12 rounded-xl bg-primary px-5 text-primary-foreground">{t("acceso.entrar")}</button>
    </form>
    </details>
    {error && <p role="alert">{t("acceso.error")}</p>}
  </main>
}
