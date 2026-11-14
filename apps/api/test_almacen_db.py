import sqlite3
import unittest

from almacen import conectar, migrar

TABLAS = {"mision", "tripulante", "indicador", "lectura", "sintoma", "linea_base", "alerta",
          "escalamiento", "reporte_cola", "consentimiento", "auditoria"}


class Esquema(unittest.TestCase):
    def setUp(self):
        self.conn = conectar(":memory:")
        migrar(self.conn)

    def test_migrar_crea_todas_las_tablas(self):
        nombres = {f[0] for f in self.conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertTrue(TABLAS <= nombres)
        self.assertEqual(migrar(conectar(":memory:")), 1)

    def test_migrar_es_idempotente(self):
        self.assertEqual(migrar(self.conn), 1)
        self.assertEqual(migrar(self.conn), 1)

    def test_llaves_foraneas_activas(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute("INSERT INTO tripulante (alias, mision_id, rol) VALUES ('x', 99, 'astronauta')")

    def test_catalogo_de_indicadores(self):
        filas = {f["id"]: f for f in self.conn.execute("SELECT * FROM indicador")}
        self.assertEqual(set(filas), {"presion_arterial_sistolica", "spo2", "temperatura_central",
                                      "frecuencia_cardiaca_reposo", "sueno", "estado_animo", "glucosa",
                                      "masa_corporal"})
        self.assertEqual({k for k, f in filas.items() if f["frecuencia"] == "semanal"}, {"glucosa", "masa_corporal"})
        self.assertEqual({k for k, f in filas.items() if f["tipo"] == "conductual"}, {"sueno", "estado_animo"})


if __name__ == "__main__":
    unittest.main()
