"""Utilidades de malla sin dependencias pesadas: lectura OBJ, soldadura, componentes conexas, volumen."""
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components


def leer_obj(ruta):
    vs, fs = [], []
    with open(ruta, encoding="utf-8", errors="replace") as h:
        for l in h:
            if l.startswith("v "):
                p = l.split(); vs.append((float(p[1]), float(p[2]), float(p[3])))
            elif l.startswith("f "):
                p = [int(t.split("/")[0]) for t in l.split()[1:]]
                for i in range(1, len(p) - 1): fs.append((p[0], p[i], p[i + 1]))
    v = np.array(vs, dtype=np.float64); f = np.array(fs, dtype=np.int64)
    f = np.where(f < 0, f + len(v), f - 1)
    return v, f

def soldar(v, f, tol=1e-3):
    """Une vértices coincidentes (tolerancia en las unidades de la malla) y quita caras degeneradas."""
    q = np.round(v / tol).astype(np.int64)
    _, idx, inv = np.unique(q, axis=0, return_index=True, return_inverse=True)
    inv = inv.reshape(-1)
    v2 = v[idx]; f2 = inv[f]
    ok = (f2[:, 0] != f2[:, 1]) & (f2[:, 1] != f2[:, 2]) & (f2[:, 0] != f2[:, 2])
    return v2, f2[ok]

def compactar(v, f):
    usados = np.unique(f)
    mapa = -np.ones(len(v), dtype=np.int64); mapa[usados] = np.arange(len(usados))
    return v[usados], mapa[f]

def componentes(v, f):
    n = len(v)
    a = np.concatenate([f[:, 0], f[:, 1]]); b = np.concatenate([f[:, 1], f[:, 2]])
    g = coo_matrix((np.ones(len(a), dtype=np.int8), (a, b)), shape=(n, n))
    _, et = connected_components(g, directed=False)
    etf = et[f[:, 0]]
    res = []
    for e in np.unique(etf):
        res.append(compactar(v, f[etf == e]))
    return sorted(res, key=lambda m: -len(m[1]))

def volumen(v, f):
    a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
    return float(np.einsum("ij,ij->i", a, np.cross(b, c)).sum() / 6.0)

def area(v, f):
    a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
    return float(np.linalg.norm(np.cross(b - a, c - a), axis=1).sum() / 2.0)
