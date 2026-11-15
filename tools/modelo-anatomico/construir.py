"""Genera cuerpo.glb + cuerpo.json para VIGÍA a partir de los OBJ originales de BodyParts3D.

Uso (desde cualquier carpeta; ejecutar con `python -I`):
    python -I construir.py <dir_trabajo> <dir_salida>

<dir_trabajo> debe contener:
    obj/isa_BP3D_4.0_obj_99/*.obj      (isa_BP3D_4.0_obj_99.zip descomprimido, release 4.0)
    obj3/**/<FMA de los lóbulos>.obj   (BodyParts3D_3.0_obj_99.zip descomprimido, solo para los pulmones)
    indice.tsv                         (lo genera indice.py: id, nombre, caja, volumen, bytes)

Sistema de origen (BodyParts3D): mm, +X = izquierda del sujeto, −Y = frente, +Z = arriba.
Sistema de destino (VIGÍA): m, +X = izquierda del sujeto, +Y = arriba, +Z = frente, pies en y = 0,
estatura 1,78 m, centrado en x = 0 y z = 0 según la caja de la piel.
"""
import glob
import json
import os
import re
import struct
import sys

import numpy as np
from scipy import ndimage

DIR = sys.argv[1]
SALIDA = sys.argv[2]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fast_simplification  # noqa: E402
from util_malla import compactar, componentes, leer_obj, soldar  # noqa: E402

ESTATURA_M = 1.78
OBJ4 = os.path.join(DIR, "obj", "isa_BP3D_4.0_obj_99")
OBJ3 = os.path.join(DIR, "obj3")

INDICE = {}
for linea in open(os.path.join(DIR, "indice.tsv"), encoding="utf-8"):
    c = linea.rstrip("\n").split("\t")
    caja = [float(x) for x in re.findall(r"-?\d+\.\d+", c[2])]
    INDICE[c[0]] = {"nombre": c[1], "caja": caja, "vol": float(c[3] or 0)}


def por_nombre(patron, excluye=None):
    r = re.compile(patron, re.I)
    x = re.compile(excluye, re.I) if excluye else None
    return sorted(fj for fj, d in INDICE.items() if r.search(d["nombre"]) and not (x and x.search(d["nombre"])))


# Ramas intraorgánicas o diminutas que no aportan a una vista de cuerpo entero.
EXCL_VASOS = (r"segmental|subsegmental|lobe branch|lobar|hepatic artery|hepatic vein|hepatovenous|portal vein|"
              r"cusp|valve|bronchial|digital|metacarpal|metatarsal|perforating|palmar|plantar|"
              r"cerebral|cerebellar|insular|choroid|ophthalm|retina|labyrinth|central artery|"
              r"lingular|basal|apical|tributary|branch of (left|right) (superior|inferior) pulmonary|"
              r"hippocamp|thalam|striate|callos|communicating|pontine|temporal branch|frontal branch|"
              r"parietal branch|occipital branch|calcarine|orbitofrontal|sulcus|gyrus|capsul")

GRUPOS = {
    # nombre: (lista de FJ, triángulos objetivo, filtrar exterior, vóxel mm)
    "piel": (["FJ2810"], 56000, True, 2.0),
    "corazon": (["FJ2428", "FJ2438", "FJ2439", "FJ2422", "FJ2423", "FJ2424", "FJ2425"], 12000, True, 1.0),
    "cerebro": (por_nombre(r"gyrus|lobule|occipital lobe|\binsula|white matter of (left|right) cerebral|cerebellum|"
                           r"^pons|medulla oblongata|^midbrain|corpus callosum",
                           r"artery|vein|branch|sulcus"), 20000, True, 1.0),
    "higado": (por_nombre(r"hepatovenous segment|caudate lobe of liver"), 9000, True, 1.5),
    "estomago": (["FJ2564"], 1810, False, 0),
    "pancreas": (["FJ1895"], 3000, False, 0),
    "rinones": (["FJ3145", "FJ3147"], 4000, False, 0),
    "intestino": (por_nombre(r"duodenum|jejunum|ileum|ileocecal|^appendix|colon$|^rectum", r"artery|vein|meso"), 18000, True, 1.5),
    "huesos": (por_nombre(r".", None), 0, False, 0),  # se rellena abajo con la clase FMA «bone organ»
    "arterias": ([], 34000, False, 0),
    "venas": ([], 26000, False, 0),
    "ojos": (por_nombre(r"(left|right) sclera|(left|right) cornea"), 2400, True, 0.4),
}


def clase_isa(nombres):
    fjs = set()
    for linea in open(os.path.join(DIR, "fuente", "isa_element_parts.txt"), encoding="utf-8"):
        _, n, fj = linea.rstrip("\n").split("\t")
        if n in nombres and fj in INDICE:
            fjs.add(fj)
    return fjs


def sin_duplicados(fjs):
    """BodyParts3D repite algunas piezas con otro identificador (misma caja y volumen): deja una."""
    vistos, res = set(), []
    for fj in sorted(fjs):
        clave = (tuple(round(x, 1) for x in INDICE[fj]["caja"]), round(INDICE[fj]["vol"], 2))
        if clave in vistos:
            continue
        vistos.add(clave)
        res.append(fj)
    return res


huesos = clase_isa({"bone organ", "tooth"}) | set(por_nombre(
    r"costal cartilage|body of sternum|manubrium|xiphoid process|intervertebral dis[ck]|coccyx|coccygeal vertebra"))
arterias = (clase_isa({"artery"}) | set(por_nombre(r"aorta$|^arch of aorta|celiac trunk|pulmonary trunk|"
            r"brachiocephalic trunk|axillary artery|brachial artery|dorsalis pedis|trunk of .*artery|"
            r"thyrocervical trunk|costocervical trunk|posterior intercostal arteries")))
arterias = {fj for fj in arterias if not re.search(EXCL_VASOS, INDICE[fj]["nombre"], re.I)}
arterias.discard("FJ3427")  # «Descending aorta» duplica torácica + abdominal
venas = clase_isa({"vein"}) | set(por_nombre(r"vena cava|coronary sinus|trunk of portal vein|"
                                             r"(superior|inferior) pulmonary vein|anterior intercostal veins"))
venas = {fj for fj in venas if not re.search(EXCL_VASOS.replace("portal vein|", ""), INDICE[fj]["nombre"], re.I)
         or re.search(r"^(left|right) (superior|inferior) pulmonary vein$|trunk of portal vein|^hepatic portal vein",
                      INDICE[fj]["nombre"], re.I)}
GRUPOS["huesos"] = (sorted(huesos), 78000, False, 0)
GRUPOS["arterias"] = (sorted(arterias), 34000, False, 0)
GRUPOS["venas"] = (sorted(venas), 26000, False, 0)

# Pulmones: la release 4.0 no trae el parénquima (solo árbol bronquial y vasos); se toman los
# lóbulos de la release 3.0, que usa el mismo sistema de coordenadas.
LOBULOS_3 = {"FMA7333": "upper lobe of right lung", "FMA7383": "middle lobe of lung (right)",
             "FMA7337": "lower lobe of right lung", "FMA7370": "upper lobe of left lung",
             "FMA7371": "lower lobe of left lung"}


def cargar(rutas):
    vs, fs, n = [], [], 0
    for r in rutas:
        v, f = soldar(*leer_obj(r))
        vs.append(v); fs.append(f + n); n += len(v)
    return np.vstack(vs), np.vstack(fs)


def normales_cara(v, f):
    n = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
    return n


def filtrar_exterior(v, f, vox, cierre=0):
    """Deja solo las caras que dan al exterior del conjunto (quita cavidades y tabiques internos).

    Voxeliza la superficie, etiqueta el aire exterior por inundación y, desde cada cara, avanza por su
    normal hasta el primer vóxel libre: si ese vóxel es una cavidad cerrada, la cara es interna.
    """
    mn = v.min(0) - 4 * vox
    dims = np.ceil((v.max(0) + 4 * vox - mn) / vox).astype(int) + 1
    pared = np.zeros(dims, dtype=bool)
    a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
    lado = np.maximum.reduce([np.linalg.norm(b - a, axis=1), np.linalg.norm(c - b, axis=1), np.linalg.norm(a - c, axis=1)])
    # Muestreo denso de cada triángulo (según su lado mayor) para que la pared voxelizada no tenga fugas.
    kc = np.ceil(lado / (vox * 0.45)).astype(int) + 1
    kc = 2 ** np.ceil(np.log2(kc)).astype(int)
    for k in np.unique(kc):
        s_ = kc == k
        aa, bb, cc = a[s_], b[s_], c[s_]
        for i in range(k + 1):
            for j in range(k + 1 - i):
                q = (((aa * i + bb * j + cc * (k - i - j)) / k - mn) / vox).astype(int)
                pared[q[:, 0], q[:, 1], q[:, 2]] = True
    if cierre:  # tapa aberturas pequeñas (boca, narinas) para que la cavidad no se comunique con el exterior
        pared = ndimage.binary_dilation(pared, iterations=cierre)
    etiquetas, _ = ndimage.label(~pared)
    exterior = etiquetas[0, 0, 0]
    nc = normales_cara(v, f)
    nc /= np.maximum(np.linalg.norm(nc, axis=1, keepdims=True), 1e-12)
    cen = (a + b + c) / 3
    estado = np.zeros(len(f), dtype=np.int8)  # 0 sin decidir, 1 exterior, 2 interior
    for paso in np.arange(0.75, 7.01 if not cierre else cierre + 2.51, 0.5):
        q = ((cen + nc * paso * vox - mn) / vox).astype(int)
        q = np.clip(q, 0, dims - 1)
        e = etiquetas[q[:, 0], q[:, 1], q[:, 2]]
        pend = estado == 0
        estado[pend & (e == exterior)] = 1
        estado[pend & (e != exterior) & (e != 0)] = 2
    return compactar(v, f[estado != 2])


def quitar_migas(v, f, min_caras, min_diag):
    comps = componentes(v, f)
    vs, fs, n = [], [], 0
    for cv, cf in comps:
        if len(cf) < min_caras or np.linalg.norm(cv.max(0) - cv.min(0)) < min_diag:
            continue
        vs.append(cv); fs.append(cf + n); n += len(cv)
    return np.vstack(vs), np.vstack(fs)


def simplificar(v, f, objetivo):
    if len(f) <= objetivo:
        return v, f
    v2, f2 = fast_simplification.simplify(v.astype(np.float32), f.astype(np.int32),
                                          target_count=int(objetivo), agg=5)
    v2, f2 = soldar(v2.astype(np.float64), f2.astype(np.int64), tol=1e-4)
    return compactar(v2, f2)


def normales_suaves(v, f):
    nc = normales_cara(v, f)  # ponderadas por área
    n = np.zeros_like(v)
    for i in range(3):
        np.add.at(n, f[:, i], nc)
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    return n


# ---------------------------------------------------------------- construcción
mallas, piezas = {}, {}
for nombre, (fjs, objetivo, exterior, vox) in GRUPOS.items():
    fjs = sin_duplicados(fjs)
    piezas[nombre] = [(fj, INDICE[fj]["nombre"]) for fj in fjs]
    v, f = cargar([os.path.join(OBJ4, fj + ".obj") for fj in fjs])
    n0 = len(f)
    if exterior:
        v, f = filtrar_exterior(v, f, vox, cierre=3 if nombre == "piel" else 0)
    if nombre in ("arterias", "venas"):
        v, f = quitar_migas(v, f, 12, 4.0)
    elif nombre != "huesos":
        v, f = quitar_migas(v, f, 30, 3.0)
    n1 = len(f)
    v, f = simplificar(v, f, objetivo)
    mallas[nombre] = (v, f)
    print(f"{nombre:10s} piezas {len(fjs):4d}  caras {n0:8d} -> exterior {n1:8d} -> {len(f):7d}", flush=True)

rutas_l = []
for fma in LOBULOS_3:
    r = glob.glob(os.path.join(OBJ3, "**", fma + ".obj"), recursive=True)
    if not r:
        raise SystemExit(f"Falta el lóbulo {fma} de la release 3.0")
    rutas_l.append(r[0])
v, f = cargar(rutas_l)
# Los lóbulos 3.0 son algo mayores que la caja torácica 4.0: se encoge cada pulmón un 6 % alrededor de su
# centro y se baja 5 mm (valores hallados con encaje_pulmon.py: 95 % del árbol bronquial 4.0 queda dentro
# y solo ~3 % de los vértices de costillas/vértebras).
ESCALA_PULMON, DZ_PULMON = 0.94, -5.0
izq = v[:, 0] > 0
for lado_ in (izq, ~izq):
    c_ = v[lado_].mean(0)
    v[lado_] = c_ + (v[lado_] - c_) * ESCALA_PULMON
v[:, 2] += DZ_PULMON
n0 = len(f)
v, f = filtrar_exterior(v, f, 1.5)
v, f = quitar_migas(v, f, 30, 3.0)
n1 = len(f)
mallas["pulmones"] = simplificar(v, f, 14000)
piezas["pulmones"] = [(fma, n + " [release 3.0]") for fma, n in LOBULOS_3.items()]
print(f"{'pulmones':10s} piezas {len(rutas_l):4d}  caras {n0:8d} -> exterior {n1:8d} -> {len(mallas['pulmones'][1]):7d}")

# ---------------------------------------------------------------- normalización
pv = mallas["piel"][0]
escala = ESTATURA_M / (pv[:, 2].max() - pv[:, 2].min())
cx = (pv[:, 0].max() + pv[:, 0].min()) / 2
cy = (pv[:, 1].max() + pv[:, 1].min()) / 2
z0 = pv[:, 2].min()


def normalizar(v):
    return np.column_stack([(v[:, 0] - cx) * escala, (v[:, 2] - z0) * escala, -(v[:, 1] - cy) * escala])


ORDEN = ["piel", "corazon", "pulmones", "cerebro", "higado", "estomago", "pancreas", "rinones", "intestino",
         "huesos", "arterias", "venas", "ojos"]
finales = {}
for nombre in ORDEN:
    v, f = mallas[nombre]
    v = normalizar(v)  # rotación propia (det = +1): no hay que invertir el orden de los vértices
    areas = np.linalg.norm(normales_cara(v, f), axis=1)
    v, f = compactar(v, f[areas > 1e-14])  # sin caras degeneradas ni vértices sueltos
    n = normales_suaves(v, f)
    nulas = np.linalg.norm(n, axis=1) < 0.5  # caras opuestas que se anulan: se usa la normal de una cara vecina
    if nulas.any():
        nc = normales_cara(v, f); nc /= np.linalg.norm(nc, axis=1, keepdims=True)
        for i in range(3):
            sel = nulas[f[:, i]]
            n[f[sel, i]] = nc[sel]
    finales[nombre] = (v.astype(np.float32), n.astype(np.float32), f)

# ---------------------------------------------------------------- GLB
bin_ = bytearray()
vistas, accesores, mallas_g, nodos = [], [], [], []


def alinear():
    while len(bin_) % 4:
        bin_.append(0)


def vista(datos, destino):
    alinear()
    vistas.append({"buffer": 0, "byteOffset": len(bin_), "byteLength": len(datos), "target": destino})
    bin_.extend(datos)
    return len(vistas) - 1


resumen = {}
for nombre in ORDEN:
    v, n, f = finales[nombre]
    n8 = np.zeros((len(n), 4), dtype=np.int8)
    n8[:, :3] = np.clip(np.round(n * 127), -127, 127).astype(np.int8)
    tipo_i, ct_i = (np.uint16, 5123) if len(v) < 65535 else (np.uint32, 5125)
    vp = vista(v.tobytes(), 34962)
    vn = vista(n8.tobytes(), 34962)
    vistas[vn]["byteStride"] = 4
    vi = vista(f.astype(tipo_i).tobytes(), 34963)
    base = len(accesores)
    accesores += [
        {"bufferView": vp, "componentType": 5126, "count": len(v), "type": "VEC3",
         "min": v.min(0).tolist(), "max": v.max(0).tolist()},
        {"bufferView": vn, "componentType": 5120, "normalized": True, "count": len(v), "type": "VEC3"},
        {"bufferView": vi, "componentType": ct_i, "count": int(f.size), "type": "SCALAR"},
    ]
    mallas_g.append({"name": nombre, "primitives": [{"attributes": {"POSITION": base, "NORMAL": base + 1},
                                                     "indices": base + 2, "mode": 4}]})
    nodos.append({"name": nombre, "mesh": len(mallas_g) - 1})
    a, b, c = v[f[:, 0]].astype(np.float64), v[f[:, 1]].astype(np.float64), v[f[:, 2]].astype(np.float64)
    ar = np.linalg.norm(np.cross(b - a, c - a), axis=1)
    cen = ((a + b + c) / 3 * ar[:, None]).sum(0) / ar.sum()
    resumen[nombre] = {
        "triangulos": int(len(f)), "vertices": int(len(v)),
        "min": [round(float(x), 4) for x in v.min(0)], "max": [round(float(x), 4) for x in v.max(0)],
        "centroide": [round(float(x), 4) for x in cen],
    }
alinear()
gltf = {
    "asset": {"version": "2.0", "generator": "VIGIA construir.py",
              "copyright": "BodyParts3D, (c) The Database Center for Life Science, licensed under CC Attribution 4.0 International"},
    "extensionsUsed": ["KHR_mesh_quantization"], "extensionsRequired": ["KHR_mesh_quantization"],
    "scene": 0, "scenes": [{"name": "cuerpo", "nodes": list(range(len(nodos)))}],
    "nodes": nodos, "meshes": mallas_g, "accessors": accesores, "bufferViews": vistas,
    "buffers": [{"byteLength": len(bin_)}],
}
js = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
js += b" " * ((4 - len(js) % 4) % 4)
os.makedirs(SALIDA, exist_ok=True)
with open(os.path.join(SALIDA, "cuerpo.glb"), "wb") as h:
    h.write(struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(js) + 8 + len(bin_)))
    h.write(struct.pack("<I4s", len(js), b"JSON")); h.write(js)
    h.write(struct.pack("<I4s", len(bin_), b"BIN\0")); h.write(bin_)

meta = {
    "unidades": "m", "ejes": {"arriba": "+Y", "frente": "+Z", "izquierdaDelSujeto": "+X"},
    "estatura": ESTATURA_M, "sexo": "male",
    "fuente": "BodyParts3D 4.0 (pulmones: 3.0), (c) The Database Center for Life Science, CC BY 4.0",
    "transformacion": {"escala_m_por_mm": escala, "centro_x_mm": cx, "centro_y_mm": cy, "z0_mm": z0,
                       "formula": "x=(X-cx)*s, y=(Z-z0)*s, z=-(Y-cy)*s"},
    "mallas": resumen,
}
with open(os.path.join(SALIDA, "cuerpo.json"), "w", encoding="utf-8") as h:
    json.dump(meta, h, ensure_ascii=False, indent=2)
with open(os.path.join(SALIDA, "piezas.json"), "w", encoding="utf-8") as h:
    json.dump(piezas, h, ensure_ascii=False, indent=1)
print("GLB:", os.path.getsize(os.path.join(SALIDA, "cuerpo.glb")), "bytes; triángulos:",
      sum(r["triangulos"] for r in resumen.values()))
