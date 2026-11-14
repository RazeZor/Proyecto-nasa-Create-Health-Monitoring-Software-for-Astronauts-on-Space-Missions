import os
import tempfile
import time
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

    def test_tipos_estrictos(self):
        h = self.como(self.ana)
        for url, cuerpo in ((f"/tripulantes/{self.ana}/lecturas", {"indicador": "spo2", "valor": "97", "t_real": T}),
                            (f"/tripulantes/{self.ana}/lecturas", {"indicador": "spo2", "valor": True, "t_real": T}),
                            (f"/tripulantes/{self.ana}/reportes", {"creado_t_real": T, "retardo_min": "5"}),
                            (f"/tripulantes/{self.ana}/sintomas", {"codigo": "x", "gravedad": "2", "t_real": T})):
            self.assertEqual(self.c.post(url, headers=h, json=cuerpo).status_code, 422, cuerpo)
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/lecturas", headers=h).json(), [])

    def test_t_real_no_canonico_da_422_y_no_duplica(self):
        h, url = self.como(self.ana), f"/tripulantes/{self.ana}/lecturas"
        self.c.post(url, headers=h, json={"indicador": "spo2", "valor": 95, "t_real": "2026-11-14T10:00:00Z"})
        r = self.c.post(url, headers=h, json={"indicador": "spo2", "valor": 95, "t_real": "2026-11-14T10:0:0Z"})
        self.assertEqual(r.status_code, 422)
        self.assertEqual(len(self.c.get(url, headers=h).json()), 1)

    def test_peticiones_en_paralelo(self):
        from concurrent.futures import ThreadPoolExecutor
        h, url = self.como(self.ana), f"/tripulantes/{self.ana}/lecturas"
        with ThreadPoolExecutor(8) as pool:
            codigos = list(pool.map(lambda _: self.c.get(url, headers=h).status_code, range(40)))
        self.assertEqual(set(codigos), {200})

    def test_escalamientos_y_contexto(self):
        self.alerta()
        recibidos = self.c.get("/escalamientos", headers=self.como(self.med)).json()
        self.assertEqual([(e["tripulante_id"], e["contenido"]["tramo"]) for e in recibidos], [(self.ana, "3 puntos")])
        self.assertEqual(self.c.get("/escalamientos", headers=self.como(self.cmd)).json(), [])
        eid = recibidos[0]["id"]
        propios = self.c.get(f"/tripulantes/{self.ana}/escalamientos", headers=self.como(self.ana)).json()
        self.assertEqual(propios[0]["destinatario_id"], self.med)
        self.assertEqual(self.c.get(f"/tripulantes/{self.ana}/escalamientos", headers=self.como(self.med)).status_code, 403)
        ctx = {"texto": "estaba en ejercicio"}
        self.assertEqual(self.c.post(f"/escalamientos/{eid}/contexto", headers=self.como(self.bea), json=ctx).status_code, 403)
        self.assertEqual(self.c.post(f"/escalamientos/{eid}/contexto", headers=self.como(self.ana), json=ctx).status_code, 200)
        self.assertEqual(self.c.post(f"/escalamientos/{eid}/contexto", headers=self.como(self.ana), json=ctx).status_code, 422)
        self.assertEqual(self.c.get("/escalamientos", headers=self.como(self.med)).json()[0]["contexto_astronauta"],
                         "estaba en ejercicio")

    def test_destinatario_solo_ve_el_dato_minimo_por_http(self):
        self.alerta()
        (v,) = self.c.get(f"/tripulantes/{self.ana}/alertas", headers=self.como(self.med)).json()
        self.assertNotIn("explicacion", v)
        self.assertEqual(v["tramo"], "3 puntos")

    def estado_del_reporte(self, c, esperado, segundos=3):
        h = self.como(self.ana)
        c.post(f"/tripulantes/{self.ana}/reportes", headers=h, json={"creado_t_real": "2000-01-01T00:00:00Z", "retardo_min": 5})
        fin = time.time() + segundos
        while time.time() < fin:
            estado = c.get(f"/tripulantes/{self.ana}/reportes", headers=h).json()[0]["estado"]
            if estado == esperado:
                break
            time.sleep(0.05)
        return estado

    def test_el_reloj_entrega_los_reportes_que_ya_llegaron(self):
        os.environ["VIGIA_RELOJ_SEG"] = "0.05"
        try:
            with TestClient(main.app) as c:
                self.assertEqual(self.estado_del_reporte(c, "entregado"), "entregado")
        finally:
            del os.environ["VIGIA_RELOJ_SEG"]

    def test_el_reloj_se_apaga_con_cero(self):
        os.environ["VIGIA_RELOJ_SEG"] = "0"
        try:
            with TestClient(main.app) as c:
                self.assertEqual(self.estado_del_reporte(c, "entregado", segundos=0.5), "en_cola")
        finally:
            del os.environ["VIGIA_RELOJ_SEG"]

    def test_cors_permite_escribir_desde_la_interfaz(self):
        for metodo in ("POST", "PUT"):
            r = self.c.options("/tripulantes/1/lecturas", headers={
                "Origin": "http://localhost:3000", "Access-Control-Request-Method": metodo,
                "Access-Control-Request-Headers": "x-tripulante,content-type"})
            self.assertEqual(r.status_code, 200, metodo)
            self.assertIn(metodo, r.headers["access-control-allow-methods"])
            self.assertIn("x-tripulante", r.headers["access-control-allow-headers"].lower())

    def test_cors_acepta_el_preflight_de_red_privada(self):
        # Chrome lo manda al llamar a una IP de la red local desde otra página de la LAN
        r = self.c.options("/paneles", headers={
            "Origin": "http://192.168.1.5:3000", "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Private-Network": "true"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.headers["access-control-allow-private-network"], "true")

    def test_sintoma_desconocido_da_422(self):
        h = self.como(self.ana)
        r = self.c.post(f"/tripulantes/{self.ana}/sintomas", headers=h, json={"codigo": "headache", "gravedad": 1, "t_real": T})
        self.assertEqual(r.status_code, 422)

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
        self.assertEqual([a["indicador"] for a in vistas], ["spo2"])

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
