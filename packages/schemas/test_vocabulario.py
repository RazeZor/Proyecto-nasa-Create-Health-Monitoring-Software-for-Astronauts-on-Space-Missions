"""El contrato vocabulario.json no puede desviarse de lo que de verdad usan la base de datos, las fichas y la interfaz.

Lee los archivos (no importa código de apps/) para que, si alguien cambia un lado sin actualizar el contrato, falle.
"""
import json
import re
import unittest
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
V = json.loads((Path(__file__).parent / "vocabulario.json").read_text(encoding="utf-8"))
MIGRACIONES = sorted((RAIZ / "apps/api/almacen/migraciones").glob("*.sql"))
SQL = "\n".join(m.read_text(encoding="utf-8") for m in MIGRACIONES)
TIPOS_TS = (RAIZ / "apps/web/lib/types.ts").read_text(encoding="utf-8")
FICHAS = RAIZ / "apps/web/public/fichas"


def check_sql(columna):
    return set(re.findall(r"'([^']+)'", re.search(rf"{columna} TEXT NOT NULL CHECK \({columna} IN \(([^)]*)\)", SQL).group(1)))


def union_ts(nombre):
    cuerpo = re.search(rf"export type {nombre} =([^\n]*(?:\n\s*\|[^\n]*)*)", TIPOS_TS).group(1)
    return set(re.findall(r'"([^"]+)"', cuerpo))


class Vocabulario(unittest.TestCase):
    def test_indicadores_son_los_de_la_base_y_tienen_ficha(self):
        sembrados = set(re.findall(r"\('([a-z_0-9]+)', '[^']*', '(?:fisiologico|conductual)'", SQL))
        self.assertEqual({i["id"] for i in V["indicadores"]}, sembrados)
        for i in V["indicadores"]:
            if i.get("ficha", True):
                self.assertTrue((FICHAS / f"{i['id']}.json").exists(), i["id"])

    def test_indicadores_ui_zonas_y_tipos_de_la_interfaz(self):
        self.assertEqual({i["ui"] for i in V["indicadores"] if i["ui"]}, union_ts("IndicatorId"))
        self.assertEqual({i["zona"] for i in V["indicadores"]}, {"heart", "blood", "mind", "bone"})
        self.assertLessEqual({i["zona"] for i in V["indicadores"]}, union_ts("ZoneId"))

    def test_niveles_capas_roles_perfiles_cubren_ambos_lados(self):
        for clave, columna, tipo_ts in (("niveles", "nivel", "Status"), ("capas", "capa", "Layer"),
                                        ("perfiles", "perfil", "ProfileId")):
            tabla = V[clave]
            self.assertEqual(set(tabla.values()), check_sql(columna), clave)
            self.assertEqual(set(tabla), union_ts(tipo_ts), clave)
        self.assertEqual(set(V["roles"].values()) - {None}, check_sql("rol") - {"comandante"})
        self.assertEqual(set(V["roles"]), union_ts("Role"))

    def test_sintomas_ui_igual_a_los_de_la_interfaz(self):
        self.assertEqual(set(V["sintomas"]), union_ts("Symptom"))
        self.assertEqual(len(set(V["sintomas"].values())), len(V["sintomas"]))

    def test_retardo_por_perfil_es_entero_dentro_del_rango(self):
        for perfil, minutos in V["retardo_min"].items():
            self.assertIsInstance(minutos, int, perfil)
            self.assertTrue(0 <= minutos <= 22, perfil)


if __name__ == "__main__":
    unittest.main()
