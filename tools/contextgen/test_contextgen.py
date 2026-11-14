import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path

import contextgen as cg

LAGO = '''"""Datalake de prueba.

Más detalle.
"""
import os
import json

ROOT = os.environ.get("DATALAKE_DIR", "data")
GOES_URL = "https://ejemplo/goes.json"
DONKI_URLS = ["https://a/sep", "https://b/sep"]


class EstructuraInesperada(ValueError):
    """La fuente cambió."""


def ingest(fuente, params=None):
    """Descarga y guarda."""


def _privada():
    pass
'''

CLI = '''"""CLI.

  python3 index.py ingest goes
"""
import lago

if __name__ == "__main__":
    lago.ingest("goes")
'''

TEST = '''import unittest

class Limpieza(unittest.TestCase):
    def test_a(self): pass
    def test_b(self): pass
'''


class Generador(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        archivos = {"pipelines/lago/lago.py": LAGO, "pipelines/lago/index.py": CLI,
                    "pipelines/lago/test_lago.py": TEST, "pipelines/lago/data/basura.py": "x = 1",
                    "apps/web/app.tsx": "",
                    "apps/web/util.ts": "import { x } from './y'\nexport function suma(a, b) { return a + b }\n",
                    "documentacion/informe.md": "# sin código"}
        for ruta, texto in archivos.items():
            (self.root / ruta).parent.mkdir(parents=True, exist_ok=True)
            (self.root / ruta).write_text(texto, encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def correr(self, *args):
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return cg.main(["--root", str(self.root), *args])

    def md(self, modulo="pipelines/lago"):
        return (self.root / modulo / "MODULE.md").read_text(encoding="utf-8")

    def test_detecta_modulos_con_codigo(self):
        self.assertEqual(sorted(cg.modulos(self.root)), ["apps/web", "pipelines/lago"])
        self.assertNotIn("pipelines/lago/data/basura.py", cg.modulos(self.root)["pipelines/lago"])

    def test_bloque_auto_python(self):
        self.correr()
        md = self.md()
        for esperado in ("función `ingest(fuente, params=None)`: Descarga y guarda.",
                         "clase `EstructuraInesperada(ValueError)`: La fuente cambió.",
                         "`DATALAKE_DIR`", "`GOES_URL`: https://ejemplo/goes.json", "https://b/sep",
                         "python3 index.py ingest goes", "Internas: `lago`",
                         "`pipelines/lago/test_lago.py`: 2 pruebas en Limpieza (2)", "| [lago.py](lago.py) | "):
            self.assertIn(esperado, md)
        self.assertNotIn("_privada", md)

    def test_typescript_y_archivo_vacio(self):
        self.correr()
        md = self.md("apps/web")
        self.assertIn("función `suma`", md)
        self.assertIn("vacío (pendiente)", md)

    def test_idempotente_y_check(self):
        self.assertEqual(self.correr("--check"), 1)
        self.correr()
        antes = {p: p.read_bytes() for p in self.root.rglob("*.md")}
        self.correr()
        self.assertEqual(antes, {p: p.read_bytes() for p in self.root.rglob("*.md")})
        self.assertEqual(self.correr("--check"), 0)

    def test_conserva_bloque_manual(self):
        self.correr()
        md = self.md().replace("TODO: una frase sobre qué resuelve este módulo.", "Ingesta de clima espacial.")
        md = md.replace("tags: TODO", "tags: ingesta, goes")
        (self.root / "pipelines/lago/MODULE.md").write_text(md, encoding="utf-8")
        (self.root / "pipelines/lago/lago.py").write_text(LAGO + "\n\ndef nueva():\n    pass\n", encoding="utf-8")
        self.assertEqual(self.correr("--check"), 1)
        self.correr()
        self.assertIn("Ingesta de clima espacial.", self.md())
        self.assertIn("`nueva()`", self.md())
        indice = json.loads((self.root / "docs/context/index.json").read_text(encoding="utf-8"))
        backend = next(m for m in indice["modulos"] if m["modulo"] == "pipelines/lago")
        self.assertEqual((backend["proposito"], backend["tags"]), ("Ingesta de clima espacial.", ["ingesta", "goes"]))
        self.assertIn("Ingesta de clima espacial.", (self.root / "docs/context/INDEX.md").read_text(encoding="utf-8"))

    def test_tolera_crlf(self):
        self.correr()
        ruta = self.root / "pipelines/lago/MODULE.md"
        ruta.write_bytes(ruta.read_bytes().replace(b"\n", b"\r\n"))
        self.assertEqual(self.correr("--check"), 0)

    def test_adaptadores_apuntan_a_agents(self):
        self.correr()
        for ruta in ("CLAUDE.md", "GEMINI.md", ".agent/rules/agents.md", ".github/copilot-instructions.md",
                     ".cursor/rules/agents.mdc", ".windsurf/rules/agents.md", ".clinerules/agents.md"):
            self.assertIn("AGENTS.md", (self.root / ruta).read_text(encoding="utf-8"), ruta)

    def test_lint_avisa_todo(self):
        self.correr()
        self.assertTrue(any("pipelines/lago/MODULE.md" in a for a in cg.lint(self.root)))
        md = self.md().replace("TODO:", "Listo, sin TODOs.").replace("tags: TODO", "tags: x")
        (self.root / "pipelines/lago/MODULE.md").write_text(md, encoding="utf-8")
        self.assertFalse(any("pipelines/lago/MODULE.md" in a for a in cg.lint(self.root)))

    def test_patron_de_carpetas(self):
        self.assertEqual(cg.modulo_de("apps/web/src/main.tsx"), "apps/web")
        self.assertEqual(cg.modulo_de("pipelines/goes/ingest.py"), "pipelines/goes")
        self.assertIsNone(cg.modulo_de("pipelines/suelto.py"))
        self.assertEqual(cg.modulo_de("backend/x.py"), "backend")
        (self.root / "backend").mkdir()
        (self.root / "backend/x.py").write_text("x = 1", encoding="utf-8")
        self.assertTrue(any("fuera del patrón" in a for a in cg.lint(self.root)))


if __name__ == "__main__":
    unittest.main()
