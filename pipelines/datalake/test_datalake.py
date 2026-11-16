import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import datalake as dl

GOES = json.dumps([
    {"time_tag": "2026-11-14T10:00:00Z", "satellite": 18, "flux": 2.5, "energy": ">=10 MeV"},
    {"time_tag": "2026-11-14T10:00:00Z", "satellite": 18, "flux": 2.5, "energy": ">=10 MeV"},  # duplicado
    {"time_tag": "2026-11-14T10:05:00Z", "satellite": 18, "flux": -100000, "energy": ">=10 MeV"},  # relleno
    {"time_tag": "2026-11-14T10:05:00Z", "satellite": 18, "flux": 1.0, "energy": ">=1 MeV"},  # energía ajena
    {"time_tag": "2026-11-14T10:05:00Z", "satellite": 18, "flux": 0.4, "energy": ">=50 MeV"},
]).encode()


class Raiz(unittest.TestCase):
    def test_variable_vacia_usa_la_carpeta_data(self):
        # .env.example trae `DATALAKE_DIR=` vacío: no debe escribir en la carpeta desde donde se corre
        import importlib
        import os
        previa = os.environ.get("DATALAKE_DIR")
        os.environ["DATALAKE_DIR"] = ""
        try:
            self.assertEqual(importlib.reload(dl).ROOT, Path(dl.__file__).resolve().parent / "data")
        finally:
            if previa is None:
                del os.environ["DATALAKE_DIR"]
            else:
                os.environ["DATALAKE_DIR"] = previa
            importlib.reload(dl)


class Limpieza(unittest.TestCase):
    def test_goes(self):
        filas = dl.clean_goes(GOES)
        self.assertEqual([(f["t_real"], f["energy"]) for f in filas],
                         [("2026-11-14T10:00:00Z", ">=10 MeV"), ("2026-11-14T10:05:00Z", ">=50 MeV")])

    def test_estructura_inesperada(self):
        for malo in (b'{"a": 1}', b'[{"time_tag": "x"}]', b"no es json"):
            with self.assertRaisesRegex(ValueError, "ESTRUCTURA_INESPERADA"):
                dl.clean_goes(malo)

    def test_donki(self):
        self.assertEqual(dl.clean_donki(b""), [])
        raw = json.dumps([{"sepID": "A", "eventTime": "2024-05-10T14:13Z",
                           "instruments": [{"displayName": "GOES"}],
                           "linkedEvents": [{"activityID": "F1"}], "link": "u"}]).encode()
        self.assertEqual(dl.clean_donki(raw)[0]["t_real"], "2024-05-10T14:13:00Z")

    def test_radlab_descarta_filas_sin_dosis(self):
        raw = (b"timestamp,instrument_id,absorbed_dose_rate,dose_equivalent_rate\n"
               b"2024-05-10T00:00:00,DosTel1,1.5,3.0\n2024-05-10T00:05:00,DosTel1,,\n")
        self.assertEqual(len(dl.clean_radlab(raw)), 1)
        with self.assertRaisesRegex(ValueError, "ESTRUCTURA_INESPERADA"):
            dl.clean_radlab(b"a,b\n1,2\n")


class Almacen(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.raiz_previa, self.get_previo = dl.ROOT, dl._get
        dl.ROOT = Path(self.tmp.name)
        dl._get = lambda url: GOES

    def tearDown(self):
        dl.ROOT, dl._get = self.raiz_previa, self.get_previo
        self.tmp.cleanup()

    def test_donki_prioriza_base_actual_y_sanea_espejo_y_errores(self):
        urls = []
        def descargar(url):
            urls.append(url)
            if "api.nasa.gov" not in url:
                raise OSError("sin conexión")
            return b"[]"
        with patch.dict("os.environ", {"NASA_API_KEY": "secreto-de-prueba"}), patch.object(dl, "_get", descargar):
            (entrada,) = dl.ingest("donki")
        self.assertTrue(urls[0].startswith("https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?"))
        self.assertTrue(all("api_key" not in url for url in urls[:-1]))
        self.assertNotIn("secreto-de-prueba", json.dumps(dl.manifest()))
        self.assertNotIn("api_key", entrada["url"])
        with patch.dict("os.environ", {"NASA_API_KEY": "secreto-de-prueba"}), patch.object(dl, "_get", side_effect=OSError("url?api_key=secreto-de-prueba")):
            with self.assertRaises(ConnectionError) as error:
                dl.ingest("donki")
            self.assertNotIn("secreto-de-prueba", str(error.exception))

    def test_raw_no_se_sobrescribe_al_repetir_en_el_mismo_segundo(self):
        (entrada,) = dl.ingest("goes")
        archivo = dl.ROOT / entrada["raw"]
        from datetime import datetime
        instante = datetime.fromisoformat(entrada["consultado"])
        with patch.object(dl, "datetime", wraps=datetime) as reloj:
            reloj.now.return_value = instante
            with patch.object(Path, "write_bytes", side_effect=AssertionError("raw no usa write_bytes")):
                # El curated sí usa write_bytes: solo inspeccionar la parte raw mediante una colisión.
                archivo.write_text("original", encoding="utf-8")
                with self.assertRaisesRegex(FileExistsError, "conserva el original"):
                    dl.ingest("goes")
        self.assertEqual(archivo.read_text(), "original")

    def test_ingest_guarda_raw_curated_y_huella(self):
        (e,) = dl.ingest("goes")
        self.assertEqual(e["sha256"], hashlib.sha256(GOES).hexdigest())
        self.assertEqual((dl.ROOT / e["raw"]).read_bytes(), GOES)
        self.assertEqual(len(json.loads((dl.ROOT / e["curated"]).read_text())), 2)
        self.assertEqual(dl.manifest()[0]["filas"], 2)

    def test_ingest_con_error_no_escribe(self):
        dl._get = lambda url: b"[1]"
        with self.assertRaises(ValueError):
            dl.ingest("goes")
        self.assertEqual(list(dl.ROOT.rglob("*.*")), [])

    def test_radlab_consulta_cruda(self):
        urls = []
        dl._get = lambda url: urls.append(url) or (
            b'timestamp,instrument_id,absorbed_dose_rate,dose_equivalent_rate\n'
            b'"2024-05-10T00:00:42","DosTel1",4.3,,\n')
        (e,) = dl.ingest("radlab", "spacecraft=ISS&timestamp>=2024-05-10T00:00&absorbed_dose_rate")
        self.assertEqual(urls[0], dl.RADLAB_URL + "?spacecraft=ISS&timestamp>=2024-05-10T00:00&absorbed_dose_rate")
        self.assertEqual(e["url"], urls[0])  # conservar operadores y campos sin '=' para reproducir la consulta
        self.assertEqual(dl.read("radlab")[0]["t_real"], "2024-05-10T00:00:42Z")

    def test_eda_telemetria_con_mision(self):
        urls = []
        dl._get = lambda url: urls.append(url) or json.dumps([
            {"time": "2014-09-21T00:04:00Z", "temperature_iss": 23.4, "co2_iss": 2886.0, "milestones": None}]).encode()
        dl.ingest("eda", {"mision": "RR-3", "start": "2014-09-21T00:00:00Z"})
        self.assertEqual(urls[0], dl.EDA_URL.format(mision="RR-3") + "?start=2014-09-21T00%3A00%3A00Z")
        self.assertEqual(dl.read("eda"), [{"t_real": "2014-09-21T00:04:00Z", "temperature_iss": 23.4,
                                           "co2_iss": 2886.0, "mision": "RR-3"}])

    def test_read_sin_duplicados_y_con_rango(self):
        dl.ingest("goes")
        dl.ingest("goes")  # misma ventana dos veces
        self.assertEqual(len(dl.read("goes")), 2)
        self.assertEqual(len(dl.read("goes", desde="2026-11-14T10:01:00Z")), 1)


if __name__ == "__main__":
    unittest.main()
