import json
import sqlite3
import unittest

from almacen import alertas as al
from almacen import conectar, migrar
from almacen import tripulacion as tr

T = "2026-11-14T08:00:00Z"


class Alertas(unittest.TestCase):
    def setUp(self):
        self.conn = conectar(":memory:")
        migrar(self.conn)
        ids = tr.sembrar_demo(self.conn)
        self.ana, self.med, self.cmd = ids["astronauta"], ids["oficial_medico"], ids["comandante"]
        mision = self.conn.execute("SELECT mision_id FROM tripulante WHERE id = ?", (self.ana,)).fetchone()[0]
        self.bea = tr.crear_tripulante(self.conn, "bea", mision, "astronauta")

    def roja(self, quien, **kw):
        args = dict(indicador="spo2", capa="A", nivel="rojo", valor=90, t_real=T, explicacion="SpO2 en tramo extremo",
                    regla_version="1", tramo="3 puntos")
        return al.registrar_alerta(self.conn, quien, **{**args, **kw})

    def escalamientos(self):
        return [dict(f) for f in self.conn.execute("SELECT * FROM escalamiento")]

    def test_rojo_capa_a_escala_al_oficial_medico(self):
        self.roja(self.ana)
        (e,) = self.escalamientos()
        self.assertEqual(e["destinatario_id"], self.med)
        self.assertEqual(json.loads(e["contenido"]),
                         {"indicador": "spo2", "valor": 90.0, "t_real": T, "tramo": "3 puntos"})

    def test_si_el_afectado_es_el_oficial_va_al_comandante(self):
        self.roja(self.med)
        self.assertEqual([e["destinatario_id"] for e in self.escalamientos()], [self.cmd])

    def test_sin_consentimiento_no_escala_y_se_audita(self):
        self.conn.execute("DELETE FROM consentimiento WHERE tripulante_id = ?", (self.ana,))
        self.roja(self.ana)
        self.assertEqual(self.escalamientos(), [])
        acciones = [f["accion"] for f in self.conn.execute("SELECT accion FROM auditoria")]
        self.assertIn("escalamiento_omitido", acciones)

    def test_sin_destinatario_se_audita(self):
        m2 = tr.crear_mision(self.conn, "solo", "transito", "2026-11-14T00:00:00Z")
        sola = tr.crear_tripulante(self.conn, "sola", m2, "astronauta")
        tr.consentir(self.conn, sola, "escalamiento_rojo", T)
        self.roja(sola)
        self.assertEqual(self.escalamientos(), [])

    def test_verde_ambar_y_rojo_de_otra_capa_no_escalan(self):
        self.roja(self.ana, nivel="verde")
        self.roja(self.ana, nivel="ambar", capa="B")
        self.roja(self.ana, nivel="rojo", capa="B")
        self.assertEqual(self.escalamientos(), [])

    def test_alerta_y_auditoria_son_de_solo_adicion(self):
        a = self.roja(self.ana)
        al.anotar(self.conn, self.ana, "x", "alerta", a)
        for sql in ("UPDATE alerta SET nivel = 'verde'", "DELETE FROM alerta",
                    "UPDATE auditoria SET accion = 'y'", "DELETE FROM auditoria"):
            with self.assertRaises(sqlite3.IntegrityError, msg=sql):
                self.conn.execute(sql)

    def test_contexto_se_agrega_una_sola_vez(self):
        self.roja(self.ana)
        (e,) = self.escalamientos()
        al.agregar_contexto(self.conn, e["id"], "estaba en ejercicio")
        with self.assertRaises(sqlite3.IntegrityError):
            al.agregar_contexto(self.conn, e["id"], "otra cosa")
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute("UPDATE escalamiento SET contenido = '{}'")

    def test_visibilidad(self):
        self.roja(self.ana)
        al.registrar_alerta(self.conn, self.ana, "sueno", "B", "ambar", 4, T, "desviación", "1")
        self.assertEqual({a["nivel"] for a in al.alertas_visibles(self.conn, self.ana, self.ana)}, {"rojo", "ambar"})
        self.assertEqual([a["indicador"] for a in al.alertas_visibles(self.conn, self.med, self.ana)], ["spo2"])
        self.assertEqual(al.alertas_visibles(self.conn, self.bea, self.ana), [])
        # el comandante no es destinatario de la roja de ana
        self.assertEqual(al.alertas_visibles(self.conn, self.cmd, self.ana), [])
        acciones = [(f["actor_id"], f["accion"]) for f in self.conn.execute("SELECT actor_id, accion FROM auditoria")]
        self.assertIn((self.med, "lectura_ajena"), acciones)
        self.assertIn((self.bea, "lectura_ajena"), acciones)
        self.assertNotIn((self.ana, "lectura_ajena"), acciones)

    def test_destinatario_solo_recibe_el_dato_minimo(self):
        self.roja(self.ana)
        (v,) = al.alertas_visibles(self.conn, self.med, self.ana)
        self.assertEqual(set(v), {"escalamiento_id", "alerta_id", "tripulante_id", "indicador", "valor", "t_real", "tramo"})
        self.assertIn("explicacion", al.alertas_visibles(self.conn, self.ana, self.ana)[0])

    def test_escalamientos_recibidos_y_propios(self):
        self.roja(self.ana)
        (rec,) = al.listar_escalamientos(self.conn, destinatario_id=self.med)
        self.assertEqual((rec["tripulante_id"], rec["contenido"]["indicador"], rec["contexto_astronauta"]), (self.ana, "spo2", None))
        self.assertEqual(al.listar_escalamientos(self.conn, destinatario_id=self.cmd), [])
        self.assertEqual(len(al.listar_escalamientos(self.conn, tripulante_id=self.ana)), 1)
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM auditoria WHERE accion = 'lectura_ajena'").fetchone()[0], 0)

    def test_replace_no_elude_la_solo_adicion(self):
        a = self.roja(self.ana)
        al.anotar(self.conn, self.ana, "x", "alerta", a)
        for sql in ("INSERT OR REPLACE INTO auditoria (id, t_real, accion, entidad) VALUES (1, 'x', 'y', 'z')",
                    "INSERT OR REPLACE INTO alerta (id, tripulante_id, indicador, capa, nivel, valor, t_real, explicacion, "
                    "regla_version) VALUES (1, 1, 'spo2', 'A', 'verde', 99, 'x', 'x', '1')",
                    "INSERT OR REPLACE INTO escalamiento (id, alerta_id, destinatario_id, enviado_t_real, contenido) "
                    "VALUES (1, 1, 1, 'x', '{}')",
                    "UPDATE escalamiento SET id = id + 1000"):
            with self.assertRaises(sqlite3.IntegrityError, msg=sql):
                self.conn.execute(sql)

    def test_si_falla_el_escalamiento_no_queda_la_alerta(self):
        original, al._escalar = al._escalar, lambda *a: 1 / 0
        try:
            with self.assertRaises(ZeroDivisionError):
                self.roja(self.ana)
        finally:
            al._escalar = original
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM alerta").fetchone()[0], 0)

    def test_alerta_invalida(self):
        with self.assertRaises(ValueError):
            al.registrar_alerta(self.conn, self.ana, "spo2", "Z", "rojo", 90, T, "x", "1")
        with self.assertRaises(ValueError):
            al.registrar_alerta(self.conn, self.ana, "spo2", "A", "rojo", float("nan"), T, "x", "1")
        self.assertEqual(self.conn.execute("SELECT COUNT(*) FROM alerta").fetchone()[0], 0)


if __name__ == "__main__":
    unittest.main()
