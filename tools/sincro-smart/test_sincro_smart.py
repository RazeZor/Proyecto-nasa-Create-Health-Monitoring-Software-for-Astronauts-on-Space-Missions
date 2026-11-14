import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import sincro_smart as s  # noqa: E402


class Evaluar(unittest.TestCase):
    def test_solo_aplican_las_reglas_tocadas(self):
        r = s.evaluar(["apps/api/puente_reloj.py", "packages/schemas/lectura.schema.json", "README.md"])
        self.assertEqual([t for t, _, _ in r], ["Puente de la API con `/live`", "Contrato de lectura de VIGÍA"])
        self.assertEqual(r[0][2], ["apps/api/puente_reloj.py"])

    def test_sin_relacion_no_hay_pendientes(self):
        self.assertEqual(s.evaluar(["pipelines/datalake/datalake.py", "apps/web/components/body/body-view.tsx"]), [])

    def test_patrones_de_carpeta(self):
        r = s.evaluar(["packages/engine/engine.ts", "apps/api/almacen/migraciones/004_x.sql"])
        self.assertEqual(len(r), 2)

    def test_cada_regla_tiene_titulo_y_accion(self):
        for patrones, titulo, accion in s.REGLAS:
            self.assertTrue(patrones and titulo and accion)


class Archivo(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.ruta = Path(self.tmp.name) / s.ARCHIVO

    def tearDown(self):
        self.tmp.cleanup()

    def test_agrega_una_sola_vez_y_conserva_lo_previo(self):
        texto = s.bloque("abc1234", [("abc1234def", "Cambiar el puente")], s.evaluar(["apps/api/puente_reloj.py"]),
                         "2026-11-14T20:00:00Z")
        self.assertIn("- [ ] **Puente de la API con `/live`**", texto)
        self.assertTrue(s.agregar(self.ruta, texto, "abc1234"))
        self.assertFalse(s.agregar(self.ruta, texto, "abc1234"))
        contenido = self.ruta.read_text(encoding="utf-8")
        self.assertTrue(contenido.startswith("# Pendientes por cambios en VIGÍA"))
        self.assertEqual(contenido.count("vigia:abc1234"), 1)
        self.assertTrue(s.agregar(self.ruta, texto.replace("abc1234", "fff0000"), "fff0000"))
        self.assertEqual(self.ruta.read_text(encoding="utf-8").count("### "), 2)

    def test_sin_carpeta_configurada_no_hace_nada(self):
        os.environ.pop("SMART_DIR", None)
        self.assertEqual(s.main(["--smart", str(Path(self.tmp.name) / "no-existe")]), 0)
        self.assertFalse(self.ruta.exists())

    def test_dir_smart_por_argumento_y_variable(self):
        self.assertEqual(s.dir_smart("/x/smart"), Path("/x/smart"))
        os.environ["SMART_DIR"] = "/y/smart"
        try:
            self.assertEqual(s.dir_smart(), Path("/y/smart"))
        finally:
            del os.environ["SMART_DIR"]


if __name__ == "__main__":
    unittest.main()
