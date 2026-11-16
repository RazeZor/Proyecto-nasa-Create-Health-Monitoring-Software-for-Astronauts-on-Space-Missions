"""Comprobaciones reproducibles: python tools/verificacion/verificar.py [--node RUTA] [--web]."""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


def ejecutar(nombre, comando, carpeta, destino, entorno=None):
    inicio = time.monotonic()
    try:
        proceso = subprocess.run(comando, cwd=carpeta, capture_output=True, encoding="utf-8", errors="replace", env=entorno)
        salida, codigo = proceso.stdout + proceso.stderr, proceso.returncode
    except OSError as error:
        salida, codigo = str(error), 127
    (destino / f"{nombre}.log").write_text(salida, encoding="utf-8")
    resumen = re.findall(r"Ran \d+ tests?[^\n]*|# (?:tests|pass|fail|skipped) \d+|OK(?: \([^\n]*\))?|FAILED[^\n]*", salida)
    omitidas = bool(re.search(r"skipped=[1-9]|# skipped [1-9]", salida))
    resultado = {"nombre": nombre, "comando": comando, "carpeta": str(carpeta.relative_to(RAIZ)),
                 "codigo": codigo, "segundos": round(time.monotonic() - inicio, 2), "omitidas": omitidas,
                 "resumen": resumen, "log": f"{nombre}.log"}
    print(f"{nombre}: {'OK' if codigo == 0 and not omitidas else 'REVISAR'} ({resultado['segundos']} s)", flush=True)
    return resultado


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--node", default=shutil.which("node"))
    parser.add_argument("--web", action="store_true", help="incluir build de producción")
    parser.add_argument("--aislado", action="store_true", help="compilar en .next-verificacion sin reemplazar el build en uso")
    args = parser.parse_args(argv)
    if not args.node:
        parser.error("se requiere Node 22.18 o posterior")
    node = str(Path(args.node).resolve())
    version_node = subprocess.check_output([node, "--version"], text=True).strip()
    if tuple(map(int, version_node.lstrip("v").split("."))) < (22, 18, 0):
        parser.error(f"Node encontrado: {version_node}; usar --node con 22.18 o posterior")
    fecha = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    destino = Path(__file__).resolve().parent / "data" / fecha
    destino.mkdir(parents=True, exist_ok=False)
    pasos = []
    for nombre, argumento in (("contexto", "--check"), ("contexto-lint", "--lint")):
        pasos.append((nombre, [sys.executable, "tools/contextgen/contextgen.py", argumento], RAIZ))
    pasos.append(("ruff", [sys.executable, "-m", "ruff", "check", "."], RAIZ))
    for contenedor in ("pipelines", "packages", "tools", "apps"):
        for modulo in sorted((RAIZ / contenedor).iterdir()):
            if modulo.is_dir() and any(modulo.glob("test_*.py")):
                pasos.append((f"python-{contenedor}-{modulo.name}", [sys.executable, "-m", "unittest", "discover", "-s", str(modulo)], RAIZ))
    pruebas_ts = (sorted((RAIZ / "packages/engine").glob("*.test.ts")) + sorted((RAIZ / "apps/web/lib").glob("*.test.ts"))
                  + sorted((RAIZ / "tools/validacion").glob("*.test.ts")) + sorted((RAIZ / "tools/presentacion").glob("*.test.cjs")))
    pasos.append(("typescript-tests", [node, "--test", *map(str, pruebas_ts)], RAIZ))
    web = RAIZ / "apps/web"
    pasos.append(("typescript-tipos", [node, "node_modules/typescript/bin/tsc", "--noEmit", "--incremental", "false"], web))
    if args.web:
        pasos.append(("web-build", [node, "node_modules/next/dist/bin/next", "build", "--webpack"], web))
    entorno = {**os.environ, **({"VIGIA_VERIFICACION": "1"} if args.aislado else {})}
    resultados = [ejecutar(nombre, comando, carpeta, destino, entorno) for nombre, comando, carpeta in pasos]
    informe = {"t_real": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
               "head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=RAIZ, text=True).strip(),
               "arbol_con_cambios": bool(subprocess.check_output(["git", "status", "--porcelain"], cwd=RAIZ)),
               "python": sys.version.split()[0], "node": version_node, "build_incluido": args.web,
               "resultados": resultados}
    (destino / "resultado.json").write_text(json.dumps(informe, ensure_ascii=False, indent=2), encoding="utf-8")
    print(destino / "resultado.json")
    return int(any(r["codigo"] != 0 or r["omitidas"] for r in resultados))


if __name__ == "__main__":
    sys.exit(main())
