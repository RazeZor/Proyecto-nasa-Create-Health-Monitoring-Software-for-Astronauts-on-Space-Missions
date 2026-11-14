"""Genera el contexto del repositorio para cualquier asistente de IA (AGENTS.md).

  python tools/contextgen/contextgen.py           regenera y lista los archivos que cambió
  python tools/contextgen/contextgen.py --check   sale con 1 si algo está desactualizado
  python tools/contextgen/contextgen.py --lint    avisa de puntos clave pendientes o sin tocar

Un módulo es cada subcarpeta con código de apps/, pipelines/, packages/ o tools/
(docs/ARQUITECTURA.md); el código fuera de ese patrón también se documenta, pero
--lint avisa. En cada módulo mantiene MODULE.md:
el bloque MANUAL (propósito, puntos clave, tags) lo escriben personas o su IA y nunca
se toca; el bloque AUTO se reescribe a partir del código. También genera
docs/context/INDEX.md e index.json. Solo biblioteca estándar; salida determinista.
"""
import argparse
import ast
import json
import re
import subprocess
import sys
import textwrap
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
CODIGO = {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs"}
# Patrón de carpetas (docs/ARQUITECTURA.md): cada subcarpeta de un contenedor es un módulo.
CONTENEDORES = ("apps", "pipelines", "packages", "tools")
OMITIR = {"__pycache__", "node_modules", "data", "dist", "build", ".venv", "venv", "eda_manual"}
MANUAL_INI, MANUAL_FIN = "<!-- CONTEXT:MANUAL:START -->", "<!-- CONTEXT:MANUAL:END -->"
AUTO_INI, AUTO_FIN = "<!-- CONTEXT:AUTO:START -->", "<!-- CONTEXT:AUTO:END -->"
GENERADOR = "tools/contextgen/contextgen.py"

# Adaptadores por herramienta: todos apuntan a AGENTS.md, la única fuente de instrucciones.
# Codex, Jules, Aider y otros leen AGENTS.md directamente y no necesitan adaptador.
# Para sumar una herramienta, agrega aquí su archivo y regenera.
AVISO = "<!-- Generado por tools/contextgen/contextgen.py. No editar: cambia AGENTS.md. -->"
PUNTERO = ("Las instrucciones de este repositorio están en `AGENTS.md`, en la raíz. "
           "Léelo antes de trabajar y síguelo; después abre `docs/context/INDEX.md` "
           "y el `MODULE.md` del módulo que vas a tocar.")
ADAPTADORES = {
    "CLAUDE.md": f"{AVISO}\n@AGENTS.md\n",                       # Claude Code (importa el archivo)
    "GEMINI.md": f"{AVISO}\n@AGENTS.md\n",                       # Gemini CLI y Google Antigravity
    ".agent/rules/agents.md": f"{AVISO}\n{PUNTERO}\n",           # Google Antigravity (reglas del workspace)
    ".github/copilot-instructions.md": f"{AVISO}\n{PUNTERO}\n",  # GitHub Copilot
    ".cursor/rules/agents.mdc": f"---\ndescription: Instrucciones del repositorio\nalwaysApply: true\n---\n{AVISO}\n{PUNTERO}\n",
    ".windsurf/rules/agents.md": f"{AVISO}\n{PUNTERO}\n",        # Windsurf
    ".clinerules/agents.md": f"{AVISO}\n{PUNTERO}\n",            # Cline / Roo
}

PLANTILLA_MANUAL = f"""{MANUAL_INI}
## Propósito

TODO: una frase sobre qué resuelve este módulo.

## Puntos clave

- TODO: invariantes, decisiones de diseño y trampas (10 como máximo).

## Relación con el informe

- TODO: secciones del informe técnico que implementa.

tags: TODO
{MANUAL_FIN}"""


# ---------- archivos ----------

def archivos(root):
    """Archivos versionados (o en el índice) de root; sin git, recorre la carpeta."""
    try:
        salida = subprocess.run(["git", "ls-files", "--cached", "-z"], cwd=root,
                                capture_output=True, check=True).stdout.decode("utf-8")
        rutas = [p for p in salida.split("\0") if p]
    except (OSError, subprocess.CalledProcessError):
        rutas = [p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()]
    return sorted(p for p in rutas if (root / p).is_file())


def modulo_de(ruta):
    """Módulo al que pertenece una ruta: <contenedor>/<nombre> o, fuera del patrón, la carpeta de primer nivel."""
    partes = ruta.split("/")
    if partes[0] in CONTENEDORES:
        return "/".join(partes[:2]) if len(partes) >= 3 else None  # un archivo suelto en el contenedor no es módulo
    return partes[0] if len(partes) >= 2 else None


def modulos(root):
    """{módulo: [rutas de código]}. Ver docs/ARQUITECTURA.md."""
    salida = {}
    for p in archivos(root):
        partes = p.split("/")
        if partes[0].startswith(".") or set(partes[:-1]) & OMITIR or Path(p).suffix not in CODIGO:
            continue
        nombre = modulo_de(p)
        if nombre:
            salida.setdefault(nombre, []).append(p)
    return salida


def es_test(ruta):
    n = Path(ruta).name
    return n.startswith("test_") or n.endswith("_test.py") or ".test." in n or ".spec." in n


def leer(path):
    return path.read_text(encoding="utf-8", errors="replace").replace("\r\n", "\n")


# ---------- análisis ----------

def _primera_linea(doc):
    return doc.strip().splitlines()[0].strip() if doc and doc.strip() else ""


def _firma(nodo):
    return f"{nodo.name}({ast.unparse(nodo.args)})"


def analizar_py(texto):
    info = {"doc": "", "simbolos": [], "imports": set(), "env": set(), "urls": [],
            "main": False, "tests": []}
    try:
        arbol = ast.parse(texto)
    except SyntaxError as e:
        info["doc"] = f"(no se pudo analizar: {e.msg}, línea {e.lineno})"
        return info
    info["doc"] = _primera_linea(ast.get_docstring(arbol))
    for nodo in arbol.body:
        if isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)) and not nodo.name.startswith("_"):
            info["simbolos"].append({"nombre": nodo.name, "tipo": "función", "firma": _firma(nodo),
                                     "doc": _primera_linea(ast.get_docstring(nodo))})
        elif isinstance(nodo, ast.ClassDef) and not nodo.name.startswith("_"):
            bases = ", ".join(ast.unparse(b) for b in nodo.bases)
            info["simbolos"].append({"nombre": nodo.name, "tipo": "clase",
                                     "firma": f"{nodo.name}({bases})" if bases else nodo.name,
                                     "doc": _primera_linea(ast.get_docstring(nodo))})
            pruebas = [m.name for m in nodo.body
                       if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef)) and m.name.startswith("test")]
            if pruebas:
                info["tests"].append({"clase": nodo.name, "pruebas": pruebas})
        elif isinstance(nodo, ast.Assign) and len(nodo.targets) == 1 and isinstance(nodo.targets[0], ast.Name):
            nombre = nodo.targets[0].id
            if re.search(r"_URLS?$", nombre):
                try:
                    valor = ast.literal_eval(nodo.value)
                except (ValueError, TypeError, SyntaxError):
                    continue  # no es un literal
                for url in valor if isinstance(valor, (list, tuple)) else [valor]:
                    if isinstance(url, str):
                        info["urls"].append((nombre, url))
        elif isinstance(nodo, ast.If) and "__name__" in ast.unparse(nodo.test):
            info["main"] = True
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.Import):
            info["imports"].update(a.name.split(".")[0] for a in nodo.names)
        elif isinstance(nodo, ast.ImportFrom) and nodo.module and not nodo.level:
            info["imports"].add(nodo.module.split(".")[0])
        elif isinstance(nodo, ast.Call) and nodo.args and isinstance(nodo.args[0], ast.Constant):
            f = ast.unparse(nodo.func)
            if f in ("os.environ.get", "os.getenv", "environ.get", "getenv"):
                info["env"].add(nodo.args[0].value)
        elif (isinstance(nodo, ast.Subscript) and ast.unparse(nodo.value) in ("os.environ", "environ")
              and isinstance(nodo.slice, ast.Constant)):
            info["env"].add(nodo.slice.value)
    return info


EXPORT = re.compile(r"^export\s+(?:default\s+)?(?:async\s+)?"
                    r"(function|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)", re.M)
IMPORT = re.compile(r"""^import\s.*?from\s+['"]([^'"]+)['"]|^import\s+['"]([^'"]+)['"]""", re.M)
ENV_JS = re.compile(r"(?:process\.env|import\.meta\.env)\.([A-Z0-9_]+)")
TIPOS_JS = {"function": "función", "class": "clase", "const": "constante", "let": "variable",
            "interface": "interfaz", "type": "tipo", "enum": "enum"}


def analizar_js(texto):
    comentario = re.match(r"\s*/\*\*?(.*?)\*/", texto, re.S)
    doc = _primera_linea(re.sub(r"^\s*\* ?", "", comentario.group(1), flags=re.M)) if comentario else ""
    return {
        "doc": doc,
        "simbolos": [{"nombre": n, "tipo": TIPOS_JS[t], "firma": n, "doc": ""} for t, n in EXPORT.findall(texto)],
        "imports": {a or b for a, b in IMPORT.findall(texto)},
        "env": set(ENV_JS.findall(texto)), "urls": [], "main": False, "tests": [],
    }


def analizar(root, ruta):
    texto = leer(root / ruta)
    lineas = len(texto.splitlines())
    if not texto.strip():
        info = {"doc": "vacío (pendiente)", "simbolos": [], "imports": set(), "env": set(),
                "urls": [], "main": False, "tests": []}
    elif ruta.endswith(".py"):
        info = analizar_py(texto)
    else:
        info = analizar_js(texto)
    info.update(ruta=ruta, lineas=lineas, test=es_test(ruta),
                uso=_uso_cli(texto) if info["main"] and not es_test(ruta) else "")
    return info


def _uso_cli(texto):
    try:
        doc = ast.get_docstring(ast.parse(texto)) or ""
    except SyntaxError:
        return ""
    lineas = [l for l in doc.splitlines() if l.strip().startswith(("python", "node", "npm", "npx"))]
    return textwrap.dedent("\n".join(lineas)).strip("\n")


# ---------- render ----------

def _celda(s):
    return s.replace("|", "\\|").replace("\n", " ")


def render_auto(nombre, infos):
    locales = {Path(i["ruta"]).stem for i in infos}
    stdlib = getattr(sys, "stdlib_module_names", frozenset())
    out = [AUTO_INI, "## Mapa del módulo (generado)", "",
           f"> No editar este bloque: lo regenera `{GENERADOR}`.", "", "### Archivos", "",
           "| Archivo | Líneas | Descripción |", "| --- | --- | --- |"]
    for i in infos:
        rel = i["ruta"][len(nombre) + 1:]
        out.append(f"| [{rel}]({rel}) | {i['lineas']} | {_celda(i['doc']) or '—'} |")

    codigo = [i for i in infos if not i["test"] and i["simbolos"]]
    if codigo:
        out += ["", "### API pública"]
        for i in codigo:
            out += ["", f"**{i['ruta'][len(nombre) + 1:]}**", ""]
            for s in i["simbolos"]:
                linea = f"- {s['tipo']} `{s['firma']}`"
                out.append(linea + (f": {s['doc']}" if s["doc"] else ""))

    entradas = [i for i in infos if i["uso"] or (i["main"] and not i["test"])]
    if entradas:
        out += ["", "### Puntos de entrada", ""]
        for i in entradas:
            out.append(f"- `{i['ruta']}`")
            if i["uso"]:
                out += ["", "```", i["uso"], "```", ""]
        while out[-1] == "":
            out.pop()

    env = sorted({e for i in infos for e in i["env"]})
    urls = [(n, u) for i in infos for n, u in i["urls"]]
    if env or urls:
        out += ["", "### Configuración y fuentes externas", ""]
        if env:
            out.append("- Variables de entorno: " + ", ".join(f"`{e}`" for e in env))
        out += [f"- `{n}`: {u}" for n, u in urls]

    imports = {m for i in infos for m in i["imports"]}
    internos = sorted(m for m in imports if m in locales or m.startswith("."))
    terceros = sorted(m for m in imports - set(internos) if m not in stdlib and not m.startswith("node:"))
    biblioteca = sorted(m for m in imports - set(internos) - set(terceros))
    if imports:
        out += ["", "### Dependencias", ""]
        if internos:
            out.append("- Internas: " + ", ".join(f"`{m}`" for m in internos))
        out.append("- Externas: " + (", ".join(f"`{m}`" for m in terceros) or "ninguna"))
        if biblioteca:
            out.append("- Biblioteca estándar: " + ", ".join(f"`{m}`" for m in biblioteca))

    tests = [i for i in infos if i["test"]]
    if tests:
        out += ["", "### Tests", ""]
        for i in tests:
            total = sum(len(t["pruebas"]) for t in i["tests"])
            grupos = ", ".join(f"{t['clase']} ({len(t['pruebas'])})" for t in i["tests"])
            out.append(f"- `{i['ruta']}`: {total} pruebas" + (f" en {grupos}" if grupos else ""))
    out.append(AUTO_FIN)
    return "\n".join(out)


def bloque(texto, ini, fin):
    a, b = texto.find(ini), texto.find(fin)
    return texto[a:b + len(fin)] if a != -1 and b > a else None


def render_modulo(nombre, infos, actual):
    manual = (bloque(actual, MANUAL_INI, MANUAL_FIN) if actual else None) or PLANTILLA_MANUAL
    if actual and bloque(actual, AUTO_INI, AUTO_FIN):
        return actual.replace(bloque(actual, AUTO_INI, AUTO_FIN), render_auto(nombre, infos))
    cabecera = actual[:actual.find(MANUAL_INI)].rstrip() if actual and MANUAL_INI in actual else f"# Módulo `{nombre}`"
    return f"{cabecera}\n\n{manual}\n\n{render_auto(nombre, infos)}\n"


def leer_manual(texto):
    """(propósito, puntos clave, tags) del bloque MANUAL."""
    manual = bloque(texto, MANUAL_INI, MANUAL_FIN) or ""
    seccion, proposito, puntos, tags = None, "", [], []
    for linea in manual.splitlines():
        l = linea.strip()
        if l.startswith("## "):
            seccion = l[3:].lower()
        elif l.lower().startswith("tags:"):
            tags = [t.strip() for t in l[5:].split(",") if t.strip()]
        elif l and seccion == "propósito" and not proposito:
            proposito = l
        elif l.startswith("- ") and seccion == "puntos clave":
            puntos.append(l[2:])
    return proposito, puntos, tags


def render_indice(datos):
    out = ["# Índice de contexto del repositorio", "",
           f"> Generado por `{GENERADOR}`. No editar a mano: cambia el `MODULE.md` de cada módulo.", "",
           "Empieza aquí. Cada módulo tiene un `MODULE.md` con su propósito, sus puntos clave y su mapa de código.", "",
           "| Módulo | Propósito | Tags | Archivos |", "| --- | --- | --- | --- |"]
    for m in datos:
        out.append(f"| [{m['modulo']}](../../{m['modulo']}/MODULE.md) | {_celda(m['proposito']) or '—'} | "
                   f"{', '.join(m['tags']) or '—'} | {len(m['archivos'])} |")
    simbolos = sorted((s["nombre"], s["tipo"], a["ruta"]) for m in datos for a in m["archivos"] for s in a["simbolos"])
    if simbolos:
        out += ["", "## Dónde está cada símbolo", "", "| Símbolo | Tipo | Archivo |", "| --- | --- | --- |"]
        out += [f"| `{n}` | {t} | [{r}](../../{r}) |" for n, t, r in simbolos]
    return "\n".join(out) + "\n"


# ---------- orquestación ----------

def generar(root):
    """{ruta relativa: contenido esperado} de todo lo que mantiene el generador."""
    salida, datos = {}, []
    for nombre, rutas in sorted(modulos(root).items()):
        infos = [analizar(root, r) for r in rutas]
        destino = root / nombre / "MODULE.md"
        contenido = render_modulo(nombre, infos, leer(destino) if destino.exists() else "")
        salida[f"{nombre}/MODULE.md"] = contenido
        proposito, puntos, tags = leer_manual(contenido)
        datos.append({
            "modulo": nombre, "proposito": proposito, "puntos_clave": puntos, "tags": tags,
            "env": sorted({e for i in infos for e in i["env"]}),
            "archivos": [{"ruta": i["ruta"], "lineas": i["lineas"], "descripcion": i["doc"],
                          "test": i["test"], "simbolos": i["simbolos"]} for i in infos],
        })
    salida["docs/context/INDEX.md"] = render_indice(datos)
    salida["docs/context/index.json"] = json.dumps({"generador": GENERADOR, "modulos": datos},
                                                   indent=2, ensure_ascii=False) + "\n"
    salida.update(ADAPTADORES)
    return salida


def pendientes(root, esperado):
    return [r for r, c in esperado.items()
            if not (root / r).exists() or leer(root / r) != c]


def _git(root, *args):
    r = subprocess.run(["git", *args], cwd=root, capture_output=True)
    return r.stdout.decode("utf-8", "replace").replace("\r\n", "\n") if r.returncode == 0 else None


def lint(root):
    avisos = []
    staged = (_git(root, "diff", "--cached", "--name-only") or "").split()
    for nombre, rutas in sorted(modulos(root).items()):
        if "/" not in nombre:
            avisos.append(f"{nombre}/: hay código fuera del patrón de carpetas; muévelo a "
                          f"{', '.join(c + '/' for c in CONTENEDORES)} (docs/ARQUITECTURA.md)")
        ruta_md = f"{nombre}/MODULE.md"
        actual = leer(root / ruta_md) if (root / ruta_md).exists() else ""
        manual = bloque(actual, MANUAL_INI, MANUAL_FIN)
        if manual is None or re.search(r"TODO:|^tags:\s*TODO\s*$", manual, re.M):
            avisos.append(f"{ruta_md}: el bloque MANUAL tiene TODO pendientes")
        if any(r in staged for r in rutas if not es_test(r)):
            antes = bloque(_git(root, "show", f"HEAD:{ruta_md}") or "", MANUAL_INI, MANUAL_FIN)
            ahora = bloque(_git(root, "show", f":{ruta_md}") or "", MANUAL_INI, MANUAL_FIN)
            if antes is not None and antes == ahora:
                avisos.append(f"{ruta_md}: cambiaste código de '{nombre}' sin tocar sus puntos clave; "
                              "revisa si siguen siendo ciertos")
    return avisos


def main(argv=None):
    for flujo in (sys.stdout, sys.stderr):
        if hasattr(flujo, "reconfigure"):
            flujo.reconfigure(encoding="utf-8", newline="\n")  # en Windows evita \r en las rutas
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true", help="no escribe; sale con 1 si hay cambios")
    ap.add_argument("--lint", action="store_true", help="avisos sobre los bloques MANUAL")
    ap.add_argument("--root", type=Path, default=REPO)
    a = ap.parse_args(argv)
    root = a.root.resolve()
    if a.lint:
        for aviso in lint(root):
            print(f"aviso: {aviso}", file=sys.stderr)
        return 0
    esperado = generar(root)
    cambios = pendientes(root, esperado)
    if a.check:
        if cambios:
            print("Contexto desactualizado: " + ", ".join(cambios), file=sys.stderr)
            print(f"Corre `python {GENERADOR}` y commitea el resultado.", file=sys.stderr)
            return 1
        return 0
    for r in cambios:
        destino = root / r
        destino.parent.mkdir(parents=True, exist_ok=True)
        with open(destino, "w", encoding="utf-8", newline="\n") as f:
            f.write(esperado[r])
        print(r)
    return 0


if __name__ == "__main__":
    sys.exit(main())
