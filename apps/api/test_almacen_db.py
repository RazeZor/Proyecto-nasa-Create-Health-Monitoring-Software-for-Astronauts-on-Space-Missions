import sqlite3
import tempfile
import threading
import unittest
from pathlib import Path

import almacen.db as bd
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
        self.assertEqual(migrar(conectar(":memory:")), 3)

    def test_migrar_es_idempotente(self):
        self.assertEqual(migrar(self.conn), 3)
        self.assertEqual(migrar(self.conn), 3)

    def test_llaves_foraneas_activas(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute("INSERT INTO tripulante (alias, mision_id, rol) VALUES ('x', 99, 'astronauta')")

    def test_catalogo_de_indicadores(self):
        filas = {f["id"]: f for f in self.conn.execute("SELECT * FROM indicador")}
        self.assertEqual(set(filas), {"presion_arterial_sistolica", "spo2", "temperatura_central",
                                      "frecuencia_cardiaca_reposo", "sueno", "estado_animo", "glucosa",
                                      "masa_corporal", "presion_arterial_diastolica"})
        self.assertEqual({k for k, f in filas.items() if f["frecuencia"] == "semanal"}, {"glucosa", "masa_corporal"})
        self.assertEqual({k for k, f in filas.items() if f["tipo"] == "conductual"}, {"sueno", "estado_animo"})

    def test_retardo_acepta_0_a_22_tambien_en_la_base(self):
        m = self.conn.execute("INSERT INTO mision (nombre, perfil, dia1_t_real) VALUES ('m', 'estacion', '2026-11-14T00:00:00Z')").lastrowid
        t = self.conn.execute("INSERT INTO tripulante (alias, mision_id, rol) VALUES ('a', ?, 'astronauta')", (m,)).lastrowid
        sql = "INSERT INTO reporte_cola (tripulante_id, creado_t_real, retardo_min, llega_t_real) VALUES (?, 'x', ?, 'y')"
        for ok in (0, 22):
            self.conn.execute(sql, (t, ok))
        for malo in (-1, 23):
            with self.assertRaises(sqlite3.IntegrityError):
                self.conn.execute(sql, (t, malo))

    def test_conexion_usable_desde_otro_hilo(self):
        # FastAPI resuelve dependencias y endpoint en hilos distintos del threadpool
        resultado = []
        hilo = threading.Thread(target=lambda: resultado.append(self.conn.execute("SELECT 1").fetchone()[0]))
        hilo.start()
        hilo.join()
        self.assertEqual(resultado, [1])

    def test_migrar_concurrente_no_falla(self):
        with tempfile.TemporaryDirectory() as d:
            ruta, errores = Path(d) / "v.db", []

            def trabajo():
                conn = conectar(ruta)
                try:
                    migrar(conn)
                except Exception as e:  # noqa: BLE001
                    errores.append(repr(e))
                finally:
                    conn.close()  # en Windows un archivo abierto no se puede borrar

            hilos = [threading.Thread(target=trabajo) for _ in range(8)]
            [h.start() for h in hilos]
            [h.join() for h in hilos]
            self.assertEqual(errores, [])
            conn = conectar(ruta)
            self.assertEqual(migrar(conn), 3)
            conn.close()

    def test_migracion_fallida_no_deja_esquema_parcial(self):
        with tempfile.TemporaryDirectory() as d:
            carpeta = Path(d)
            (carpeta / "001_a.sql").write_text("CREATE TABLE a (x);")
            (carpeta / "002_b.sql").write_text("CREATE TABLE b (x); CREATE TABLE a (x);")  # falla a medias
            original, bd.MIGRACIONES = bd.MIGRACIONES, carpeta
            try:
                conn = conectar(":memory:")
                with self.assertRaises(sqlite3.OperationalError):
                    migrar(conn)
                self.assertEqual(conn.execute("PRAGMA user_version").fetchone()[0], 1)
                tablas = {f[0] for f in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
                self.assertEqual(tablas, {"a"})
            finally:
                bd.MIGRACIONES = original


if __name__ == "__main__":
    unittest.main()
