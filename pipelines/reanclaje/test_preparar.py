"""Una fixture que no reproduce sus resultados nunca debe publicarse como KPI vigente."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import preparar

import reanclaje


class Preparacion(unittest.TestCase):
    def test_resultados_distintos_fallan_antes_de_publicar_paneles(self):
        with patch.object(preparar.simulacion, "ejecutar_simulacion", return_value=({}, {})), patch.object(preparar.panel, "publicar") as publicar:
            with self.assertRaisesRegex(ValueError, "no reproduce"):
                preparar.preparar_local()
            publicar.assert_not_called()

    def test_preservar_bytes_de_fixture_y_rechazar_contenido_distinto(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(reanclaje.datalake, "ROOT", Path(tmp)):
            original = b'{\r\n "resultado": 1\r\n}'
            entrada = reanclaje.guardar("prueba", json.loads(original), contenido_original=original)
            self.assertEqual((Path(tmp) / "gold/prueba.json").read_bytes(), original)
            import hashlib
            self.assertEqual(entrada["sha256"], hashlib.sha256(original).hexdigest())
            with self.assertRaisesRegex(ValueError, "no representan"):
                reanclaje.guardar("prueba", {"resultado": 2}, contenido_original=original)
            self.assertEqual((Path(tmp) / "gold/prueba.json").read_bytes(), original)
