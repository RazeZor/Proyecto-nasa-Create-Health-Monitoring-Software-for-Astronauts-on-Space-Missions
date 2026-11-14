import unittest

from almacen import conectar, migrar
from almacen import lecturas as lc
from almacen import tripulacion as tr

DIA1 = "2026-11-14T00:00:00Z"
T = "2026-11-14T08:00:00Z"


class Lecturas(unittest.TestCase):
    def setUp(self):
        self.conn = conectar(":memory:")
        migrar(self.conn)
        m = tr.crear_mision(self.conn, "m", "estacion", DIA1)
        self.t = tr.crear_tripulante(self.conn, "ana", m, "astronauta")

    def test_registrar_y_leer(self):
        lc.registrar_lectura(self.conn, self.t, "spo2", 95, T)
        (f,) = lc.leer_lecturas(self.conn, self.t)
        self.assertEqual((f["valor"], f["t_mision"], f["naturaleza"], f["origen"]), (95.0, "D001T08:00:00", "Simulado", "manual"))

    def test_reenviar_no_duplica(self):
        a = lc.registrar_lectura(self.conn, self.t, "spo2", 95, T)
        b = lc.registrar_lectura(self.conn, self.t, "spo2", 95, T)
        self.assertEqual(a, b)
        self.assertEqual(len(lc.leer_lecturas(self.conn, self.t)), 1)

    def test_antes_del_vuelo(self):
        lc.registrar_lectura(self.conn, self.t, "spo2", 97, "2026-11-10T08:00:00Z")
        self.assertIsNone(lc.leer_lecturas(self.conn, self.t)[0]["t_mision"])

    def test_valor_invalido(self):
        for malo in (float("nan"), float("inf"), "abc", None, True):
            with self.assertRaises(ValueError, msg=repr(malo)):
                lc.registrar_lectura(self.conn, self.t, "spo2", malo, T)

    def test_indicador_desconocido_y_origen_invalido(self):
        with self.assertRaises(ValueError):
            lc.registrar_lectura(self.conn, self.t, "colesterol", 5, T)
        with self.assertRaises(ValueError):
            lc.registrar_lectura(self.conn, self.t, "spo2", 95, T, origen="rumor")
        self.assertEqual(lc.leer_lecturas(self.conn, self.t), [])

    def test_filtros_por_fecha_e_indicador(self):
        lc.registrar_lectura(self.conn, self.t, "spo2", 95, "2026-11-14T08:00:00Z")
        lc.registrar_lectura(self.conn, self.t, "spo2", 96, "2026-11-15T08:00:00Z")
        lc.registrar_lectura(self.conn, self.t, "glucosa", 90, "2026-11-15T08:00:00Z")
        r = lc.leer_lecturas(self.conn, self.t, indicador="spo2", desde="2026-11-15T00:00:00Z")
        self.assertEqual([f["valor"] for f in r], [96.0])
        r = lc.leer_lecturas(self.conn, self.t, hasta="2026-11-14T23:59:59Z")
        self.assertEqual(len(r), 1)

    def test_sintomas(self):
        lc.registrar_sintoma(self.conn, self.t, "cefalea", 2, T)
        (s,) = lc.leer_sintomas(self.conn, self.t)
        self.assertEqual((s["codigo"], s["gravedad"], s["t_mision"]), ("cefalea", 2, "D001T08:00:00"))
        with self.assertRaises(ValueError):
            lc.registrar_sintoma(self.conn, self.t, "cefalea", 4, T)


if __name__ == "__main__":
    unittest.main()
