/** Días que rotula el eje de una gráfica: el 1 y los múltiplos de un paso redondo, para que quepan unas 6 marcas. */
export function marcasDeDia(dias: number): number[] {
  const paso = [7, 14, 30, 60].find((p) => dias / p <= 6) ?? 60
  const marcas = [1]
  for (let d = paso; d <= dias; d += paso) marcas.push(d)
  return marcas
}
