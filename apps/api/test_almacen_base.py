import unittest

from almacen import base, conectar, migrar
from almacen import tripulacion as tr

D, H = "2026-10-31T00:00:00Z", "2026-11-13T00:00:00Z"


class LineaBase(unittest.TestCase):
    def setUp(self):
        self.conn = conectar(":memory:")
        self.addCleanup(self.conn.close)
        migrar(self.conn)
        m = tr.crear_mision(self.conn, "m", "estacion", "2026-11-14T00:00:00Z")
        self.t = tr.crear_tripulante(self.conn, "ana", m, "astronauta")

    def test_guardar_reemplaza(self):
        base.guardar_linea_base(self.conn, self.t, "frecuencia_cardiaca_reposo", "tierra", 60, 3, 14, D, H)
        base.guardar_linea_base(self.conn, self.t, "frecuencia_cardiaca_reposo", "tierra", 62, 3, 14, D, H)
        fila = base.obtener_linea_base(self.conn, self.t, "frecuencia_cardiaca_reposo", "tierra")
        self.assertEqual(fila["mediana"], 62)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM linea_base").fetchone()[0], 1)

    def test_origen_tierra_y_vuelo_conviven(self):
        for origen in ("tierra", "vuelo"):
            base.guardar_linea_base(self.conn, self.t, "sueno", origen, 7, 0.5, 14, D, H)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM linea_base").fetchone()[0], 2)

    def test_valores_invalidos(self):
        for kw in ({"mad": -1}, {"n": 0}, {"desde": H, "hasta": D}, {"mediana": float("nan")}, {"origen": "luna"},
                   {"indicador": "colesterol"}):
            args = {"indicador": "sueno", "origen": "tierra", "mediana": 7, "mad": 0.5, "n": 14, "desde": D, "hasta": H, **kw}
            with self.assertRaises(ValueError, msg=str(kw)):
                base.guardar_linea_base(self.conn, self.t, **args)

    def test_obtener_inexistente_devuelve_none(self):
        self.assertIsNone(base.obtener_linea_base(self.conn, self.t, "sueno", "vuelo"))


if __name__ == "__main__":
    unittest.main()
