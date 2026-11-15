/**
 * Escena 3D del cuerpo (three.js): silueta translúcida, órganos animados y una cámara que viaja al órgano del
 * indicador elegido. No sabe nada de React ni del motor: recibe un estado (`actualizar`) y avisa en cada cuadro
 * de dónde cae cada ancla en pantalla (`alCuadro`) para que la interfaz dibuje marcadores y líneas guía.
 * El corazón late a los lpm que se le pasan; nada aquí inventa una medida.
 *
 * Anatomía: arranca con las mallas procedurales de anatomia.ts (instantáneas, sin red) y, en cuanto carga
 * /modelos/cuerpo.glb (BodyParts3D, CC BY 4.0; ver public/modelos/ATRIBUCION.md), las sustituye por el modelo
 * anatómico real. Si el archivo no está, se queda con las procedurales.
 */
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import {
  ANCLAS, type AnclaId, type Malla, type Sdf, type Sexo, type Vec3,
  cerebro, corazon, cuerpo, estomago, higado, mallar, medidas, ojos, pancreas, pulmones, rinones, trazados,
} from "./anatomia"

export type Vista =
  | "restingHr" | "systolic" | "spo2" | "tempC" | "sleepH" | "mood" | "glucose" | "massKg"
  | "head" | "heart" | "bone" | "blood" | "mind"
type Grupo = "corazon" | "pulmones" | "cerebro" | "arterias" | "venas" | "huesos" | "digestivo" | "pancreas" | "ojos"

export interface ZonaCaliente { ancla: AnclaId; color: string; radio: number }
export interface EstadoEscena {
  sexo: Sexo
  oscuro: boolean
  /** Latidos por minuto que anima el corazón; null = sin medida (late a un ritmo neutro y tenue). */
  lpm: number | null
  vista: Vista | null
  calientes: ZonaCaliente[]
  quieto: boolean
  /** Giro fijo de la cámara en radianes: sin balanceo ni arrastre (el minicuerpo del histórico lo gira un deslizador). */
  giroFijo?: number
  /** Giro extra en radianes que se suma al de la cámara (el deslizador del cuerpo en tiempo real). */
  giroExtra?: number
  /** Sin el balanceo en reposo: el cuerpo solo gira cuando se le gira (arrastre o deslizador). */
  sinBalanceo?: boolean
  /** El arrastre del lienzo no gira el cuerpo (solo la rueda de fuera). */
  sinArrastre?: boolean
}
export type Proyeccion = Record<AnclaId, { x: number; y: number; frente: boolean }>

interface Encuadre { objetivo: Vec3; distancia: number; giro: number; alzado: number; grupos: Grupo[]; calor?: number }
const TORSO: Grupo[] = ["corazon", "pulmones", "arterias", "venas"]
const VISTAS: Record<Vista, Encuadre> = {
  restingHr: { objetivo: [0.02, 1.325, 0.035], distancia: 1.02, giro: 0.28, alzado: 0.06, grupos: ["corazon", "arterias", "venas"] },
  systolic: { objetivo: [0, 1.2, 0], distancia: 1.55, giro: -0.42, alzado: 0.04, grupos: ["arterias", "venas", "corazon"] },
  spo2: { objetivo: [0, 1.335, 0], distancia: 1.05, giro: 0.12, alzado: 0.05, grupos: ["pulmones"] },
  tempC: { objetivo: [0, 1.2, 0], distancia: 2.0, giro: 0.2, alzado: 0.03, grupos: [], calor: 1 },
  sleepH: { objetivo: [0, 1.685, 0], distancia: 0.8, giro: 1.05, alzado: 0.1, grupos: ["cerebro"] },
  mood: { objetivo: [0, 1.69, 0.01], distancia: 0.8, giro: -0.45, alzado: 0.22, grupos: ["cerebro"] },
  glucose: { objetivo: [0.005, 1.15, 0.03], distancia: 0.9, giro: 0.18, alzado: 0.05, grupos: ["pancreas", "digestivo"] },
  massKg: { objetivo: [0, 0.82, 0], distancia: 3.0, giro: 0.55, alzado: 0.04, grupos: ["huesos"] },
  head: { objetivo: [0, 1.67, 0.02], distancia: 0.85, giro: 0.4, alzado: 0.08, grupos: ["cerebro", "ojos"] },
  heart: { objetivo: [0, 1.3, 0], distancia: 1.25, giro: 0.2, alzado: 0.05, grupos: TORSO },
  bone: { objetivo: [0, 0.9, 0], distancia: 3.4, giro: -0.5, alzado: 0.04, grupos: ["huesos"] },
  blood: { objetivo: [0, 1.12, 0], distancia: 1.7, giro: -0.25, alzado: 0.05, grupos: ["arterias", "venas", "digestivo", "pancreas"] },
  mind: { objetivo: [0, 1.685, 0], distancia: 0.86, giro: -0.9, alzado: 0.12, grupos: ["cerebro"] },
}
const GENERAL: Encuadre = { objetivo: [0, 0.89, 0], distancia: 3.5, giro: 0, alzado: 0.03, grupos: [] }
const OPACIDAD_GENERAL: Record<Grupo, number> = {
  corazon: 1, pulmones: 0.5, cerebro: 1, arterias: 0.95, venas: 0.8, huesos: 0.3, digestivo: 0.85, pancreas: 0.95, ojos: 1,
}
const COLOR: Record<Grupo, [string, string]> = { // [claro, oscuro]
  corazon: ["#e5484d", "#ff5b62"], pulmones: ["#f59ab5", "#ff9fbe"], cerebro: ["#c98bdb", "#e3a6f5"],
  arterias: ["#e5484d", "#ff6b70"], venas: ["#3b82f6", "#59a5ff"], huesos: ["#9fb3c8", "#dfe9f5"],
  digestivo: ["#e8a15c", "#ffba73"], pancreas: ["#f2c230", "#ffd84d"], ojos: ["#2f6fed", "#8fd0ff"],
}
const MAX_CALIENTES = 8
const FOV = 30

const mallasCuerpo = new Map<Sexo, Malla>()
const mallasOrgano = new Map<string, Malla>()
function organo(nombre: string, f: () => Sdf, min: Vec3, max: Vec3, celda: number) {
  let m = mallasOrgano.get(nombre)
  if (!m) mallasOrgano.set(nombre, (m = mallar(f(), min, max, celda)))
  return m
}

function geometria(m: Malla) {
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.BufferAttribute(m.posiciones, 3))
  g.setAttribute("normal", new THREE.BufferAttribute(m.normales, 3))
  g.setIndex(new THREE.BufferAttribute(m.indices, 1))
  return g
}
const v3 = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2])
const tubo = (pts: Vec3[], radio: number, lados = 8) =>
  new THREE.TubeGeometry(pts.length === 2 ? new THREE.LineCurve3(v3(pts[0]), v3(pts[1])) : new THREE.CatmullRomCurve3(pts.map(v3)), Math.max(8, pts.length * 10), radio, lados, false)

const VERT_ORGANO = /* glsl */ `
  uniform float uLatido; uniform vec3 uCentro; uniform float uAmplitud;
  varying vec3 vN; varying vec3 vV; varying vec3 vW;
  void main() {
    vec3 p = uCentro + (position - uCentro) * (1.0 + uLatido * uAmplitud);
    vec4 w = modelMatrix * vec4(p, 1.0);
    vW = w.xyz;
    vec4 mv = viewMatrix * w;
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`
const FRAG_ORGANO = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacidad; uniform float uBrillo; uniform float uLatido;
  uniform vec3 uCentro; uniform float uT; uniform float uOnda;
  varying vec3 vN; varying vec3 vV; varying vec3 vW;
  void main() {
    vec3 n = normalize(vN); vec3 v = normalize(vV);
    if (!gl_FrontFacing) n = -n;
    float ndv = max(dot(n, v), 0.0);
    float luz = 0.42 + 0.62 * max(dot(n, normalize(vec3(0.35, 0.75, 0.55))), 0.0);
    float borde = pow(1.0 - ndv, 2.2);
    float esp = pow(max(dot(reflect(-normalize(vec3(0.35, 0.75, 0.55)), n), v), 0.0), 24.0);
    vec3 col = uColor * luz * (1.0 + uBrillo * 0.35 + uLatido * 0.25) * (1.0 - 0.38 * borde) + vec3(1.0) * esp * 0.4;
    // vasos del modelo real: una onda que viaja desde el corazón (arterias) o hacia él (venas)
    float onda = pow(0.5 + 0.5 * sin(distance(vW, uCentro) * 30.0 - uT * 5.0 * sign(uOnda)), 5.0) * abs(uOnda);
    col = col * (1.0 + 0.35 * onda) + vec3(0.3) * onda;
    gl_FragColor = vec4(col, uOpacidad * mix(0.75 + borde * 0.25, 1.0, step(0.98, uOpacidad)));
  }`

const VERT_PIEL = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vec4 mv = viewMatrix * w;
    vN = normalize(normalMatrix * normal);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`
const FRAG_PIEL = /* glsl */ `
  uniform vec3 uInterior; uniform vec3 uBorde; uniform float uAlfa; uniform float uAlfaMin; uniform float uT;
  uniform float uBarrido; uniform float uCalor; uniform float uAditivo;
  uniform vec4 uCal[${MAX_CALIENTES}]; uniform vec3 uCalCol[${MAX_CALIENTES}];
  varying vec3 vN; varying vec3 vV; varying vec3 vW;
  void main() {
    float ndv = abs(dot(normalize(vN), normalize(vV)));
    float fres = pow(1.0 - ndv, 2.0);
    float lineas = smoothstep(0.86, 1.0, sin(vW.y * 190.0)) * 0.1;
    float barrido = exp(-pow((vW.y - uBarrido) * 16.0, 2.0));
    vec3 col = mix(uInterior, uBorde, fres);
    float a = uAlfaMin + fres * 0.82 + lineas + barrido * 0.4;
    col = mix(col, uBorde, barrido * 0.6);
    // temperatura: el tronco se enciende de dentro hacia fuera
    float nucleo = smoothstep(0.75, 1.3, vW.y) * smoothstep(1.62, 1.35, vW.y) * smoothstep(0.24, 0.05, abs(vW.x));
    float onda = 0.75 + 0.25 * sin(uT * 2.2 - vW.y * 14.0);
    vec3 calido = mix(vec3(1.0, 0.72, 0.2), vec3(1.0, 0.32, 0.12), nucleo);
    col = mix(col, calido, uCalor * (0.25 + 0.75 * nucleo) * onda);
    a += uCalor * nucleo * 0.4 * onda;
    for (int i = 0; i < ${MAX_CALIENTES}; i++) {
      float d = distance(vW, uCal[i].xyz);
      float pulso = 0.6 + 0.4 * sin(uT * 4.2 - d * 30.0);
      float k = smoothstep(uCal[i].w, 0.0, d) * pulso;
      col = mix(col, uCalCol[i], min(k * 1.25, 1.0));
      a += k * mix(0.6, 0.9, uAditivo);
    }
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * uAlfa);
  }`

function punto() {
  const c = document.createElement("canvas")
  c.width = c.height = 64
  const g = c.getContext("2d")!
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, "rgba(255,255,255,1)")
  r.addColorStop(0.35, "rgba(255,255,255,0.85)")
  r.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

/** Doble golpe «lub-dub» en función de la fase del latido (0..1). */
const latido = (f: number) => Math.exp(-((f - 0.08) ** 2) / 0.0028) + 0.55 * Math.exp(-((f - 0.3) ** 2) / 0.004)

export function crearEscena(
  canvas: HTMLCanvasElement, inicial: EstadoEscena, alCuadro: (p: Proyeccion, ancho: number, alto: number) => void,
  /** Avisa cuando el modelo anatómico real sustituye al procedural. */
  alModelo?: (real: boolean) => void,
) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)
  const escena = new THREE.Scene()
  const camara = new THREE.PerspectiveCamera(FOV, 1, 0.05, 30)
  let estado = inicial
  const textura = punto()
  const desechables: { dispose(): void }[] = [textura]
  const tema = <T,>(par: [T, T]) => par[estado.oscuro ? 1 : 0]
  // anclas, encuadres y opacidades arrancan con la anatomía procedural y se recolocan al cargar el modelo real
  const anclas = Object.fromEntries(Object.entries(ANCLAS).map(([k, p]) => [k, [...p]])) as Record<AnclaId, Vec3>
  const objetivos: Partial<Record<Vista, Vec3>> = {}
  const opGeneral = { ...OPACIDAD_GENERAL }
  let real = false
  /** false mientras se decide qué anatomía se muestra: hasta entonces no se dibuja el cuerpo. */
  let listo = false
  let vivo = true

  // ── piel ────────────────────────────────────────────────────────────────────
  const matPiel = new THREE.ShaderMaterial({
    vertexShader: VERT_PIEL, fragmentShader: FRAG_PIEL, transparent: true, depthWrite: false,
    uniforms: {
      uInterior: { value: new THREE.Color() }, uBorde: { value: new THREE.Color() }, uAlfa: { value: 1 }, uAlfaMin: { value: 0.07 },
      uT: { value: 0 }, uBarrido: { value: -1 }, uCalor: { value: 0 }, uAditivo: { value: 0 },
      uCal: { value: Array.from({ length: MAX_CALIENTES }, () => new THREE.Vector4(0, -9, 0, 0.001)) },
      uCalCol: { value: Array.from({ length: MAX_CALIENTES }, () => new THREE.Color()) },
    },
  })
  desechables.push(matPiel)
  const piel = new THREE.Mesh(new THREE.BufferGeometry(), matPiel)
  piel.renderOrder = 20
  escena.add(piel)

  // ── órganos ─────────────────────────────────────────────────────────────────
  const materiales = {} as Record<Grupo, THREE.ShaderMaterial>
  const opacidad = {} as Record<Grupo, number>
  const orden: Grupo[] = ["huesos", "venas", "arterias", "digestivo", "pancreas", "corazon", "cerebro", "ojos", "pulmones"]
  orden.forEach((g) => {
    materiales[g] = new THREE.ShaderMaterial({
      vertexShader: VERT_ORGANO, fragmentShader: FRAG_ORGANO, transparent: true, side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color() }, uOpacidad: { value: OPACIDAD_GENERAL[g] }, uBrillo: { value: 0 },
        uLatido: { value: 0 }, uCentro: { value: new THREE.Vector3() }, uAmplitud: { value: 0 }, uT: { value: 0 }, uOnda: { value: 0 },
      },
    })
    opacidad[g] = OPACIDAD_GENERAL[g]
    desechables.push(materiales[g])
  })
  materiales.corazon.uniforms.uCentro.value.set(0.02, 1.32, 0.04)
  materiales.corazon.uniforms.uAmplitud.value = 0.085
  materiales.pulmones.uniforms.uCentro.value.set(0, 1.36, 0)
  materiales.pulmones.uniforms.uAmplitud.value = 0.045
  materiales.arterias.uniforms.uAmplitud.value = 0 // el pulso de los vasos va en el brillo

  const tronco = new THREE.Group() // órganos que se estrechan con el tórax del modelo
  const fijo = new THREE.Group()
  const dependientes = new THREE.Group() // geometría que cambia con el modelo corporal
  escena.add(tronco, fijo, dependientes)
  const malla = (grupo: Grupo, g: THREE.BufferGeometry, padre: THREE.Object3D) => {
    const m = new THREE.Mesh(g, materiales[grupo])
    m.renderOrder = orden.indexOf(grupo) + 1
    padre.add(m)
    desechables.push(g)
    return m
  }
  let corteza: { pos: ArrayLike<number>; nor: ArrayLike<number> } = { pos: [], nor: [] }
  /** Órganos procedurales: solo se generan si el modelo real no está disponible. */
  function crearProcedural() {
  malla("corazon", geometria(organo("corazon", corazon, [-0.07, 1.22, -0.02], [0.1, 1.43, 0.1], 0.0035)), tronco)
  malla("pulmones", geometria(organo("pulmones", pulmones, [-0.16, 1.2, -0.09], [0.16, 1.47, 0.08], 0.005)), tronco)
  malla("digestivo", geometria(organo("higado", higado, [-0.15, 1.14, -0.04], [0.07, 1.26, 0.1], 0.005)), tronco)
  malla("digestivo", geometria(organo("estomago", estomago, [-0.04, 1.09, -0.01], [0.12, 1.24, 0.09], 0.005)), tronco)
  malla("digestivo", geometria(organo("rinones", rinones, [-0.1, 1.07, -0.08], [0.1, 1.19, -0.01], 0.004)), tronco)
  malla("pancreas", geometria(organo("pancreas", pancreas, [-0.07, 1.1, -0.01], [0.09, 1.18, 0.05], 0.003)), tronco)
  const mCerebro = organo("cerebro", cerebro, [-0.075, 1.575, -0.09], [0.075, 1.765, 0.09], 0.003)
  malla("cerebro", geometria(mCerebro), fijo)
  malla("ojos", geometria(organo("ojos", ojos, [-0.06, 1.66, 0.05], [0.06, 1.705, 0.1], 0.0025)), fijo)
  corteza = { pos: mCerebro.posiciones, nor: mCerebro.normales }
  }

  // chispas de actividad en la corteza
  const N_CHISPAS = 46
  const chispas = new THREE.BufferGeometry()
  chispas.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N_CHISPAS * 3), 3))
  const matChispas = new THREE.PointsMaterial({ map: textura, size: 0.012, transparent: true, depthWrite: false, color: 0xffffff, blending: THREE.AdditiveBlending })
  const nubeChispas = new THREE.Points(chispas, matChispas)
  nubeChispas.renderOrder = 12
  fijo.add(nubeChispas)
  desechables.push(chispas, matChispas)
  const saltarChispa = (i: number) => {
    const { pos, nor } = corteza
    if (!pos.length) return
    const v = Math.floor(Math.random() * (pos.length / 3)) * 3
    const p = chispas.attributes.position as THREE.BufferAttribute
    p.setXYZ(i, pos[v] + nor[v] * 0.002, pos[v + 1] + nor[v + 1] * 0.002, pos[v + 2] + nor[v + 2] * 0.002)
    p.needsUpdate = true
  }
  for (let i = 0; i < N_CHISPAS; i++) saltarChispa(i)

  // ── flujo de sangre: puntos que recorren arterias (desde el corazón) y venas (hacia él) ─────────────
  type Corriente = { curva: THREE.CatmullRomCurve3; desfase: number; velocidad: number }
  let corrientes: { arterias: Corriente[]; venas: Corriente[] } = { arterias: [], venas: [] }
  const flujo = (color: number) => {
    const g = new THREE.BufferGeometry()
    const mat = new THREE.PointsMaterial({ map: textura, size: 0.02, transparent: true, depthWrite: false, color })
    const p = new THREE.Points(g, mat)
    p.renderOrder = 13
    p.frustumCulled = false
    escena.add(p)
    desechables.push(g, mat)
    return p
  }
  const flujoArterias = flujo(0xffffff)
  const flujoVenas = flujo(0xffffff)

  // ── plataforma y anillo de barrido ─────────────────────────────────────────
  const anillo = (radio: number, opac: number) => {
    const g = new THREE.RingGeometry(radio - 0.004, radio, 96)
    const m = new THREE.MeshBasicMaterial({ transparent: true, opacity: opac, side: THREE.DoubleSide, depthWrite: false })
    const o = new THREE.Mesh(g, m)
    o.rotation.x = -Math.PI / 2
    escena.add(o)
    desechables.push(g, m)
    return o
  }
  const base = [anillo(0.34, 0.5), anillo(0.46, 0.28), anillo(0.6, 0.14)]
  const segmentos = new THREE.Mesh(new THREE.RingGeometry(0.385, 0.405, 64, 1, 0, Math.PI * 0.55), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }))
  segmentos.rotation.x = -Math.PI / 2
  escena.add(segmentos)
  desechables.push(segmentos.geometry, segmentos.material as THREE.Material)
  const barrido = anillo(0.3, 0.7)

  // ── geometría que depende del modelo corporal ──────────────────────────────
  function construirModelo() {
    if (real || !listo) return // el modelo anatómico real es uno solo; no depende del modelo corporal elegido
    for (const h of [...dependientes.children]) {
      dependientes.remove(h)
      ;(h as THREE.Mesh).geometry.dispose()
    }
    let m = mallasCuerpo.get(estado.sexo)
    if (!m) mallasCuerpo.set(estado.sexo, (m = mallar(cuerpo(estado.sexo), [-0.5, -0.03, -0.2], [0.5, 1.8, 0.2], 0.0115)))
    piel.geometry.dispose()
    piel.geometry = geometria(m)

    const t = trazados(estado.sexo)
    tronco.scale.set(medidas(estado.sexo).torax, 1, estado.sexo === "female" ? 0.92 : 1)
    const h = t.huesos
    const vertebra = new THREE.SphereGeometry(1, 10, 8)
    const columna = new THREE.CatmullRomCurve3(h.columna.map(v3))
    const piezas: THREE.BufferGeometry[] = []
    for (let i = 0; i < 24; i++) {
      const p = columna.getPointAt(i / 23)
      const r = 0.019 - (i / 23) * 0.006
      piezas.push(vertebra.clone().scale(r, 0.0105, r).translate(p.x, p.y, p.z))
    }
    for (const c of h.costillas) piezas.push(tubo(c, 0.0048, 6))
    piezas.push(tubo(h.esternon, 0.012, 8))
    for (const c of [...h.claviculas]) piezas.push(tubo(c, 0.007, 6))
    for (const c of h.pelvis) piezas.push(tubo(c, 0.013, 8))
    h.largos.forEach((c, i) => piezas.push(tubo(c, i < 4 ? 0.011 : 0.016, 8)))
    for (const a of h.articulaciones) piezas.push(vertebra.clone().scale(0.021, 0.021, 0.021).translate(a[0], a[1], a[2]))
    piezas.push(vertebra.clone().scale(0.03, 0.04, 0.02).translate(0, 0.93, -0.05)) // sacro
    const normal = piezas.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => {
      g.deleteAttribute("uv")
      return g
    })
    const huesos = new THREE.Mesh(mergeGeometries(normal), materiales.huesos)
    huesos.renderOrder = 1
    dependientes.add(huesos)
    vertebra.dispose()
    piezas.forEach((g) => g.dispose())

    const vasos = (lista: { puntos: Vec3[]; radio: number }[], grupo: Grupo) => {
      const gs = lista.map((v) => tubo(v.puntos, v.radio, 8).toNonIndexed())
      gs.forEach((g) => g.deleteAttribute("uv"))
      const o = new THREE.Mesh(mergeGeometries(gs), materiales[grupo])
      o.renderOrder = orden.indexOf(grupo) + 1
      dependientes.add(o)
      gs.forEach((g) => g.dispose())
      return lista.map((v, i): Corriente => ({ curva: new THREE.CatmullRomCurve3(v.puntos.map(v3)), desfase: (i * 0.37) % 1, velocidad: 0.16 / Math.max(0.4, v.puntos.length * 0.09) }))
    }
    corrientes = { arterias: vasos(t.vasos.arterias, "arterias"), venas: vasos(t.vasos.venas, "venas") }
    const POR_CURVA = 7
    for (const [nube, lista] of [[flujoArterias, corrientes.arterias], [flujoVenas, corrientes.venas]] as const)
      nube.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lista.length * POR_CURVA * 3), 3))

    const tripas = [tubo(t.intestino.delgado, 0.0105, 8), tubo(t.intestino.grueso, 0.017, 8)].map((g) => g.toNonIndexed())
    tripas.forEach((g) => g.deleteAttribute("uv"))
    const intestino = new THREE.Mesh(mergeGeometries(tripas), materiales.digestivo)
    intestino.renderOrder = orden.indexOf("digestivo") + 1
    intestino.scale.copy(tronco.scale)
    dependientes.add(intestino)
    tripas.forEach((g) => g.dispose())
  }

  function aplicarTema() {
    const u = matPiel.uniforms
    u.uInterior.value.set(tema(["#b9d6ff", "#0b4f9e"]))
    u.uBorde.value.set(tema(["#2563eb", "#7fe3ff"]))
    u.uAlfaMin.value = tema([0.07, 0.05])
    u.uAditivo.value = estado.oscuro ? 1 : 0
    matPiel.blending = estado.oscuro ? THREE.AdditiveBlending : THREE.NormalBlending
    matPiel.needsUpdate = true
    for (const g of orden) materiales[g].uniforms.uColor.value.set(tema(COLOR[g]))
    const linea = new THREE.Color(tema(["#2563eb", "#7fe3ff"]))
    for (const o of [...base, segmentos, barrido]) ((o.material as THREE.MeshBasicMaterial).color = linea)
    ;(flujoArterias.material as THREE.PointsMaterial).color.set(tema(["#b3121a", "#ffd9da"]))
    ;(flujoVenas.material as THREE.PointsMaterial).color.set(tema(["#1d4ed8", "#d6e9ff"]))
    for (const p of [flujoArterias, flujoVenas]) {
      ;(p.material as THREE.PointsMaterial).blending = estado.oscuro ? THREE.AdditiveBlending : THREE.NormalBlending
      ;(p.material as THREE.PointsMaterial).needsUpdate = true
    }
    matChispas.color.set(tema(["#ffffff", "#ffffff"]))
  }

  function aplicarCalientes() {
    const u = matPiel.uniforms
    for (let i = 0; i < MAX_CALIENTES; i++) {
      const c = estado.calientes[i]
      if (c) {
        const p = anclas[c.ancla]
        u.uCal.value[i].set(p[0], p[1], p[2], c.radio)
        u.uCalCol.value[i].set(c.color)
      } else u.uCal.value[i].set(0, -9, 0, 0.001)
    }
  }

  aplicarTema()
  aplicarCalientes()
  piel.visible = false

  // ── modelo anatómico real ──────────────────────────────────────────────────
  const GRUPO_DE: Record<string, Grupo> = {
    corazon: "corazon", pulmones: "pulmones", cerebro: "cerebro", higado: "digestivo", estomago: "digestivo", rinones: "digestivo",
    intestino: "digestivo", pancreas: "pancreas", huesos: "huesos", arterias: "arterias", venas: "venas", ojos: "ojos",
  }
  new GLTFLoader().load("/modelos/cuerpo.glb", (gltf) => {
    if (!vivo) return
    const geo = new Map<string, THREE.BufferGeometry>()
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) geo.set(m.name, m.geometry)
    })
    const gPiel = geo.get("piel")
    if (!gPiel || !geo.has("corazon") || !geo.has("cerebro")) return
    const caja = (n: string) => {
      const g = geo.get(n)
      if (!g) return null
      g.computeBoundingBox()
      return g.boundingBox!
    }
    const centro = (n: string): Vec3 | null => {
      const b = caja(n)
      return b ? [(b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2] : null
    }

    // silueta neutra: la piel de la pelvis se aplana hasta el plano del bajo vientre
    const pp = gPiel.attributes.position as THREE.BufferAttribute
    let frente = -Infinity
    for (let i = 0; i < pp.count; i++) if (Math.abs(pp.getX(i)) < 0.07 && pp.getY(i) > 0.985 && pp.getY(i) < 1.02) frente = Math.max(frente, pp.getZ(i))
    if (Number.isFinite(frente))
      for (let i = 0; i < pp.count; i++) {
        const y = pp.getY(i), z = pp.getZ(i)
        if (Math.abs(pp.getX(i)) < 0.075 && y > 0.78 && y < 0.985 && z > frente - 0.012) pp.setZ(i, frente - 0.012 + (z - frente + 0.012) * 0.12)
      }
    pp.needsUpdate = true

    real = true
    listo = true
    piel.visible = true
    piel.geometry.dispose()
    piel.geometry = gPiel
    for (const [nombre, grupo] of Object.entries(GRUPO_DE)) {
      const g = geo.get(nombre)
      if (!g) continue
      const m = new THREE.Mesh(g, materiales[grupo])
      m.renderOrder = orden.indexOf(grupo) + 1
      escena.add(m)
    }

    const cCorazon = centro("corazon")!, cCerebro = centro("cerebro")!
    const cPulmones = centro("pulmones") ?? cCorazon, cPancreas = centro("pancreas") ?? [0, 1.16, 0.025], cEstomago = centro("estomago") ?? [0.05, 1.21, 0.04]
    const bPulmones = caja("pulmones"), bCerebro = caja("cerebro")!, bOjos = caja("ojos")
    materiales.corazon.uniforms.uCentro.value.set(...cCorazon)
    materiales.corazon.uniforms.uAmplitud.value = 0.06
    materiales.pulmones.uniforms.uCentro.value.set(...cPulmones)
    materiales.pulmones.uniforms.uAmplitud.value = 0.025
    for (const [g, sentido] of [["arterias", 1], ["venas", -1]] as const) {
      materiales[g].uniforms.uCentro.value.set(...cCorazon)
      materiales[g].uniforms.uOnda.value = sentido
    }
    Object.assign(opGeneral, { huesos: 0.2, pulmones: 0.5, venas: 0.75, arterias: 0.95, digestivo: 0.9 })

    const nc = geo.get("cerebro")!.attributes.normal as THREE.BufferAttribute
    const nor = new Float32Array(nc.count * 3)
    for (let i = 0; i < nc.count; i++) nor.set([nc.getX(i), nc.getY(i), nc.getZ(i)], i * 3)
    corteza = { pos: (geo.get("cerebro")!.attributes.position as THREE.BufferAttribute).array, nor }
    for (let i = 0; i < N_CHISPAS; i++) saltarChispa(i)

    Object.assign(anclas, {
      restingHr: [cCorazon[0] + 0.01, cCorazon[1] - 0.01, cCorazon[2] + 0.04],
      spo2: [bPulmones ? bPulmones.min.x * 0.62 : -0.08, cPulmones[1] + 0.02, cPulmones[2] + 0.03],
      systolic: [0.012, 1.1, -0.02], tempC: [-0.085, 1.21, 0.075], glucose: [cPancreas[0] + 0.02, cPancreas[1], cPancreas[2] + 0.015],
      sleepH: [cCerebro[0] - 0.03, bCerebro.max.y - 0.03, cCerebro[2] - 0.02], mood: [cCerebro[0] + 0.025, bCerebro.max.y - 0.035, bCerebro.max.z - 0.02],
      massKg: [0.085, 0.72, 0.0], headache: [0, bCerebro.max.y - 0.015, bCerebro.max.z + 0.01], dizziness: [0.075, cCerebro[1] - 0.04, -0.01],
      visionChange: bOjos ? [bOjos.min.x * 0.7, (bOjos.min.y + bOjos.max.y) / 2, bOjos.max.z + 0.01] : anclas.visionChange,
      nausea: [cEstomago[0], cEstomago[1], cEstomago[2] + 0.06], rash: [-0.13, 1.26, 0.09],
    } satisfies Record<AnclaId, Vec3>)
    const cabeza: Vec3 = [cCerebro[0], cCerebro[1] - 0.015, cCerebro[2] + 0.02]
    Object.assign(objetivos, {
      restingHr: cCorazon, spo2: cPulmones, heart: [0, cPulmones[1], 0], sleepH: cCerebro, mood: cCerebro, mind: cCerebro, head: cabeza,
      glucose: [cPancreas[0], cPancreas[1] + 0.02, cPancreas[2]],
    } satisfies Partial<Record<Vista, Vec3>>)
    aplicarCalientes()
    alModelo?.(true)
  }, undefined, () => {
    // sin modelo (archivo ausente o dañado): anatomía procedural, con selector de modelo corporal
    if (!vivo) return
    listo = true
    piel.visible = true
    crearProcedural()
    for (let i = 0; i < N_CHISPAS; i++) saltarChispa(i)
    construirModelo()
    alModelo?.(false)
  })

  // ── cámara ─────────────────────────────────────────────────────────────────
  const cam = { objetivo: v3(GENERAL.objetivo), distancia: GENERAL.distancia * 1.6, giro: -0.9, alzado: GENERAL.alzado }
  let giroUsuario = 0
  let ultimoToque = -1e9
  let arrastre: { x: number; giro: number } | null = null
  const alBajar = (e: PointerEvent) => {
    arrastre = { x: e.clientX, giro: giroUsuario }
    canvas.setPointerCapture(e.pointerId)
  }
  const alMover = (e: PointerEvent) => {
    if (!arrastre || estado.giroFijo !== undefined || estado.sinArrastre) return
    giroUsuario = arrastre.giro - (e.clientX - arrastre.x) * 0.009
    ultimoToque = performance.now()
  }
  const alSoltar = () => (arrastre = null)
  canvas.addEventListener("pointerdown", alBajar)
  canvas.addEventListener("pointermove", alMover)
  canvas.addEventListener("pointerup", alSoltar)
  canvas.addEventListener("pointercancel", alSoltar)

  let ancho = 0, alto = 0
  function redimensionar() {
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w || !h || (w === ancho && h === alto)) return
    ancho = w
    alto = h
    renderer.setSize(w, h, false)
    camara.aspect = w / h
    camara.updateProjectionMatrix()
  }

  const proy = Object.fromEntries(Object.keys(ANCLAS).map((k) => [k, { x: 0, y: 0, frente: true }])) as Proyeccion
  const tmp = new THREE.Vector3()
  let fase = 0
  let antes = performance.now()
  let reloj = 0
  let proximaChispa = 0
  let cuadro = 0

  function animar(ahora: number) {
    if (!vivo) return
    cuadro = requestAnimationFrame(animar)
    redimensionar()
    if (!ancho) return
    const dt = Math.min(0.1, Math.max(0, (ahora - antes) / 1000)) // tope: en equipos lentos la animación no va a cámara lenta
    antes = ahora
    reloj += dt
    const k = 1 - Math.exp(-dt * 3.2) // suavizado independiente de los fps
    const vista = estado.vista ? VISTAS[estado.vista] : GENERAL

    // latido y respiración
    const lpm = estado.lpm ?? 60
    fase = (fase + (dt * lpm) / 60) % 1
    const golpe = latido(fase)
    materiales.corazon.uniforms.uLatido.value = golpe * (estado.lpm === null ? 0.35 : 1)
    materiales.arterias.uniforms.uBrillo.value = golpe * 0.9
    materiales.pulmones.uniforms.uLatido.value = Math.sin(reloj * ((2 * Math.PI) / 4.4)) * 0.5 + 0.5
    materiales.cerebro.uniforms.uBrillo.value = 0.25 + 0.2 * Math.sin(reloj * 1.7)
    materiales.pancreas.uniforms.uBrillo.value = estado.vista === "glucose" ? 0.6 + 0.5 * Math.sin(reloj * 3) : 0

    // opacidades: en una vista destacan sus órganos y el resto se apaga
    for (const g of orden) {
      const meta = !estado.vista ? opGeneral[g] : vista.grupos.includes(g) ? (g === "pulmones" && vista.grupos.length > 1 ? 0.35 : 1) : vista.grupos.length ? 0.07 : opGeneral[g] * 0.45
      materiales[g].uniforms.uT.value = reloj
      opacidad[g] += (meta - opacidad[g]) * k
      const mat = materiales[g]
      mat.uniforms.uOpacidad.value = opacidad[g]
      const opaco = opacidad[g] > 0.97
      if (mat.depthWrite !== opaco) {
        mat.depthWrite = opaco
        mat.needsUpdate = true
      }
    }
    const u = matPiel.uniforms
    u.uT.value = reloj
    u.uAlfa.value += ((estado.vista ? (vista.calor ? 0.95 : 0.5) : 1) - u.uAlfa.value) * k
    u.uCalor.value += ((vista.calor ?? 0) - u.uCalor.value) * k
    const yBarrido = estado.vista ? -1 : 0.9 + 0.95 * Math.sin(reloj * 0.75)
    u.uBarrido.value = yBarrido
    barrido.position.y = yBarrido
    barrido.visible = !estado.vista
    const ancho_ = 0.16 + 0.2 * Math.sin(Math.min(Math.max(yBarrido / 1.8, 0), 1) * Math.PI)
    barrido.scale.setScalar(ancho_ / 0.3)
    segmentos.rotation.z = reloj * 0.5

    // sangre
    const POR_CURVA = 7
    const visibles = (g: Grupo) => opacidad[g] > 0.3
    for (const [nube, lista, grupo] of [[flujoArterias, corrientes.arterias, "arterias"], [flujoVenas, corrientes.venas, "venas"]] as const) {
      nube.visible = listo && !real && visibles(grupo)
      if (!nube.visible) continue
      const p = nube.geometry.attributes.position as THREE.BufferAttribute
      lista.forEach((c, i) => {
        for (let j = 0; j < POR_CURVA; j++) {
          const s = (((c.desfase + j / POR_CURVA + reloj * c.velocidad * (lpm / 60)) % 1) + 1) % 1
          c.curva.getPoint(s, tmp)
          p.setXYZ(i * POR_CURVA + j, tmp.x, tmp.y, tmp.z)
        }
      })
      p.needsUpdate = true
      ;(nube.material as THREE.PointsMaterial).size = grupo === "arterias" ? 0.016 + golpe * 0.008 : 0.014
      ;(nube.material as THREE.PointsMaterial).opacity = Math.min(1, opacidad[grupo] * 1.2)
    }
    if (reloj > proximaChispa) {
      proximaChispa = reloj + 0.07
      for (let i = 0; i < 5; i++) saltarChispa(Math.floor(Math.random() * N_CHISPAS))
    }
    matChispas.opacity = Math.min(1, opacidad.cerebro) * (0.55 + 0.45 * Math.sin(reloj * 9))

    // cámara: viaja al encuadre de la vista; en reposo se balancea para que el volumen se lea
    if (!arrastre && ahora - ultimoToque > 3500) giroUsuario += (0 - giroUsuario) * (1 - Math.exp(-dt * 1.5))
    const vaiven = estado.quieto || arrastre || estado.sinBalanceo || estado.giroFijo !== undefined ? 0 : Math.sin(reloj * 0.42) * (estado.vista ? 0.2 : 0.5)
    // el cuerpo entero debe caber también en lienzos estrechos
    const tan = Math.tan((FOV * Math.PI) / 360)
    const ajuste = estado.vista ? 1 : Math.max(1, 1.0 / (2 * GENERAL.distancia * tan * camara.aspect))
    const obj = (estado.vista && objetivos[estado.vista]) || vista.objetivo
    cam.objetivo.lerp(tmp.set(obj[0], obj[1], obj[2]), k)
    cam.distancia += (vista.distancia * ajuste - cam.distancia) * k
    cam.giro += ((estado.giroFijo ?? vista.giro) - cam.giro) * k
    cam.alzado += (vista.alzado - cam.alzado) * k
    const giro = cam.giro + (estado.giroFijo !== undefined ? 0 : giroUsuario) + vaiven + (estado.giroExtra ?? 0)
    camara.position.set(
      cam.objetivo.x + Math.sin(giro) * Math.cos(cam.alzado) * cam.distancia,
      cam.objetivo.y + Math.sin(cam.alzado) * cam.distancia,
      cam.objetivo.z + Math.cos(giro) * Math.cos(cam.alzado) * cam.distancia,
    )
    camara.lookAt(cam.objetivo)
    camara.updateMatrixWorld()
    renderer.render(escena, camara)

    for (const id of Object.keys(ANCLAS) as AnclaId[]) {
      const a = anclas[id]
      tmp.set(a[0], a[1], a[2]).project(camara)
      const p = proy[id]
      p.x = (tmp.x * 0.5 + 0.5) * ancho
      p.y = (-tmp.y * 0.5 + 0.5) * alto
      p.frente = tmp.z < 1
    }
    alCuadro(proy, ancho, alto)
  }
  cuadro = requestAnimationFrame(animar)

  return {
    actualizar(nuevo: EstadoEscena) {
      const previo = estado
      estado = nuevo
      if (nuevo.sexo !== previo.sexo) construirModelo()
      if (nuevo.oscuro !== previo.oscuro) aplicarTema()
      aplicarCalientes()
    },
    destruir() {
      vivo = false
      cancelAnimationFrame(cuadro)
      canvas.removeEventListener("pointerdown", alBajar)
      canvas.removeEventListener("pointermove", alMover)
      canvas.removeEventListener("pointerup", alSoltar)
      canvas.removeEventListener("pointercancel", alSoltar)
      escena.traverse((o) => (o as THREE.Mesh).geometry?.dispose())
      desechables.forEach((d) => d.dispose())
      renderer.dispose()
    },
  }
}
export type Escena = ReturnType<typeof crearEscena>
