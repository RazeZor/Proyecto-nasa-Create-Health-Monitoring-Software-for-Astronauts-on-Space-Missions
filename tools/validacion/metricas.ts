/** Métricas por misión; nunca cuenta días correlacionados como sujetos independientes. */
export function wilson(exitos: number, n: number): [number, number] | null {
  if (!Number.isInteger(n) || !Number.isInteger(exitos) || n < 0 || exitos < 0 || exitos > n) throw new Error("conteos inválidos")
  if (n === 0) return null
  const z = 1.959963984540054, p = exitos / n, divisor = 1 + z * z / n
  const centro = (p + z * z / (2 * n)) / divisor
  const radio = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / divisor
  return [Math.max(0, centro - radio), Math.min(1, centro + radio)]
}

export function medianaOmitible(valores: number[]): number | null {
  if (!valores.length) return null
  const v = [...valores].sort((a, b) => a - b), m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

export function contarEpisodios(dias: number[]): number {
  const unicos = [...new Set(dias)].sort((a, b) => a - b)
  return unicos.filter((d, i) => i === 0 || d > unicos[i - 1] + 1).length
}

export function diferenciaPareada(a: boolean[], b: boolean[], repeticiones: number, azar: () => number) {
  if (a.length !== b.length || !a.length || repeticiones < 1) throw new Error("muestras pareadas inválidas")
  const diferencias = a.map((x, i) => Number(x) - Number(b[i]))
  const medias = Array.from({ length: repeticiones }, () => {
    let suma = 0
    for (let i = 0; i < diferencias.length; i++) suma += diferencias[Math.floor(azar() * diferencias.length)]
    return suma / diferencias.length
  }).sort((x, y) => x - y)
  return { diferencia: diferencias.reduce((s, x) => s + x, 0) / diferencias.length,
    ic95: [medias[Math.floor((medias.length - 1) * 0.025)], medias[Math.ceil((medias.length - 1) * 0.975)]], n_pares: a.length }
}
