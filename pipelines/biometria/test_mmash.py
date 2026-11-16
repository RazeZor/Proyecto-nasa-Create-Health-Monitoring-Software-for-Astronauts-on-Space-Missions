"""Integridad, tiempos relativos y repetición con archivos artificiales pequeños; sin red."""
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

import mmash


def archivo(rr=None, sueno=None, extra=None):
    salida = io.BytesIO()
    with zipfile.ZipFile(salida, "w") as z:
        z.writestr("DataPaper/user_1/RR.csv", rr or "ibi_s,day,time\n1,1,23:59:00\n0.5,2,00:00:00\n0,2,00:00:01\nNaN,2,00:00:02\n1,2,99:00:00\n")
        z.writestr("DataPaper/user_1/sleep.csv", sueno or "Out Bed Date,Out Bed Time,Total Sleep Time (TST)\n2,08:00,420\n2,14:00,NaN\n")
        if extra:
            z.writestr(*extra)
    return salida.getvalue()


class Biometria(unittest.TestCase):
    def test_conservar_ausencias_y_dia_relativo_sin_inventar_utc_o_reposo(self):
        s = mmash.normalizar(archivo())["sujetos"][0]
        self.assertEqual((s["intervalos_originales"], s["intervalos_utilizados"]), (5, 2))
        self.assertEqual(s["intervalos_no_positivos_o_ausentes"], 2)
        self.assertEqual(s["intervalos_tiempo_no_interpretable"], 1)
        self.assertEqual([r["fc_derivada_mediana_lpm"] for r in s["serie_5min"]], [60, 120])
        self.assertTrue(all(r["t_real"] is None for r in s["serie_5min"]))
        self.assertEqual(s["periodos_sueno"][0]["sueno_h"], 7)
        self.assertIsNone(s["periodos_sueno"][1]["sueno_h"])

    def test_cambio_de_estructura_y_rutas_no_admitidas(self):
        for contenido in (archivo(rr="otra,columna\na,b\n"), archivo(extra=("../fuera.csv", "x")),
                          archivo(sueno="Out Bed Date,Out Bed Time,Total Sleep Time (TST)\n2,08:00,-5\n")):
            with self.assertRaises(mmash.EstructuraInesperada):
                mmash.normalizar(contenido)

    def preparar(self, carpeta):
        descargas = carpeta / "descargas"
        descargas.mkdir()
        datos = {"MMASH.zip": archivo(), "LICENSE.txt": b"Licencia artificial de prueba"}
        hashes = {nombre: mmash.sha256(b) for nombre, b in datos.items()}
        datos["SHA256SUMS.txt"] = "\n".join(f"{s} {n}" for n, s in hashes.items()).encode()
        for nombre, contenido in datos.items():
            (descargas / nombre).write_bytes(contenido)
        return descargas, hashes

    def test_publicacion_idempotente_y_raw_alterado_no_se_oculta(self):
        with tempfile.TemporaryDirectory() as temporal:
            carpeta = Path(temporal)
            desde, hashes = self.preparar(carpeta)
            raiz, gold = carpeta / "datos", carpeta / "gold"
            with patch.dict(mmash.HASHES, hashes, clear=True):
                primero = mmash.importar_mmash(desde, raiz, gold)
                contenido = (gold / "dataset-mmash.json").read_bytes()
                self.assertEqual(mmash.importar_mmash(desde, raiz, gold), primero)
                self.assertEqual((gold / "dataset-mmash.json").read_bytes(), contenido)
                self.assertEqual(len([p for p in (raiz / "raw").rglob("*") if p.is_file()]), 3)
                datos = json.loads(contenido)
                self.assertEqual((datos["uso"], datos["t_real_observacion"], datos["validacion_clinica"]), ("referencia", None, False))
                raw = next((raiz / "raw").rglob("*-MMASH.zip"))
                raw.write_bytes(b"alteracion")
                with self.assertRaises(mmash.EstructuraInesperada):
                    mmash.importar_mmash(desde, raiz, gold)
                self.assertEqual(raw.read_bytes(), b"alteracion")

    def test_checksum_incorrecto_no_publica_nada(self):
        with tempfile.TemporaryDirectory() as temporal:
            carpeta = Path(temporal)
            desde, hashes = self.preparar(carpeta)
            (desde / "MMASH.zip").write_bytes(b"alterado")
            with patch.dict(mmash.HASHES, hashes, clear=True), self.assertRaises(mmash.EstructuraInesperada):
                mmash.importar_mmash(desde, carpeta / "datos", carpeta / "gold")
            self.assertFalse((carpeta / "datos").exists())
            self.assertFalse((carpeta / "gold").exists())
