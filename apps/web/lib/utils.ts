import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** ppm de CO2 a presión parcial en mmHg con la presión total de la cabina del perfil. */
export const ppmToMmHg = (ppm: number, cabinPressureMmHg: number) =>
  Math.round(((ppm / 1_000_000) * cabinPressureMmHg) * 100) / 100
