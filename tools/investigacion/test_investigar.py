import tempfile
import unittest
from pathlib import Path
from urllib.error import URLError

from investigar import TextoPublico, consultar


class Investigacion(unittest.TestCase):
    def test_spa_insuficiente_intenta_lector_y_extrae_enlaces_markdown(self):
        with tempfile.TemporaryDirectory() as d:
            def obtener(url):
                if not url.startswith("https://r.jina.ai/"):
                    return b"<div>App</div>", "text/html", url
                return ("[Fuente](https://ejemplo.org/datos) " * 8).encode(), "text/plain", url
            resultado = consultar("https://ejemplo.org", Path(d), lector=True, obtener=obtener)
            self.assertEqual(resultado["estado"], "leido")
            self.assertEqual(resultado["enlaces"], ["https://ejemplo.org/datos"])

    def test_no_interpreta_scripts_y_conserva_enlaces_publicos(self):
        parser = TextoPublico()
        parser.feed('<p>Prueba &amp; ciencia</p><script>ejecutar()</script><a href="https://ejemplo.org">Fuente</a><a href="mailto:privado">Contacto</a>')
        self.assertEqual(parser.textos, ["Prueba & ciencia", "Fuente", "Contacto"])
        self.assertEqual(parser.enlaces, ["https://ejemplo.org"])

    def test_un_fallo_no_se_presenta_como_lectura(self):
        with tempfile.TemporaryDirectory() as d:
            def fallo(url):
                raise URLError("sin acceso")
            resultado = consultar("https://ejemplo.org", Path(d), obtener=fallo)
            self.assertEqual(resultado["estado"], "no_accesible")
            self.assertEqual(list(Path(d).iterdir()), [])

    def test_lector_se_declara_y_se_preservan_bytes(self):
        with tempfile.TemporaryDirectory() as d:
            def obtener(url):
                if not url.startswith("https://r.jina.ai/"):
                    raise URLError("certificado")
                return b"Texto publico " * 20, "text/plain", url
            resultado = consultar("https://ejemplo.org", Path(d), lector=True, obtener=obtener)
            self.assertEqual((resultado["estado"], resultado["via"]), ("leido", "representacion_tercero"))
            self.assertEqual(len(resultado["intentos"]), 1)
            self.assertEqual((Path(d) / resultado["archivo"]).read_bytes(), b"Texto publico " * 20)
