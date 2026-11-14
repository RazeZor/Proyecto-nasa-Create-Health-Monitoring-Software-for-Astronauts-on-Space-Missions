import os
import re
import unittest
from unittest import mock

import i18n

VARIABLE = re.compile(r"\{(\w+)\}")


class Catalogos(unittest.TestCase):
    """Reglas que CI exige. El inglés puede ir atrasado; lo que esté traducido debe ser correcto."""

    def test_el_secundario_no_inventa_claves(self):
        principal = set(i18n.catalogo(i18n.PRINCIPAL))
        for idioma in i18n.IDIOMAS:
            sobran = sorted(set(i18n.catalogo(idioma)) - principal)
            self.assertEqual(sobran, [], f"sobran en {idioma}.json: agrégalas primero a es.json")

    def test_mismas_variables_y_textos_no_vacios(self):
        principal = i18n.catalogo(i18n.PRINCIPAL)
        for idioma in i18n.IDIOMAS:
            for clave, traduccion in i18n.catalogo(idioma).items():
                self.assertTrue(isinstance(traduccion, str) and traduccion.strip(), f"{idioma}:{clave} vacío")
                self.assertEqual(set(VARIABLE.findall(traduccion)), set(VARIABLE.findall(principal[clave])),
                                 f"{idioma}:{clave} no tiene las mismas variables que es")

    def test_pendientes_no_bloquean(self):
        with mock.patch.dict(i18n.catalogo("en"), clear=True):
            self.assertIn("alertas.verde", i18n.pendientes())
        self.assertEqual(i18n.pendientes("es"), [])


class Traduccion(unittest.TestCase):
    def test_espanol_por_defecto(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(i18n.t("alertas.rojo"), "Requiere atención médica")

    def test_ingles_por_variable_o_argumento(self):
        with mock.patch.dict(os.environ, {"VIGIA_LANG": "en-US"}):
            self.assertEqual(i18n.t("alertas.rojo"), "Needs medical attention")
        self.assertEqual(i18n.t("alertas.verde", "en"), "Stable")

    def test_idioma_no_soportado_usa_espanol(self):
        self.assertEqual(i18n.t("alertas.verde", "fr"), "Estable")

    def test_clave_faltante_en_ingles_cae_al_espanol(self):
        with mock.patch.dict(i18n.catalogo("en"), clear=True):
            self.assertEqual(i18n.t("alertas.verde", "en"), "Estable")

    def test_clave_inexistente_y_variables(self):
        self.assertEqual(i18n.t("no.existe"), "no.existe")
        self.assertEqual(i18n.t("cli.datalake.error", "es", detalle="x"), "error: x")
        self.assertEqual(i18n.t("cli.datalake.error", "es", otra=1), "error: {detalle}")


if __name__ == "__main__":
    unittest.main()
