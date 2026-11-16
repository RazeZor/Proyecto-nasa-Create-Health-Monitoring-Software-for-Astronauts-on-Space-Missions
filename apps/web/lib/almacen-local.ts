/** IndexedDB transaccional. Sin fallback silencioso cuando falla la persistencia. */
import { validarClavePrivada } from "./almacen-validar.ts"
export interface AmbitoLocal { tripulante: number; mision: number; modo: "real" | "demo"; espacioDemo?: string }
let ambito: AmbitoLocal | null = null
let apertura: Promise<IDBDatabase> | null = null

export function fijarAmbito(a: AmbitoLocal | null) {
  if (a && (!Number.isSafeInteger(a.tripulante) || a.tripulante <= 0 || !Number.isSafeInteger(a.mision) || a.mision <= 0)) throw new Error("ámbito inválido")
  if (a?.espacioDemo && (!/^[a-f0-9]{32}$/.test(a.espacioDemo) || a.modo !== "demo")) throw new Error("espacio de demostración inválido")
  ambito = a ? { ...a } : null
}

export function claveAmbito(): string {
  if (!ambito) throw new Error("almacén sin identidad y misión")
  return `${ambito.espacioDemo ? `demo:${ambito.espacioDemo}:` : ""}${ambito.mision}:${ambito.tripulante}:${ambito.modo}`
}

function abrir(): Promise<IDBDatabase> {
  if (!apertura) apertura = new Promise<IDBDatabase>((resolver, rechazar) => {
    if (typeof indexedDB === "undefined") { rechazar(new Error("IndexedDB no disponible")); return }
    const peticion = indexedDB.open("vigia-salud", 1)
    peticion.onupgradeneeded = () => {
      peticion.result.createObjectStore("privado")
      peticion.result.createObjectStore("cuarentena")
    }
    peticion.onsuccess = () => {
      const db = peticion.result
      db.onversionchange = () => { db.close(); apertura = null }
      resolver(db)
    }
    peticion.onerror = () => rechazar(peticion.error)
    peticion.onblocked = () => rechazar(new Error("actualización bloqueada por otra ventana"))
  }).catch((error) => { apertura = null; throw error })
  return apertura
}

export async function leerPrivado<T>(clave: string, defecto: T): Promise<T> {
  const prefijo = claveAmbito()
  const db = await abrir()
  return new Promise<T>((resolver, rechazar) => {
    const tx = db.transaction("privado", "readonly")
    const p = tx.objectStore("privado").get(`${prefijo}:${clave}`)
    tx.oncomplete = () => resolver(p.result === undefined ? defecto : p.result as T)
    tx.onabort = () => rechazar(tx.error ?? new Error("lectura interrumpida"))
    tx.onerror = () => rechazar(tx.error)
  })
}

export async function actualizarPrivado<T>(clave: string, defecto: T, transformar: (valor: T) => T): Promise<void> {
  const prefijo = claveAmbito()
  const db = await abrir()
  return new Promise<void>((resolver, rechazar) => {
    const tx = db.transaction("privado", "readwrite")
    const almacen = tx.objectStore("privado")
    const p = almacen.get(`${prefijo}:${clave}`)
    let fallo: unknown
    p.onsuccess = () => {
      try { almacen.put(transformar(p.result === undefined ? defecto : p.result as T), `${prefijo}:${clave}`) }
      catch (error) { fallo = error; tx.abort() }
    }
    tx.oncomplete = () => resolver()
    tx.onabort = () => rechazar(fallo ?? tx.error ?? new Error("escritura interrumpida"))
    tx.onerror = () => rechazar(tx.error)
  })
}

/** Se conserva sin asignar dueño a registros antiguos que no declaraban identidad. */
export async function preservarLegado(): Promise<void> {
  const db = await abrir()
  const valores: Record<string, string> = {}
  for (const clave of ["checkins", "shared", "acked", "synced", "escalations"]) {
    for (const prefijo of ["vigia:", "vigia:real:"]) {
      const texto = window.localStorage.getItem(prefijo + clave)
      if (texto !== null) valores[prefijo + clave] = texto
    }
  }
  if (!Object.keys(valores).length) return
  await new Promise<void>((resolver, rechazar) => {
    const tx = db.transaction("cuarentena", "readwrite")
    // add conserva la primera captura; las claves originales tampoco se borran.
    const almacen = tx.objectStore("cuarentena")
    const p = almacen.get("localStorage-sin-propietario-v1")
    p.onsuccess = () => { if (p.result === undefined) almacen.add({ valores, t_real: new Date().toISOString() }, "localStorage-sin-propietario-v1") }
    tx.oncomplete = () => resolver()
    tx.onabort = () => rechazar(tx.error)
  })
}

export async function exportarPrivado(): Promise<{ version: "respaldo-local-v1"; ambito: string; registros: Record<string, unknown> }> {
  const prefijo = claveAmbito()
  const db = await abrir()
  return new Promise((resolver, rechazar) => {
    const tx = db.transaction("privado", "readonly")
    const registros: Record<string, unknown> = {}
    const p = tx.objectStore("privado").openCursor(IDBKeyRange.bound(`${prefijo}:`, `${prefijo}:\uffff`))
    p.onsuccess = () => { const c = p.result; if (c) { registros[String(c.key).slice(prefijo.length + 1)] = c.value; c.continue() } }
    tx.oncomplete = () => resolver({ version: "respaldo-local-v1", ambito: prefijo, registros })
    tx.onabort = () => rechazar(tx.error)
  })
}

export async function restaurarPrivado(respaldo: { version: string; ambito: string; registros: Record<string, unknown> }): Promise<void> {
  const prefijo = claveAmbito()
  if (respaldo.version !== "respaldo-local-v1" || respaldo.ambito !== prefijo || !respaldo.registros || typeof respaldo.registros !== "object" || Array.isArray(respaldo.registros)) throw new Error("respaldo de otro ámbito o versión")
  const entradas = Object.entries(respaldo.registros)
  const claves = ["checkins", "shared", "acked", "synced", "escalations", "seguimiento-v1", "estudios-v1"]
  if (entradas.some(([k]) => !claves.includes(k))) throw new Error("clave de respaldo desconocida")
  for (const [clave, valor] of entradas) validarClavePrivada(clave, valor)
  const db = await abrir()
  await new Promise<void>((resolver, rechazar) => {
    const tx = db.transaction("privado", "readwrite")
    const almacen = tx.objectStore("privado")
    let fallo: unknown
    for (const [clave, valor] of entradas) {
      const p = almacen.get(`${prefijo}:${clave}`)
      p.onsuccess = () => {
        if (p.result !== undefined && JSON.stringify(p.result) !== JSON.stringify(valor)) { fallo = new Error("la copia contiene diferencias; se conservan los registros actuales"); tx.abort(); return }
        almacen.put(valor, `${prefijo}:${clave}`)
      }
    }
    tx.oncomplete = () => resolver()
    tx.onabort = () => rechazar(fallo ?? tx.error)
  })
}
