"use client"

import { useState } from "react"
import { acceder, type SesionVerificada } from "@/lib/sesion"
import { textoSistema as t } from "@/lib/strings"

export function Acceso({ alAcceder }: { alAcceder: (s: SesionVerificada) => void }) {
  const [usuario, setUsuario] = useState("")
  const [clave, setClave] = useState("")
  const [error, setError] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-6">
    <h1 className="text-3xl font-semibold">{t("acceso.titulo")}</h1>
    <p>{t("acceso.detalle")}</p>
    <form className="flex flex-col gap-4" onSubmit={async (e) => {
      e.preventDefault(); setOcupado(true); setError(false)
      try { const s = await acceder(usuario, clave); setClave(""); if (s) alAcceder(s); else setError(true) }
      catch { setError(true) } finally { setOcupado(false) }
    }}>
      <label className="grid gap-2">{t("acceso.usuario")}<input autoComplete="username" value={usuario} onChange={(e) => setUsuario(e.target.value)} required maxLength={100} className="min-h-12 rounded-xl border p-3" /></label>
      <label className="grid gap-2">{t("acceso.clave")}<input type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required maxLength={200} className="min-h-12 rounded-xl border p-3" /></label>
      <button disabled={ocupado} className="min-h-12 rounded-xl bg-primary px-5 text-primary-foreground">{t("acceso.entrar")}</button>
      {error && <p role="alert">{t("acceso.error")}</p>}
    </form>
  </main>
}
