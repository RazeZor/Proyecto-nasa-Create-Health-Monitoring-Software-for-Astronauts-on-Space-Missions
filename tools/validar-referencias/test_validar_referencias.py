import json
import unittest
from pathlib import Path

import validar_referencias as vr

META = {"titulo": "Fluid shifts and ambulatory blood pressure reduction", "revista": "J Physiol",
        "anio": 2015, "autores": ["Norsk"]}


class Evaluar(unittest.TestCase):
    def test_doi_inexistente(self):
        self.assertEqual(vr.evaluar({"doi": "x"}, None, "")["estado"], vr.DOI_NO_EXISTE)

    def test_titulo_de_otro_articulo(self):
        ref = {"titulo_contiene": ["core body temperature"]}
        self.assertEqual(vr.evaluar(ref, META, "")["estado"], vr.REVISAR_TITULO)

    def test_cifra_en_resumen(self):
        ref = {"titulo_contiene": ["ambulatory"], "resumen_contiene": ["8–10 mmHg"]}
        r = vr.evaluar(ref, META, "is reduced by 8–10 MMHG by")
        self.assertEqual((r["estado"], r["faltan"]), (vr.OK, []))

    def test_cifra_ausente_es_aviso(self):
        ref = {"resumen_contiene": ["39%"], "texto_contiene": ["nightly dip"]}
        r = vr.evaluar(ref, META, "sin cifras", "texto sin la frase")
        self.assertEqual((r["estado"], r["faltan"]), (vr.REVISAR_TEXTO, ["39%", "nightly dip"]))


class Validar(unittest.TestCase):
    """Reemplaza `_get` para no usar la red."""

    def setUp(self):
        self._get_original = vr._get

    def tearDown(self):
        vr._get = self._get_original

    def test_flujo_completo_sin_red(self):
        def falso(url, como_json=True):
            if url.startswith(vr.CROSSREF_URL):
                return {"message": {"title": [META["titulo"]], "container-title": ["J Physiol"],
                                    "issued": {"date-parts": [[2015, 1]]},
                                    "author": [{"family": "Norsk"}]}}
            if "search?" in url:
                return {"resultList": {"result": [{"abstractText": "reduced by 39%",
                                                   "pmcid": "PMC1"}]}}
            return "<p>the nightly   dip is maintained</p>"
        vr._get = falso
        ref = {"id": "norsk2015", "doi": "10.1/x", "titulo_contiene": ["ambulatory"],
               "resumen_contiene": ["39%"], "texto_contiene": ["nightly dip"]}
        r = vr.validar(ref)
        self.assertEqual((r["estado"], r["pmcid"], r["crossref"]["anio"]), (vr.OK, "PMC1", 2015))

    def test_respuesta_404_sin_metadatos(self):
        vr._get = lambda url, como_json=True: None
        self.assertEqual(vr.validar({"id": "a", "doi": "10.1/x"})["estado"], vr.DOI_NO_EXISTE)

    def test_red_caida_no_es_doi_inexistente(self):
        def fallo(url, como_json=True):
            raise vr.FuenteNoDisponible("sin red")
        vr._get = fallo
        self.assertEqual(vr.validar({"id": "a", "doi": "10.1/x"})["estado"], vr.FUENTE_NO_DISPONIBLE)


class Catalogo(unittest.TestCase):
    def test_estructura(self):
        refs = json.loads(Path(vr.CATALOGO).read_text(encoding="utf-8"))
        ids = [r["id"] for r in refs]
        self.assertEqual(len(ids), len(set(ids)), "ids repetidos")
        for r in refs:
            self.assertTrue(r["doi"].startswith("10."), r["id"])
            self.assertTrue(r.get("titulo_contiene"), f"{r['id']} sin titulo_contiene")
            self.assertTrue(r.get("afirma") and r.get("seccion"), r["id"])


if __name__ == "__main__":
    unittest.main()
