"""Recopilar ganadores 2025: python tools/investigacion/investigar.py [--lector]."""
import argparse
import hashlib
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

CARPETA = Path(__file__).resolve().parent
MAX_BYTES = 8_000_000


class TextoPublico(HTMLParser):
    """Texto y enlaces visibles; excluye scripts y estilos sin interpretar JavaScript."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ocultos = 0
        self.textos, self.enlaces = [], []

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style"}:
            self.ocultos += 1
        if tag == "a" and not self.ocultos:
            href = dict(attrs).get("href", "")
            if href.startswith(("https://", "http://")):
                self.enlaces.append(href)

    def handle_endtag(self, tag):
        if tag in {"script", "style"}:
            self.ocultos = max(0, self.ocultos - 1)

    def handle_data(self, data):
        if not self.ocultos and data.strip():
            self.textos.append(" ".join(data.split()))


def descargar(url):
    if urllib.parse.urlsplit(url).scheme != "https":
        raise ValueError("solo se consultan fuentes HTTPS")
    req = urllib.request.Request(url, headers={"User-Agent": "VIGIA-investigacion-publica/1.0", "Accept": "text/html,text/plain,application/pdf"})
    with urllib.request.urlopen(req, timeout=20) as respuesta:
        contenido = respuesta.read(MAX_BYTES + 1)
        if len(contenido) > MAX_BYTES:
            raise ValueError("documento superior al límite de descarga")
        return contenido, respuesta.headers.get("Content-Type", ""), respuesta.url


def consultar(url, destino, lector=False, obtener=descargar):
    entrada = {"url": url, "t_real": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "intentos": []}
    consultas = [(url, "directa")]
    if lector and not url.endswith(".pdf"):
        consultas.append(("https://r.jina.ai/" + url, "representacion_tercero"))
    for consulta, via in consultas:
        try:
            contenido, tipo, final = obtener(consulta)
            identificador = hashlib.sha256(url.encode()).hexdigest()[:16]
            archivo = destino / (identificador + (".pdf" if "pdf" in tipo else ".html" if "html" in tipo else ".txt"))
            archivo.write_bytes(contenido)
            entrada.update(estado="leido", via=via, url_consultada=consulta, url_final=final,
                           sha256=hashlib.sha256(contenido).hexdigest(), bytes=len(contenido), archivo=archivo.name)
            if "pdf" not in tipo:
                texto = contenido.decode("utf-8", "replace")
                parser = TextoPublico()
                if "html" in tipo:
                    parser.feed(texto)
                    texto = "\n".join(parser.textos)
                (destino / f"{identificador}-texto.txt").write_text(texto, encoding="utf-8")
                # El lector entrega Markdown; sus enlaces también deben ser auditables.
                enlaces_md = re.findall(r"\]\((https://[^\s)]+)\)", texto)
                entrada["enlaces"] = sorted(set(parser.enlaces + enlaces_md))
                entrada["caracteres_texto"] = len(texto)
                if len(texto) < 100:
                    entrada["estado"] = "contenido_insuficiente"
                    entrada["intentos"].append({"via": via, "error": "contenido_insuficiente", "codigo_http": None})
                    continue
            return entrada
        except (OSError, ValueError) as error:
            entrada["intentos"].append({"via": via, "error": type(error).__name__, "codigo_http": getattr(error, "code", None)})
    return entrada if entrada.get("estado") == "contenido_insuficiente" else {**entrada, "estado": "no_accesible"}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lector", action="store_true", help="intentar también una representación pública de tercero")
    parser.add_argument("--url", action="append", help="limitar la consulta a esta fuente HTTPS; repetible")
    args = parser.parse_args(argv)
    catalogo = json.loads((CARPETA / "fuentes.json").read_text(encoding="utf-8"))
    destino = CARPETA / "data" / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    destino.mkdir(parents=True, exist_ok=False)
    urls = args.url or list(catalogo["fuentes_generales"])
    if not args.url:
        for proyecto in catalogo["proyectos"]:
            urls.extend([proyecto["pagina"], *proyecto["artefactos"]])
    fuentes = []
    for url in dict.fromkeys(urls):
        resultado = consultar(url, destino, args.lector)
        fuentes.append(resultado)
        print(f"{resultado['estado']}: {url}", flush=True)
        (destino / "manifest.json").write_text(json.dumps({"catalogo": catalogo["version"], "fuentes": fuentes}, indent=2, ensure_ascii=False), encoding="utf-8")
        time.sleep(0.4)
    print(destino)
    return int(any(f["estado"] != "leido" for f in fuentes))


if __name__ == "__main__":
    raise SystemExit(main())
