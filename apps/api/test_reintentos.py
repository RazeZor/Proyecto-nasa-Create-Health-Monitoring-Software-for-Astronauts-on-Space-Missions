"""Reintentos tras perder un acuse: mismos ids, propietario separado y conflictos visibles."""
import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from almacen import cola, conectar, lecturas, migrar, tripulacion
from main import app

T = "2026-11-14T08:00:00Z"


class Reintentos(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.ruta = Path(self.tmp.name) / "test.db"
        self.conn = conectar(self.ruta)
        self.addCleanup(self.conn.close)
        migrar(self.conn)
        mision = tripulacion.crear_mision(self.conn, "m", "estacion", "2026-11-14T00:00:00Z")
        self.a = tripulacion.crear_tripulante(self.conn, "a", mision, "astronauta")
        self.b = tripulacion.crear_tripulante(self.conn, "b", mision, "astronauta")

    def test_reintento_parcial_del_registro_no_duplica_sintomas(self):
        datos = (self.conn, self.a, "cefalea", 1, T)
        primero = lecturas.registrar_sintoma(*datos, operacion_id="registro-1:cefalea")
        self.assertEqual(lecturas.registrar_sintoma(*datos, operacion_id="registro-1:cefalea"), primero)
        self.assertNotEqual(lecturas.registrar_sintoma(self.conn, self.b, "cefalea", 1, T,
                                                     operacion_id="registro-1:cefalea"), primero)
        self.assertEqual(len(lecturas.leer_sintomas(self.conn, self.a)), 1)

    def test_informe_reintentado_tras_respuesta_conserva_estado_y_contenido(self):
        datos = (self.conn, self.a, T, 0)
        primero = cola.encolar_reporte(*datos, {"b": 2, "a": 1}, operacion_id="informe-1")
        cola.avanzar_cola(self.conn, T)
        cola.responder_reporte(self.conn, primero, "recibido", T)
        self.assertEqual(cola.encolar_reporte(*datos, {"a": 1, "b": 2}, operacion_id="informe-1"), primero)
        (informe,) = cola.leer_reportes(self.conn, self.a)
        self.assertEqual((informe["estado"], informe["respuesta"]), ("respondido", "recibido"))

    def test_reintentos_concurrentes_crean_un_solo_informe(self):
        def enviar(_):
            conn = conectar(self.ruta)
            try:
                return cola.encolar_reporte(conn, self.a, T, 1, {"titulo": "uno"}, operacion_id="informe-2")
            finally:
                conn.close()
        with ThreadPoolExecutor(max_workers=6) as ejecutor:
            ids = list(ejecutor.map(enviar, range(12)))
        self.assertEqual(len(set(ids)), 1)
        self.assertEqual(len(cola.leer_reportes(self.conn, self.a)), 1)

    def test_conflictos_http_no_sobrescriben_ni_crean_filas(self):
        with patch.dict(os.environ, {"VIGIA_DB": str(self.ruta)}):
            cliente = TestClient(app)
            self.addCleanup(cliente.close)
            for recurso, contenido in (
                ("reportes", {"creado_t_real": T, "retardo_min": 1, "contenido": {"titulo": "uno"}}),
                ("sintomas", {"t_real": T, "codigo": "cefalea", "gravedad": 1}),
            ):
                ruta = f"/tripulantes/{self.a}/{recurso}"
                cuerpo = {**contenido, "operacion_id": "misma-operacion"}
                cabecera = {"X-Tripulante": str(self.a)}
                primera = cliente.post(ruta, headers=cabecera, json=cuerpo)
                self.assertEqual(primera.status_code, 201)
                self.assertEqual(cliente.post(ruta, headers=cabecera, json=cuerpo).json(), primera.json())
                distinto = {**cuerpo, **({"retardo_min": 2} if recurso == "reportes" else {"gravedad": 2})}
                self.assertEqual(cliente.post(ruta, headers=cabecera, json=distinto).status_code, 409)
                self.assertEqual(cliente.post(ruta, headers={"X-Tripulante": str(self.b)}, json=cuerpo).status_code, 403)
            self.assertEqual(len(cola.leer_reportes(self.conn, self.a)), 1)
            self.assertEqual(len(lecturas.leer_sintomas(self.conn, self.a)), 1)
