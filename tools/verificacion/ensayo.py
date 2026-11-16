"""Ensayo de navegador con base temporal: python tools/verificacion/ensayo.py --node RUTA [--chrome RUTA]."""
import argparse
import os
import secrets
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


def esperar(url, proceso):
    for _ in range(150):
        if proceso.poll() is not None:
            raise RuntimeError(f"el servidor terminó antes de responder en {url}")
        try:
            with urllib.request.urlopen(url, timeout=1) as respuesta:
                if respuesta.status == 200:
                    return
        except (OSError, urllib.error.URLError):
            time.sleep(0.2)
    raise TimeoutError(f"el servidor no respondió en {url}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--node", default=shutil.which("node"))
    parser.add_argument("--chrome", default="C:/Program Files/Google/Chrome/Application/chrome.exe")
    parser.add_argument("--datasets", action="store_true", help="comprobar también MMASH y Orion previamente publicados")
    parser.add_argument("--aislado", action="store_true", help="usar el build de .next-verificacion")
    parser.add_argument("--integral", action="store_true", help="sesiones verificadas, registro, episodios, módulos e IndexedDB aislados")
    parser.add_argument("--demo-publica", action="store_true", help="entrada sin credenciales, tres roles y datos ficticios separados")
    args = parser.parse_args()
    if args.integral and args.demo_publica:
        parser.error("elegir --integral o --demo-publica")
    if not args.node or not Path(args.chrome).is_file():
        parser.error("indicar Node 22.18+ y Chrome/Chromium instalado")
    node = str(Path(args.node).resolve())
    destino = Path(__file__).resolve().parent / "data" / ("ensayo-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
    destino.mkdir(parents=True, exist_ok=False)
    # Reservar tres puertos distintos: el ensayo nunca se conecta a la API que ya use la persona.
    reservas = [socket.socket() for _ in range(3)]
    try:
        for reserva in reservas:
            reserva.bind(("127.0.0.1", 0))
        api, web, proxy = [str(reserva.getsockname()[1]) for reserva in reservas]
    finally:
        for reserva in reservas:
            reserva.close()
    entorno = {**os.environ, "VIGIA_DB": str(destino / "ensayo.db"), "SMART_DESACTIVADO": "1", "VIGIA_IDENTIDAD_ENSAYO": "1", "VIGIA_RELOJ_SEG": "0",
               "VIGIA_E2E_API": api, "VIGIA_E2E_WEB": web, "VIGIA_E2E_PROXY": proxy,
               "VIGIA_E2E_DATASETS": "1" if args.datasets else "0"}
    entorno["VIGIA_DEMO_DIR"] = str(destino / "demostraciones")
    if args.aislado:
        entorno["VIGIA_VERIFICACION"] = "1"
    if args.integral:
        entorno.update(VIGIA_IDENTIDAD_ENSAYO="0", VIGIA_E2E_INTEGRAL="1", VIGIA_E2E_CLAVE=secrets.token_urlsafe(24))
    if args.demo_publica:
        entorno.update(VIGIA_IDENTIDAD_ENSAYO="0", VIGIA_E2E_DEMO_PUBLICA="1")
    subprocess.run([sys.executable, "-m", "almacen", "sembrar"], cwd=RAIZ / "apps/api", env=entorno, check=True, capture_output=True)
    if args.integral:
        codigo = ("import os, main; from seguridad import crear_cuenta; from almacen import conectar; "
                  "c=conectar(); crear_cuenta(c,'ensayo-ana',os.environ['VIGIA_E2E_CLAVE'],1,'astronaut'); "
                  "crear_cuenta(c,'ensayo-bea',os.environ['VIGIA_E2E_CLAVE'],4,'astronaut'); c.close()")
        subprocess.run([sys.executable, "-c", codigo], cwd=RAIZ / "apps/api", env=entorno, check=True, capture_output=True)
    procesos, logs = [], []
    try:
        for nombre, comando, carpeta in (
            ("api", [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", api], RAIZ / "apps/api"),
            ("web", [node, "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", web], RAIZ / "apps/web"),
        ):
            log = (destino / f"{nombre}.log").open("w", encoding="utf-8")
            logs.append(log)
            procesos.append(subprocess.Popen(comando, cwd=carpeta, env=entorno, stdout=log, stderr=log))
        esperar(f"http://127.0.0.1:{api}/salud", procesos[0])
        esperar(f"http://127.0.0.1:{web}", procesos[1])
        resultado = subprocess.run([node, str(Path(__file__).with_name("navegador.mjs")), args.chrome, str(destino)], cwd=RAIZ, env=entorno)
        print(destino)
        return resultado.returncode
    finally:
        for proceso in reversed(procesos):
            proceso.terminate()
            try:
                proceso.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proceso.kill()
                proceso.wait()
        for log in logs:
            log.close()


if __name__ == "__main__":
    sys.exit(main())
