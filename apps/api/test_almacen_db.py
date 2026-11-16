import sqlite3
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

import almacen.db as bd
from almacen import conectar, migrar

TABLAS = {"mision", "tripulante", "indicador", "lectura", "sintoma", "linea_base", "alerta",
          "escalamiento", "reporte_cola", "consentimiento", "auditoria", "reloj_vinculo"}


class Esquema(unittest.TestCase):
    def setUp(self):
        self.conn = conectar(":memory:")
        self.addCleanup(self.conn.close)
        migrar(self.conn)

    def test_migrar_crea_todas_las_tablas(self):
        nombres = {f[0] for f in self.conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        self.assertTrue(TABLAS <= nombres)
        self.assertEqual(self.conn.execute("PRAGMA user_version").fetchone()[0], 11)

    def test_migrar_es_idempotente(self):
        self.assertEqual(migrar(self.conn), 11)
        self.assertEqual(migrar(self.conn), 11)

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
            self.assertEqual(migrar(conn), 11)
            conn.close()

    def test_migracion_fallida_no_deja_esquema_parcial(self):
        with tempfile.TemporaryDirectory() as d:
            carpeta = Path(d)
            (carpeta / "001_a.sql").write_text("CREATE TABLE a (x);")
            (carpeta / "002_b.sql").write_text("CREATE TABLE b (x); CREATE TABLE a (x);")  # falla a medias
            original, bd.MIGRACIONES = bd.MIGRACIONES, carpeta
            try:
                conn = conectar(":memory:")
                self.addCleanup(conn.close)
                with self.assertRaises(sqlite3.OperationalError):
                    migrar(conn)
                self.assertEqual(conn.execute("PRAGMA user_version").fetchone()[0], 1)
                tablas = {f[0] for f in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
                self.assertEqual(tablas, {"a"})
            finally:
                bd.MIGRACIONES = original

    def test_version_duplicada_falla_antes_de_escribir(self):
        with tempfile.TemporaryDirectory() as d:
            carpeta = Path(d)
            for nombre in ("001_a.sql", "001_b.sql"):
                (carpeta / nombre).write_text("CREATE TABLE nueva (id);", encoding="utf-8")
            with patch.object(bd, "MIGRACIONES", carpeta):
                with self.assertRaisesRegex(ValueError, "duplicada"):
                    migrar(self.conn)
            self.assertIsNone(self.conn.execute("SELECT name FROM sqlite_master WHERE name='nueva'").fetchone())

    def test_actualizar_ambas_variantes_v4_sin_perder_datos(self):
        for con_reloj in (True, False):
            conn = conectar(":memory:")
            self.addCleanup(conn.close)
            for archivo in sorted(bd.MIGRACIONES.glob("00[123]_*.sql")):
                conn.executescript(archivo.read_text(encoding="utf-8"))
            conn.executescript("INSERT INTO mision VALUES (1, 'original', 'estacion', '2026-11-14T00:00:00Z'); "
                               "INSERT INTO tripulante VALUES (1, 'ana', 1, 'astronauta');")
            if con_reloj:
                conn.executescript((bd.MIGRACIONES / "004_reloj_vinculo.sql").read_text(encoding="utf-8"))
                conn.execute("INSERT INTO reloj_vinculo VALUES ('mi reloj', 1, '2026-11-14T00:00:00Z')")
            else:
                conn.executescript("CREATE TABLE cuenta (id INTEGER PRIMARY KEY, dato TEXT); INSERT INTO cuenta VALUES (7, 'conservar');")
            conn.execute("PRAGMA user_version = 4")
            conn.commit()
            self.assertEqual(migrar(conn), 11)
            self.assertEqual(migrar(conn), 11)
            self.assertEqual(conn.execute("SELECT alias FROM tripulante").fetchone()[0], "ana")
            if con_reloj:
                self.assertEqual(conn.execute("SELECT nombre FROM reloj_vinculo").fetchone()[0], "mi reloj")
            else:
                self.assertEqual(conn.execute("SELECT dato FROM cuenta").fetchone()[0], "conservar")
                self.assertEqual(conn.execute("SELECT count(*) FROM reloj_vinculo").fetchone()[0], 0)
            self.assertEqual(conn.execute("PRAGMA integrity_check").fetchone()[0], "ok")


if __name__ == "__main__":
    unittest.main()
