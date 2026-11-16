"""Ensayo de ida/vuelta entre dos procesos y bases temporales, sin credenciales persistentes."""
import http.cookiejar
import json
import os
import secrets
import socket
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


def ejecutar():
    destino = Path(__file__).parent / "data" / ("transporte-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
    destino.mkdir(parents=True, exist_ok=False)
    reservas = [socket.socket(), socket.socket()]
    for s in reservas:
        s.bind(("127.0.0.1", 0))
    puerto_api, puerto_tierra = [s.getsockname()[1] for s in reservas]
    for s in reservas:
        s.close()
    clave, enlace, operador = [secrets.token_urlsafe(32) for _ in range(3)]
    entorno = {**os.environ, "VIGIA_DB": str(destino / "abordo.db"), "VIGIA_TIERRA_DB": str(destino / "tierra.db"),
               "VIGIA_IDENTIDAD_ENSAYO": "0", "VIGIA_RELOJ_SEG": "0.2", "SMART_DESACTIVADO": "1",
               "VIGIA_TIERRA_URL": f"http://127.0.0.1:{puerto_tierra}", "VIGIA_TIERRA_CLAVE": enlace,
               "VIGIA_TIERRA_OPERADOR_CLAVE": operador, "VIGIA_E2E_CLAVE": clave}
    codigo = ("import os,main; from almacen import conectar,migrar,tripulacion as t; from seguridad import crear_cuenta; "
              "c=conectar(); migrar(c); m=t.crear_mision(c,'Ensayo','transito','2026-11-14T00:00:00Z'); "
              "a=t.crear_tripulante(c,'Ana',m,'astronauta'); d=t.crear_tripulante(c,'Med',m,'oficial_medico'); "
              "crear_cuenta(c,'ensayo-ana',os.environ['VIGIA_E2E_CLAVE'],a,'astronaut'); "
              "crear_cuenta(c,'ensayo-med',os.environ['VIGIA_E2E_CLAVE'],d,'surgeon'); c.close()")
    subprocess.run([sys.executable, "-c", codigo], cwd=RAIZ / "apps/api", env=entorno, capture_output=True, check=True)
    procesos, logs = [], []
    try:
        for nombre, modulo, puerto in (("api", "main:app", puerto_api), ("tierra", "receptor:app", puerto_tierra)):
            log = (destino / f"{nombre}.log").open("w", encoding="utf-8")
            logs.append(log)
            procesos.append(subprocess.Popen([sys.executable, "-m", "uvicorn", modulo, "--host", "127.0.0.1", "--port", str(puerto)],
                                             cwd=RAIZ / "apps" / nombre, env=entorno, stdout=log, stderr=log))
        base = f"http://127.0.0.1:{puerto_api}"
        cookies = http.cookiejar.CookieJar()
        cliente = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookies))

        def pedir(ruta, datos=None, csrf=None):
            cabeceras = {"Content-Type": "application/json"}
            if csrf:
                cabeceras["X-Vigia-CSRF"] = csrf
            req = urllib.request.Request(base + ruta, data=json.dumps(datos).encode() if datos is not None else None, headers=cabeceras)
            with cliente.open(req, timeout=5) as r:
                return json.load(r)

        for _ in range(100):
            try:
                pedir("/salud")
                break
            except OSError:
                time.sleep(0.1)
        sesion = pedir("/sesion", {"usuario": "ensayo-ana", "clave": clave})
        creado = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        cuerpo = {"creado_t_real": creado, "retardo_min": 0, "contenido": {"titulo": "Ensayo de transporte"}, "operacion_id": "envio-1"}
        reporte = pedir("/tripulantes/1/reportes", cuerpo, sesion["csrf"])
        assert pedir("/tripulantes/1/reportes", cuerpo, sesion["csrf"]) == reporte
        recibido = None
        for _ in range(150):
            recibido = pedir("/tripulantes/1/reportes")[0]
            if recibido.get("acuse_destino"):
                break
            time.sleep(0.1)
        assert recibido and recibido.get("acuse_destino"), "el destino no confirmó recepción"
        mensaje = recibido["acuse_destino"]["mensaje_id"]
        sesion_med = pedir("/sesion", {"usuario": "ensayo-med", "clave": clave})
        assert len(pedir("/reportes/recibidos")) == 1
        pedir(f"/reportes/{reporte['id']}/respuesta", {"respuesta": "Recepción y respuesta de ensayo", "t_real": creado}, sesion_med["csrf"])
        pedir("/sesion", {"usuario": "ensayo-ana", "clave": clave})
        final = pedir("/tripulantes/1/reportes")[0]
        assert final["estado"] == "respondido" and final["respuesta"] == "Recepción y respuesta de ensayo"
        resultado = {"t_real": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "procesos_independientes": True,
                     "bases_temporales": True, "sesiones_verificadas": True, "acuse_destino": True,
                     "respuesta_causal": True, "reintento_sin_duplicado": True, "mensaje_id": mensaje}
        (destino / "resultado.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=2), encoding="utf-8")
        print(destino)
    finally:
        for p in reversed(procesos):
            p.terminate()
            try:
                p.wait(timeout=10)
            except subprocess.TimeoutExpired:
                p.kill()
                p.wait()
        for log in logs:
            log.close()


if __name__ == "__main__":
    ejecutar()
