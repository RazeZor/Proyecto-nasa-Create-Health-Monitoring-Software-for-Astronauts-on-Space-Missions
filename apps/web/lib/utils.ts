import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** randomUUID requiere HTTPS; getRandomValues también funciona en la LAN HTTP del hotspot. */
export function nuevoId(): string {
  return globalThis.crypto.randomUUID?.() ?? Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
