import type { Report, ThreadMessage } from "../types"

export const SEED_REPORTS: Omit<Report, "createdAt">[] = [
  {
    id: "rp-23",
    title: "Informe diario · Día 23",
    delayMinutes: 12,
    summary: "Estado general ámbar. Continúa la deriva de FC, sueño corto.",
    reading: "FC en reposo 68 lpm, sueño 5.8 h, SpO2 97 %",
    baseline: "Banda de FC en vuelo 56-64 lpm",
    environment: "Flujo de protones 64 pfu (en descenso), CO2 1.4 mmHg",
    actionTaken: "Refugio de 6 h el día 22. Ventana de sueño ampliada planificada.",
  },
]

export const THREAD: ThreadMessage[] = [
  { id: "t1", from: "astronaut", author: "Tú", day: 22, time: "15:10", body: "Refugiándome por el SPE. Me siento bien, dormí mal las dos últimas noches." },
  { id: "t2", from: "surgeon", author: "Cirujano de Vuelo", day: 22, time: "15:41", body: "Recibido. Permanece en el refugio hasta que el flujo baje de 10 pfu. Añade una nota de sueño al informe de mañana." },
  { id: "t3", from: "surgeon", author: "Cirujano de Vuelo", day: 23, time: "09:05", body: "Veo tu tendencia de FC. Sin acción desde tierra por ahora; sigue el protocolo de deriva en tu pantalla Cuerpo." },
]

export const REMINDERS = [
  "Registro matutino (menos de 90 s)",
  "Ejercicio de resistencia · 60 min",
  "Glucosa y masa corporal semanales el día 28",
  "Objetivo de hidratación 2.5 L",
]
