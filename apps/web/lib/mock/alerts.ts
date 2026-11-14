import type { Alert, Report, ThreadMessage } from "../types"

export const ALERTS: Alert[] = [
  {
    id: "al-09-spo2", day: 9, time: "06:42", status: "act", layer: "A", zone: "heart",
    indicator: "SpO2", value: "89 %", clinicalBand: "Por debajo de 92 % (hipoxemia)",
    cause: "SpO2 por debajo del límite clínico de seguridad en reposo, con mareo reportado.",
    action: "Respira con la mascarilla de O2 de emergencia, vuelve a medir en 5 min y llama al Oficial Médico.",
  },
  {
    id: "al-12-co2", day: 12, time: "07:15", status: "watch", layer: "context", zone: "head",
    indicator: "Dolor de cabeza + CO2 en cabina", value: "3.27 mmHg CO2", clinicalBand: "CO2 por encima de 3 mmHg",
    cause: "Dolor de cabeza reportado mientras el CO2 de cabina superaba el límite de 3 mmHg.",
    action: "Acércate a la salida de aire, revisa el depurador e hidrátate. Vuelve a valorar el dolor en 2 h.",
  },
  {
    id: "al-22-spe", day: 22, time: "14:03", status: "watch", layer: "context", zone: "blood",
    indicator: "Flujo de protones", value: "208 pfu", clinicalBand: "Por encima del umbral de 10 pfu",
    cause: "Evento de partículas solares en curso. Modo tormenta activado.",
    action: "Refúgiate en la zona blindada. Pospón la EVA. Registra el tiempo en el refugio.",
  },
  {
    id: "al-24-hr", day: 24, time: "06:30", status: "watch", layer: "C", zone: "heart",
    indicator: "Frecuencia cardíaca en reposo", value: "70 lpm", clinicalBand: "Dentro del rango clínico (40-100)",
    cause: "La frecuencia cardíaca en reposo ha subido durante 6 días junto con menos horas de sueño.",
    action: "Reserva 8 h completas de sueño esta noche, hidrátate y vuelve a medir mañana temprano.",
  },
  {
    id: "al-24-sleep", day: 24, time: "06:31", status: "watch", layer: "B", zone: "mind",
    indicator: "Sueño", value: "5.6 h", clinicalBand: "Dentro del rango clínico (> 4 h)",
    cause: "El sueño está por debajo de tu banda de línea base en vuelo durante varias noches.",
    action: "Atenúa las luces 1 h antes de dormir, usa el protocolo de luz y evita pantallas en la estación de sueño.",
  },
]

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
