/**
 * Anatomía procedural del cuerpo 3D: todo se genera con matemáticas (campos de distancia con signo) y se
 * convierte en malla con «surface nets». No hay modelos descargados: funciona a bordo sin conexión y sin
 * licencias de terceros. Puro (sin three.js ni DOM): devuelve arreglos listos para un BufferGeometry.
 * Unidades en metros, Y hacia arriba, pies en y = 0 y la figura mira hacia +Z (su izquierda es +X).
 */
export type Vec3 = [number, number, number]
export type Sdf = (x: number, y: number, z: number) => number
export type Sexo = "female" | "male"
export interface Malla { posiciones: Float32Array; normales: Float32Array; indices: Uint32Array }

/** Mínimo suave: une dos formas con una transición de ancho `k`. */
export const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

export function elipsoide(c: Vec3, r: Vec3): Sdf {
  const [cx, cy, cz] = c
  const [rx, ry, rz] = r
  return (x, y, z) => {
    const px = x - cx, py = y - cy, pz = z - cz
    const k0 = Math.hypot(px / rx, py / ry, pz / rz)
    const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz))
    return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1
  }
}

/** Cápsula de radio variable entre `a` (radio r1) y `b` (radio r2). */
export function conoRedondo(a: Vec3, b: Vec3, r1: number, r2: number): Sdf {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2]
  const l2 = bax * bax + bay * bay + baz * baz
  const rr = r1 - r2
  const a2 = l2 - rr * rr
  const il2 = 1 / l2
  return (x, y, z) => {
    const pax = x - a[0], pay = y - a[1], paz = z - a[2]
    const yy = pax * bax + pay * bay + paz * baz
    const zz = yy - l2
    const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy
    const x2 = qx * qx + qy * qy + qz * qz
    const y2 = yy * yy * l2
    const z2 = zz * zz * l2
    const k = Math.sign(rr) * rr * rr * x2
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1
  }
}

export function union(k: number, formas: Sdf[]): Sdf {
  return (x, y, z) => {
    let d = formas[0](x, y, z)
    for (let i = 1; i < formas.length; i++) d = smin(d, formas[i](x, y, z), k)
    return d
  }
}

const espejo = (v: Vec3): Vec3 => [-v[0], v[1], v[2]]
/** Aplica una forma a los dos lados del cuerpo (|x|). */
const simetrica = (f: Sdf): Sdf => (x, y, z) => f(Math.abs(x), y, z)

/** Medidas que cambian con el modelo corporal. */
export interface Medidas {
  hombro: number
  cadera: number
  codo: Vec3
  muneca: Vec3
  mano: Vec3
  articHombro: Vec3
  articCadera: Vec3
  rodilla: Vec3
  tobillo: Vec3
  /** Factor de ancho del tórax respecto al modelo masculino: escala los órganos del tronco. */
  torax: number
}

export function medidas(sexo: Sexo): Medidas {
  const f = sexo === "female"
  const hombro = f ? 0.165 : 0.19
  const cadera = f ? 0.098 : 0.092
  return {
    hombro, cadera,
    articHombro: [hombro, 1.425, 0],
    codo: [hombro + 0.115, 1.14, -0.005],
    muneca: [hombro + 0.19, 0.885, 0.03],
    mano: [hombro + 0.215, 0.8, 0.04],
    articCadera: [cadera, 0.91, 0],
    rodilla: [0.092, 0.5, 0.008],
    tobillo: [0.097, 0.085, -0.012],
    torax: f ? 0.88 : 1,
  }
}

/** Silueta del cuerpo como unión suave de elipsoides y cápsulas. */
export function cuerpo(sexo: Sexo): Sdf {
  const f = sexo === "female"
  const m = medidas(sexo)
  const tronco = union(0.045, [
    elipsoide([0, 1.3, 0], f ? [0.143, 0.165, 0.094] : [0.165, 0.172, 0.105]), // tórax
    elipsoide([0, 1.1, 0.004], f ? [0.112, 0.15, 0.083] : [0.134, 0.155, 0.094]), // abdomen
    elipsoide([0, 0.94, 0], f ? [0.168, 0.125, 0.108] : [0.152, 0.118, 0.103]), // pelvis
    simetrica(conoRedondo([0.05, 1.475, -0.012], [m.hombro, 1.43, 0], 0.04, f ? 0.047 : 0.056)), // hombros
    ...(f ? [simetrica(elipsoide([0.066, 1.292, 0.07], [0.052, 0.05, 0.045]))] : []),
  ])
  const cabeza = union(0.03, [
    elipsoide([0, 1.668, 0.008], [0.077, 0.103, 0.09]),
    elipsoide([0, 1.612, 0.03], [0.057, 0.06, 0.062]), // mandíbula
    conoRedondo([0, 1.49, -0.008], [0, 1.6, 0], f ? 0.043 : 0.052, f ? 0.039 : 0.047), // cuello
  ])
  const brazo = union(0.02, [
    conoRedondo(m.articHombro, m.codo, f ? 0.043 : 0.052, f ? 0.034 : 0.04),
    conoRedondo(m.codo, m.muneca, f ? 0.034 : 0.04, f ? 0.023 : 0.027),
    elipsoide(m.mano, [0.024, 0.078, 0.04]),
  ])
  const pierna = union(0.025, [
    conoRedondo(m.articCadera, m.rodilla, f ? 0.087 : 0.084, 0.053),
    conoRedondo(m.rodilla, m.tobillo, 0.052, 0.033),
    elipsoide([0.094, 0.35, -0.022], [0.05, 0.115, 0.055]), // gemelo
    conoRedondo([0.097, 0.04, -0.03], [0.105, 0.028, 0.125], 0.04, 0.027), // pie
  ])
  return union(0.03, [tronco, cabeza, simetrica(brazo), simetrica(pierna)])
}

export function corazon(): Sdf {
  return union(0.013, [
    conoRedondo([0.006, 1.332, 0.04], [0.052, 1.262, 0.056], 0.041, 0.016), // ventrículos hasta el ápex
    elipsoide([-0.03, 1.35, 0.034], [0.027, 0.03, 0.028]), // aurícula derecha
    elipsoide([0.04, 1.356, 0.03], [0.025, 0.026, 0.026]), // aurícula izquierda
    conoRedondo([0.012, 1.362, 0.036], [0.004, 1.402, 0.03], 0.0135, 0.012), // raíz de la aorta
    conoRedondo([0.024, 1.352, 0.058], [0.04, 1.392, 0.04], 0.013, 0.01), // tronco pulmonar
  ])
}

/** Los dos pulmones, con la escotadura del corazón en el izquierdo y la base plana del diafragma. */
export function pulmones(): Sdf {
  const derecho = elipsoide([-0.084, 1.335, -0.006], [0.058, 0.117, 0.07])
  const izquierdo = elipsoide([0.087, 1.34, -0.006], [0.052, 0.112, 0.068])
  const hueco = elipsoide([0.028, 1.305, 0.045], [0.066, 0.07, 0.06])
  return (x, y, z) => {
    const d = Math.min(derecho(x, y, z), Math.max(izquierdo(x, y, z), -hueco(x, y, z)))
    return Math.max(d, 1.228 - y + 0.25 * Math.abs(x) * 0.2)
  }
}

/** Cerebro con surcos, fisura central, cerebelo y tronco encefálico. */
export function cerebro(): Sdf {
  const hemisferios = elipsoide([0, 1.7, 0.002], [0.06, 0.05, 0.073])
  const resto = union(0.012, [
    elipsoide([0, 1.656, -0.045], [0.04, 0.022, 0.03]),
    conoRedondo([0, 1.662, -0.02], [0, 1.6, -0.014], 0.013, 0.01),
  ])
  return (x, y, z) => {
    const surcos = 0.0052 * Math.sin(95 * x + 3 * Math.sin(60 * y)) * Math.sin(80 * y + 2.5 * Math.sin(70 * z)) * Math.sin(75 * z + 2 * Math.sin(50 * x))
    const h = Math.max(hemisferios(x, y, z) + surcos, 0.0035 - Math.abs(x))
    return Math.min(h, resto(x, y, z))
  }
}

export const higado = (): Sdf => union(0.02, [
  elipsoide([-0.062, 1.2, 0.03], [0.072, 0.038, 0.055]),
  elipsoide([0.0, 1.205, 0.045], [0.05, 0.024, 0.035]),
])
export const estomago = (): Sdf => union(0.025, [
  elipsoide([0.06, 1.178, 0.038], [0.038, 0.046, 0.034]),
  conoRedondo([0.05, 1.15, 0.045], [0.0, 1.128, 0.052], 0.026, 0.015),
])
export const pancreas = (): Sdf => conoRedondo([-0.035, 1.132, 0.018], [0.065, 1.152, 0.012], 0.017, 0.009)
export const rinones = (): Sdf => simetrica(elipsoide([0.062, 1.13, -0.045], [0.022, 0.04, 0.018]))
export const ojos = (): Sdf => simetrica(elipsoide([0.031, 1.682, 0.078], [0.0125, 0.0125, 0.0125]))

/**
 * «Surface nets»: un vértice por celda que la superficie atraviesa (promedio de los cruces en sus aristas) y un
 * cuadrilátero por cada arista de la rejilla con cambio de signo. La caja debe contener la forma completa.
 */
export function mallar(f: Sdf, min: Vec3, max: Vec3, celda: number): Malla {
  const n = [0, 1, 2].map((i) => Math.ceil((max[i] - min[i]) / celda) + 1)
  const [nx, ny, nz] = n
  const valores = new Float32Array(nx * ny * nz)
  for (let z = 0, i = 0; z < nz; z++)
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++, i++) valores[i] = f(min[0] + x * celda, min[1] + y * celda, min[2] + z * celda)

  const paso = [1, nx, nx * ny]
  const deCelda = new Int32Array(nx * ny * nz).fill(-1)
  const pos: number[] = []
  const esquina = [0, 0, 0, 0, 0, 0, 0, 0]
  for (let z = 0; z < nz - 1; z++)
    for (let y = 0; y < ny - 1; y++)
      for (let x = 0; x < nx - 1; x++) {
        const base = x + nx * (y + ny * z)
        let mascara = 0
        for (let c = 0; c < 8; c++) {
          const v = valores[base + (c & 1) + ((c >> 1) & 1) * nx + ((c >> 2) & 1) * nx * ny]
          esquina[c] = v
          if (v < 0) mascara |= 1 << c
        }
        if (mascara === 0 || mascara === 255) continue
        let sx = 0, sy = 0, sz = 0, cruces = 0
        for (let c = 0; c < 8; c++)
          for (let eje = 0; eje < 3; eje++) {
            if ((c >> eje) & 1) continue
            const d = c | (1 << eje)
            const a = esquina[c], b = esquina[d]
            if (a < 0 === b < 0) continue
            const t = a / (a - b)
            sx += (c & 1) + (eje === 0 ? t : 0)
            sy += ((c >> 1) & 1) + (eje === 1 ? t : 0)
            sz += ((c >> 2) & 1) + (eje === 2 ? t : 0)
            cruces++
          }
        deCelda[base] = pos.length / 3
        pos.push(min[0] + (x + sx / cruces) * celda, min[1] + (y + sy / cruces) * celda, min[2] + (z + sz / cruces) * celda)
      }

  const indices: number[] = []
  const coord = [0, 0, 0]
  for (coord[2] = 0; coord[2] < nz; coord[2]++)
    for (coord[1] = 0; coord[1] < ny; coord[1]++)
      for (coord[0] = 0; coord[0] < nx; coord[0]++) {
        const p = coord[0] + nx * (coord[1] + ny * coord[2])
        for (let a = 0; a < 3; a++) {
          const b = (a + 1) % 3, c = (a + 2) % 3
          if (coord[a] >= n[a] - 1 || coord[b] < 1 || coord[c] < 1 || coord[b] >= n[b] - 1 || coord[c] >= n[c] - 1) continue
          const v0 = valores[p], v1 = valores[p + paso[a]]
          if (v0 < 0 === v1 < 0) continue
          const A = deCelda[p - paso[b] - paso[c]], B = deCelda[p - paso[c]], C = deCelda[p], D = deCelda[p - paso[b]]
          if (A < 0 || B < 0 || C < 0 || D < 0) continue
          if (v0 < 0) indices.push(A, B, C, A, C, D)
          else indices.push(A, C, B, A, D, C)
        }
      }

  // normales del propio campo: sombreado suave aunque la malla sea gruesa
  const posiciones = new Float32Array(pos)
  const normales = new Float32Array(pos.length)
  const e = celda * 0.5
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2]
    const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e)
    const l = Math.hypot(gx, gy, gz) || 1
    normales[i] = gx / l
    normales[i + 1] = gy / l
    normales[i + 2] = gz / l
  }
  return { posiciones, normales, indices: new Uint32Array(indices) }
}

/** Curvas (puntos de control) de huesos largos, costillas, vasos e intestino para el modelo dado. */
export function trazados(sexo: Sexo) {
  const m = medidas(sexo)
  const t = m.torax
  const lados = (pts: Vec3[]): Vec3[][] => [pts, pts.map(espejo)]

  const columna: Vec3[] = [[0, 0.93, -0.045], [0, 1.05, -0.032], [0, 1.2, -0.055], [0, 1.35, -0.066], [0, 1.48, -0.042], [0, 1.585, -0.022]]
  const costillas: Vec3[][] = []
  for (let i = 0; i < 9; i++) {
    const y = 1.425 - i * 0.026
    const ancho = (0.085 + 0.05 * Math.sin((Math.min(i, 6) / 6) * Math.PI * 0.62)) * t
    const frente = i < 7 ? 0.018 : 0.05 + (i - 7) * 0.03 // las últimas no llegan al esternón
    costillas.push(...lados([
      [0.014, y + 0.012, -0.062], [ancho * 0.75, y + 0.006, -0.058], [ancho, y - 0.014, -0.005],
      [ancho * 0.78, y - 0.036, 0.058], [frente, y - 0.044 + (i < 7 ? 0 : 0.012), 0.08],
    ]))
  }
  const huesos = {
    columna,
    costillas,
    esternon: [[0, 1.435, 0.078], [0, 1.26, 0.084]] as Vec3[],
    claviculas: lados([[0.018, 1.452, 0.062], [m.hombro * 0.55, 1.462, 0.03], [m.hombro * 0.95, 1.448, 0]]),
    pelvis: lados([[0, 0.955, -0.05], [0.085, 1.005, -0.035], [0.128, 0.985, 0.012], [0.095, 0.915, 0.05], [0.02, 0.875, 0.058]]),
    largos: [
      ...lados([m.articHombro, m.codo]), ...lados([m.codo, m.muneca]),
      ...lados([m.articCadera, m.rodilla]), ...lados([m.rodilla, m.tobillo]),
    ],
    articulaciones: [m.articHombro, m.codo, m.muneca, m.articCadera, m.rodilla, m.tobillo].flatMap((p) => [p, espejo(p)]),
  }

  const d: Vec3 = [0.014, 0, 0.012] // las venas corren junto a las arterias
  const junto = (pts: Vec3[], s: number): Vec3[] => pts.map(([x, y, z]) => [x + Math.sign(x || s) * d[0], y, z + d[2]])
  const pierna: Vec3[] = [[0.004, 1.0, -0.02], [0.07, 0.92, 0.022], [0.094, 0.7, 0.02], [0.09, 0.5, -0.012], [0.094, 0.3, -0.032], [0.097, 0.09, -0.012]]
  const brazoA: Vec3[] = [[0.004, 1.412, 0.018], [0.09, 1.448, 0.004], [m.hombro, 1.4, 0.004], [m.codo[0], m.codo[1], 0.004], [m.muneca[0], m.muneca[1], 0.03]]
  const carotida: Vec3[] = [[0.004, 1.412, 0.018], [0.028, 1.5, 0.012], [0.034, 1.6, 0.012], [0.042, 1.675, 0.022]]
  const aorta: Vec3[] = [[0.01, 1.36, 0.036], [0.002, 1.412, 0.02], [0.014, 1.402, -0.022], [0.014, 1.3, -0.04], [0.01, 1.15, -0.034], [0.002, 1.0, -0.02]]
  const cava: Vec3[] = [[-0.02, 1.0, -0.012], [-0.022, 1.15, -0.02], [-0.024, 1.28, 0.0], [-0.018, 1.35, 0.026]]
  const vasos = {
    arterias: [
      { puntos: aorta, radio: 0.0105 },
      ...lados(pierna).map((puntos) => ({ puntos, radio: 0.0058 })),
      ...lados(brazoA).map((puntos) => ({ puntos, radio: 0.004 })),
      ...lados(carotida).map((puntos) => ({ puntos, radio: 0.004 })),
    ],
    // las venas se recorren hacia el corazón
    venas: [
      { puntos: cava, radio: 0.0095 },
      ...lados(junto(pierna, 1)).map((puntos) => ({ puntos: [...puntos].reverse(), radio: 0.0052 })),
      ...lados(junto(carotida, 1)).map((puntos) => ({ puntos: [...puntos].reverse(), radio: 0.0036 })),
    ],
  }

  // intestino delgado en zigzag, enmarcado por el grueso
  const delgado: Vec3[] = []
  for (let i = 0; i < 6; i++) {
    const y = 1.085 - i * 0.024
    const w = 0.055 - Math.abs(i - 2.5) * 0.006
    const s = i % 2 ? 1 : -1
    delgado.push([-s * w, y, 0.05], [0, y - 0.008, 0.058], [s * w, y - 0.012, 0.05])
  }
  const grueso: Vec3[] = [[-0.08, 0.955, 0.04], [-0.086, 1.04, 0.045], [-0.07, 1.105, 0.05], [0, 1.112, 0.06], [0.07, 1.105, 0.05], [0.086, 1.04, 0.045], [0.07, 0.96, 0.04], [0.01, 0.925, 0.03]]
  return { huesos, vasos, intestino: { delgado, grueso } }
}

/** Puntos del cuerpo a los que apuntan los indicadores, las molestias y las vistas de cámara. */
export const ANCLAS = {
  restingHr: [0.03, 1.31, 0.05], systolic: [0.012, 1.14, -0.03], spo2: [-0.09, 1.345, 0.01], tempC: [-0.07, 1.225, 0.06],
  sleepH: [-0.03, 1.72, -0.02], mood: [0.025, 1.715, 0.05], glucose: [0.03, 1.14, 0.03], massKg: [0.092, 0.7, 0.02],
  headache: [0, 1.735, 0.07], dizziness: [0.075, 1.665, 0.0], visionChange: [-0.031, 1.682, 0.085], nausea: [0.055, 1.17, 0.085], rash: [-0.13, 1.22, 0.075],
} as const satisfies Record<string, Vec3>
export type AnclaId = keyof typeof ANCLAS
