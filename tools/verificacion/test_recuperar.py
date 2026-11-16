import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

from recuperar import respaldar, restaurar_en_copia


class Recuperacion(unittest.TestCase):
    def test_respaldo_con_wal_y_restauracion_aislada_sin_borrar_operaciones(self):
        with tempfile.TemporaryDirectory() as tmp:
            origen, respaldo, restaurado = [Path(tmp) / n for n in ("origen.db", "copia.db", "restaurada.db")]
            with closing(sqlite3.connect(origen)) as conn:
                conn.execute("PRAGMA journal_mode=WAL")
                conn.execute("CREATE TABLE operacion(id TEXT PRIMARY KEY)")
                conn.execute("INSERT INTO operacion VALUES ('antes')")
                conn.commit()
                resultado = respaldar(origen, respaldo)
                conn.execute("INSERT INTO operacion VALUES ('despues')")
                conn.commit()
                restaurar_en_copia(respaldo, respaldo.with_suffix(".db.manifest.json"), restaurado)
                self.assertEqual(conn.execute("SELECT COUNT(*) FROM operacion").fetchone()[0], 2)
            self.assertEqual(resultado["filas"], {"operacion": 1})
            with closing(sqlite3.connect(restaurado)) as conn:
                self.assertEqual(conn.execute("SELECT * FROM operacion").fetchall(), [("antes",)])
            with self.assertRaises(ValueError):
                respaldar(origen, restaurado)

    def test_hash_alterado_no_crea_destino(self):
        with tempfile.TemporaryDirectory() as tmp:
            origen, respaldo, destino = [Path(tmp) / n for n in ("origen.db", "copia.db", "restaurada.db")]
            with closing(sqlite3.connect(origen)) as conn:
                conn.execute("CREATE TABLE operacion(id TEXT)")
            respaldar(origen, respaldo)
            with respaldo.open("ab") as archivo:
                archivo.write(b"alterado")
            with self.assertRaises(ValueError):
                restaurar_en_copia(respaldo, respaldo.with_suffix(".db.manifest.json"), destino)
            self.assertFalse(destino.exists())
