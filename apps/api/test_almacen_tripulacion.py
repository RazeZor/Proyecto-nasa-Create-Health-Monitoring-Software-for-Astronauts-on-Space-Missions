import unittest

from almacen import conectar, migrar
from almacen import tripulacion as tr

DIA1 = "2026-11-14T00:00:00Z"


class Tripulacion(unittest.TestCase):
    def setUp(self):
        self.conn = conectar(":memory:")
        migrar(self.conn)
        self.mision = tr.crear_mision(self.conn, "m1", "estacion", DIA1)
        self.t = tr.crear_tripulante(self.conn, "ana", self.mision, "astronauta")

    def test_t_mision_y_dia_de_vuelo(self):
        self.assertEqual(tr.t_mision(self.conn, self.t, "2026-11-15T00:05:00Z"), "D002T00:05:00")
        self.assertEqual(tr.dia_de_vuelo(self.conn, self.t, "2026-11-15T00:05:00Z"), 2)
        self.assertEqual(tr.t_mision(self.conn, self.t, DIA1), "D001T00:00:00")

    def test_antes_del_vuelo_no_tiene_t_mision(self):
        self.assertIsNone(tr.t_mision(self.conn, self.t, "2026-11-10T08:00:00Z"))
        self.assertIsNone(tr.dia_de_vuelo(self.conn, self.t, "2026-11-10T08:00:00Z"))

    def test_t_real_con_formato_invalido(self):
        for malo in ("2026-11-14 00:00", "2026-11-14T00:00:00+01:00", "", None):
            with self.assertRaises(ValueError):
                tr.t_mision(self.conn, self.t, malo)

    def test_rol_y_perfil_invalidos(self):
        with self.assertRaises(ValueError):
            tr.crear_tripulante(self.conn, "x", self.mision, "piloto")
        with self.assertRaises(ValueError):
            tr.crear_mision(self.conn, "m2", "luna", DIA1)

    def test_consentimiento(self):
        self.assertFalse(tr.tiene_consentimiento(self.conn, self.t, "escalamiento_rojo"))
        tr.consentir(self.conn, self.t, "escalamiento_rojo", DIA1)
        self.assertTrue(tr.tiene_consentimiento(self.conn, self.t, "escalamiento_rojo"))

    def test_tripulante_inexistente(self):
        with self.assertRaises(ValueError):
            tr.t_mision(self.conn, 999, DIA1)

    def test_sembrar_demo_es_idempotente(self):
        a, b = tr.sembrar_demo(self.conn), tr.sembrar_demo(self.conn)
        self.assertEqual(a, b)
        self.assertEqual(set(a), {"astronauta", "oficial_medico", "comandante"})
        for id_ in a.values():
            self.assertTrue(tr.tiene_consentimiento(self.conn, id_, "escalamiento_rojo"))


if __name__ == "__main__":
    unittest.main()
