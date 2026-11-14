import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import main
from almacen import cola, conectar, migrar
from almacen import tripulacion as tr

T = "2026-11-14T08:00:00Z"


class Dashboard(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["VIGIA_DB"] = str(Path(self.tmp.name) / "vigia.db")
        conn = conectar()
        migrar(conn)
        self.ids = tr.sembrar_demo(conn)
        self.ana, self.med = self.ids["astronauta"], self.ids["oficial_medico"]
        conn.close()
        self.c = TestClient(main.app)
        self.h = {"X-Tripulante": str(self.ana)}

    def tearDown(self):
        del os.environ["VIGIA_DB"]
        self.tmp.cleanup()

    def test_fichas_lista_y_una(self):
        fichas = self.c.get("/fichas").json()
        self.assertIn("spo2", [f["id"] for f in fichas])
        self.assertNotIn("index", [f["id"] for f in fichas])
        self.assertEqual(self.c.get("/fichas/spo2").json()["id"], "spo2")
        self.assertEqual(self.c.get("/fichas/no-existe").status_code, 404)
        self.assertEqual(self.c.get("/fichas/..%2Fperfiles").status_code, 404)  # sin rutas arbitrarias

    def test_referencia_de_entorno(self):
        r = self.c.get("/entorno/referencia").json()
        self.assertEqual((r["limite_carrera_msv"], r["co2_limite_mmhg"], r["umbral_protones_pfu"]), (600, 3, 10))
        self.assertEqual({f["id"] for f in r["fuentes"]}, {"radlab", "eda", "donki", "goes"})
        self.assertEqual(r["naturaleza_dosis_previa"], "Simulado")

    def test_historial_propio_es_el_caso_de_referencia_simulado(self):
        r = self.c.get(f"/tripulantes/{self.ana}/historial", headers=self.h)
        self.assertEqual(r.status_code, 200)
        h = r.json()
        self.assertEqual((h["naturaleza"], h["dias_vuelo"], h["dia_actual"]), ("Simulado", 30, 24))
        self.assertEqual(len(h["lecturas"]), 44)  # 14 de prevuelo + 30 de vuelo
        self.assertEqual(len(h["entorno_diario"]), 30)

    def test_historial_y_demo_ajenos_dan_403(self):
        for ruta in ("historial", "recordatorios", "mensajes"):
            self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/{ruta}", headers={"X-Tripulante": str(self.med)}).status_code, 403, ruta)
            self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/{ruta}").status_code, 401, ruta)

    def test_recordatorios_y_mensajes(self):
        rec = self.c.get(f"/tripulantes/{self.ana}/recordatorios", headers=self.h).json()
        self.assertTrue(rec and all(isinstance(x, str) for x in rec))
        msj = self.c.get(f"/tripulantes/{self.ana}/mensajes", headers=self.h).json()
        self.assertTrue(msj)
        self.assertEqual(set(msj[0]), {"id", "de", "autor", "dia", "hora", "texto"})

    def test_mensajes_incluyen_las_respuestas_reales_de_tierra(self):
        conn = conectar()
        rid = cola.encolar_reporte(conn, self.ana, T, 0)
        cola.avanzar_cola(conn, T)
        cola.responder_reporte(conn, rid, "Recibido, sigue el protocolo.", T)
        conn.close()
        textos = [m["texto"] for m in self.c.get(f"/tripulantes/{self.ana}/mensajes", headers=self.h).json()]
        self.assertIn("Recibido, sigue el protocolo.", textos)

    def test_reporte_guarda_y_devuelve_su_contenido(self):
        contenido = {"titulo": "Informe diario · Día 24", "resumen": "Ámbar", "lectura": "FC 70 lpm"}
        r = self.c.post(f"/tripulantes/{self.ana}/reportes", headers=self.h,
                        json={"creado_t_real": T, "retardo_min": 1, "contenido": contenido})
        self.assertEqual(r.status_code, 201)
        (f,) = self.c.get(f"/tripulantes/{self.ana}/reportes", headers=self.h).json()
        self.assertEqual(f["contenido"], contenido)

    def test_reporte_sin_contenido_sigue_valiendo(self):
        self.c.post(f"/tripulantes/{self.ana}/reportes", headers=self.h, json={"creado_t_real": T, "retardo_min": 1})
        (f,) = self.c.get(f"/tripulantes/{self.ana}/reportes", headers=self.h).json()
        self.assertIsNone(f["contenido"])

    def test_sembrar_informes_demo_es_idempotente(self):
        conn = conectar()
        tr.sembrar_informes_demo(conn, self.ids)
        tr.sembrar_informes_demo(conn, self.ids)
        (f,) = cola.leer_reportes(conn, self.ana)
        conn.close()
        self.assertEqual((f["estado"], f["contenido"]["titulo"]), ("respondido", "Informe diario · Día 23"))


if __name__ == "__main__":
    unittest.main()
