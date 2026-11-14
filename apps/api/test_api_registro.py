import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import main
from almacen import conectar, migrar
from almacen import tripulacion as tr
from i18n import t

T = "2026-11-14T08:00:00Z"


class Registro(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["VIGIA_DB"] = str(Path(self.tmp.name) / "vigia.db")
        conn = conectar()
        migrar(conn)
        self.ids = tr.sembrar_demo(conn)
        self.ana, self.med, self.cmd = (self.ids[k] for k in ("astronauta", "oficial_medico", "comandante"))
        self.bea = tr.crear_tripulante(conn, "bea", conn.execute("SELECT mision_id FROM tripulante WHERE id = ?",
                                                                (self.ana,)).fetchone()[0], "astronauta")
        conn.close()
        self.c = TestClient(main.app)

    def tearDown(self):
        del os.environ["VIGIA_DB"]
        self.tmp.cleanup()

    def como(self, id_):
        return {"X-Tripulante": str(id_)}

    def alerta(self, nivel="rojo", capa="A", indicador="spo2"):
        return self.c.post(f"/tripulantes/{self.ana}/alertas", headers=self.como(self.ana), json={
            "indicador": indicador, "capa": capa, "nivel": nivel, "valor": 90, "t_real": T,
            "explicacion": "tramo extremo", "regla_version": "1", "tramo": "3 puntos"})

    def test_sin_cabecera_o_actor_inexistente_da_401(self):
        url = f"/tripulantes/{self.ana}/lecturas"
        self.assertEqual(self.c.get(url).status_code, 401)
        self.assertEqual(self.c.get(url, headers=self.como(999)).status_code, 401)
        self.assertEqual(self.c.get(url, headers={"X-Tripulante": "abc"}).status_code, 401)

    def test_escribir_o_leer_datos_de_otro_da_403_con_mensaje_i18n(self):
        r = self.c.post(f"/tripulantes/{self.ana}/lecturas", headers=self.como(self.bea),
                        json={"indicador": "spo2", "valor": 95, "t_real": T})
        self.assertEqual((r.status_code, r.json()["detail"]), (403, t("api.error.sin_permiso")))
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/lecturas", headers=self.como(self.med)).status_code, 403)

    def test_lectura_ida_y_vuelta(self):
        r = self.c.post(f"/tripulantes/{self.ana}/lecturas", headers=self.como(self.ana),
                        json={"indicador": "spo2", "valor": 95, "t_real": T})
        self.assertEqual(r.status_code, 201)
        (f,) = self.c.get(f"/tripulantes/{self.ana}/lecturas", headers=self.como(self.ana),
                          params={"indicador": "spo2"}).json()
        self.assertEqual((f["id"], f["valor"], f["t_mision"]), (r.json()["id"], 95.0, "D001T08:00:00"))

    def test_lectura_invalida_da_422(self):
        for cuerpo in ({"indicador": "spo2", "valor": "abc", "t_real": T},
                       {"indicador": "colesterol", "valor": 5, "t_real": T},
                       {"indicador": "spo2", "valor": 95, "t_real": "ayer"}):
            r = self.c.post(f"/tripulantes/{self.ana}/lecturas", headers=self.como(self.ana), json=cuerpo)
            self.assertEqual(r.status_code, 422, cuerpo)

    def test_sintomas_y_linea_base(self):
        h = self.como(self.ana)
        self.assertEqual(self.c.post(f"/tripulantes/{self.ana}/sintomas", headers=h,
                                     json={"codigo": "cefalea", "gravedad": 2, "t_real": T}).status_code, 201)
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/sintomas", headers=h).json()[0]["codigo"], "cefalea")
        url = f"/tripulantes/{self.ana}/linea-base/sueno/tierra"
        r = self.c.get(url, headers=h)
        self.assertEqual((r.status_code, r.json()["detail"]), (404, t("api.error.linea_base_no_existe")))
        cuerpo = {"mediana": 7, "mad": 0.5, "n": 14, "desde": "2026-10-31T00:00:00Z", "hasta": "2026-11-13T00:00:00Z"}
        self.assertEqual(self.c.put(url, headers=h, json=cuerpo).status_code, 200)
        self.assertEqual(self.c.get(url, headers=h).json()["mediana"], 7)

    def test_alerta_roja_devuelve_escalamiento_y_el_oficial_la_ve(self):
        r = self.alerta()
        self.assertEqual(r.status_code, 201)
        self.assertIsNotNone(r.json()["escalamiento_id"])
        vistas = self.c.get(f"/tripulantes/{self.ana}/alertas", headers=self.como(self.med)).json()
        self.assertEqual([a["nivel"] for a in vistas], ["rojo"])

    def test_un_tercero_no_ve_la_ambar(self):
        self.assertIsNone(self.alerta("ambar", "B", "sueno").json()["escalamiento_id"])
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/alertas", headers=self.como(self.bea)).json(), [])
        self.assertEqual(len(self.c.get(f"/tripulantes/{self.ana}/alertas", headers=self.como(self.ana)).json()), 1)

    def test_reporte_y_respuesta_tras_avanzar_la_cola(self):
        h = self.como(self.ana)
        r = self.c.post(f"/tripulantes/{self.ana}/reportes", headers=h, json={"creado_t_real": T, "retardo_min": 10})
        self.assertEqual(r.status_code, 201)
        rid = r.json()["id"]
        resp = {"respuesta": "descansa", "t_real": "2026-11-14T08:20:00Z"}
        self.assertEqual(self.c.post(f"/reportes/{rid}/respuesta", headers=self.como(self.med), json=resp).status_code, 422)
        self.assertEqual(self.c.post("/reportes/avanzar", headers=h, json={"ahora": "2026-11-14T08:10:00Z"}).json(),
                         {"entregados": 1})
        self.assertEqual(self.c.post(f"/reportes/{rid}/respuesta", headers=self.como(self.med), json=resp).status_code, 200)
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/reportes", headers=h).json()[0]["estado"], "respondido")


if __name__ == "__main__":
    unittest.main()
