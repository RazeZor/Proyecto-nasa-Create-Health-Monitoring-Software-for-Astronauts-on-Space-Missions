import unittest

from almacen import cola, conectar, migrar
from almacen import tripulacion as tr

T = "2026-11-14T08:00:00Z"


class Cola(unittest.TestCase):
    def setUp(self):
        self.conn = conectar(":memory:")
        migrar(self.conn)
        m = tr.crear_mision(self.conn, "m", "estacion", "2026-11-14T00:00:00Z")
        self.t = tr.crear_tripulante(self.conn, "ana", m, "astronauta")

    def test_llega_tras_el_retardo(self):
        r = cola.encolar_reporte(self.conn, self.t, T, 10)
        (f,) = cola.leer_reportes(self.conn, self.t)
        self.assertEqual((f["id"], f["llega_t_real"], f["estado"]), (r, "2026-11-14T08:10:00Z", "en_cola"))

    def test_avanzar_cola(self):
        cola.encolar_reporte(self.conn, self.t, T, 10)
        self.assertEqual(cola.avanzar_cola(self.conn, "2026-11-14T08:09:59Z"), 0)
        self.assertEqual(cola.avanzar_cola(self.conn, "2026-11-14T08:10:00Z"), 1)
        self.assertEqual(cola.leer_reportes(self.conn, self.t)[0]["estado"], "entregado")
        self.assertEqual(cola.avanzar_cola(self.conn, "2026-11-14T09:00:00Z"), 0)

    def test_retardo_fuera_de_rango(self):
        for malo in (23, -1, -5, "10", 10.5, True):
            with self.assertRaises(ValueError, msg=repr(malo)):
                cola.encolar_reporte(self.conn, self.t, T, malo)
        self.assertEqual(cola.leer_reportes(self.conn, self.t), [])

    def test_retardo_cero_llega_al_instante(self):
        cola.encolar_reporte(self.conn, self.t, T, 0)
        self.assertEqual(cola.leer_reportes(self.conn, self.t)[0]["llega_t_real"], T)

    def test_responder_solo_tras_entregar(self):
        r = cola.encolar_reporte(self.conn, self.t, T, 10)
        with self.assertRaises(ValueError):
            cola.responder_reporte(self.conn, r, "ok", "2026-11-14T08:20:00Z")  # aún en_cola
        cola.avanzar_cola(self.conn, "2026-11-14T08:10:00Z")
        with self.assertRaises(ValueError):
            cola.responder_reporte(self.conn, r, "ok", "2026-11-14T08:05:00Z")  # antes de llegar
        cola.responder_reporte(self.conn, r, "descansa", "2026-11-14T08:20:00Z")
        f = cola.leer_reportes(self.conn, self.t)[0]
        self.assertEqual((f["estado"], f["respuesta"]), ("respondido", "descansa"))
        with self.assertRaises(ValueError):
            cola.responder_reporte(self.conn, r, "otra vez", "2026-11-14T08:30:00Z")


if __name__ == "__main__":
    unittest.main()
