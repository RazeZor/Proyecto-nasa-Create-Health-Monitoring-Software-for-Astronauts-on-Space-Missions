"""Un receptor reiniciado conserva acuses y detecta colisiones."""
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

import receptor


class Receptor(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        entorno = patch.dict(os.environ, {"VIGIA_TIERRA_DB": str(Path(self.tmp.name) / "destino.db"), "VIGIA_TIERRA_CLAVE": "x" * 40,
                                          "VIGIA_TIERRA_OPERADOR_CLAVE": "y" * 40})
        entorno.start()
        self.addCleanup(entorno.stop)
        self.headers = {"Authorization": "Bearer " + "x" * 40}
        self.mensaje = {"version": "mensaje-v1", "id": "mision:informe:1", "creado_t_real": "2026-11-14T08:00:00Z", "contenido": {"titulo": "Ensayo"}}

    def test_persistir_repetir_y_reiniciar(self):
        with TestClient(receptor.app) as c:
            primero = c.post("/mensajes", json=self.mensaje, headers=self.headers)
            self.assertEqual(primero.status_code, 200)
            self.assertEqual(c.post("/mensajes", json=self.mensaje, headers=self.headers).json(), primero.json())
        with TestClient(receptor.app) as otro:
            self.assertEqual(otro.get("/mensajes/mision:informe:1", headers=self.headers).json(), primero.json())

    def test_colision_y_sin_credencial(self):
        with TestClient(receptor.app) as c:
            self.assertEqual(c.post("/mensajes", json=self.mensaje).status_code, 401)
            self.assertEqual(c.post("/mensajes", json=self.mensaje, headers=self.headers).status_code, 200)
            distinto = {**self.mensaje, "contenido": {"titulo": "Otro contenido"}}
            self.assertEqual(c.post("/mensajes", json=distinto, headers=self.headers).status_code, 409)

    def test_respuesta_requiere_operador_y_mensaje_recibido(self):
        with TestClient(receptor.app) as c:
            respuesta = {"id": "respuesta-1", "t_real": "2026-11-14T09:00:00Z", "texto": "Recibido para revisión"}
            ruta = "/mensajes/mision:informe:1/respuestas"
            operador = {"Authorization": "Bearer " + "y" * 40}
            self.assertEqual(c.post(ruta, json=respuesta, headers=self.headers).status_code, 403)
            self.assertEqual(c.post(ruta, json=respuesta, headers=operador).status_code, 404)
            c.post("/mensajes", json=self.mensaje, headers=self.headers)
            self.assertEqual(c.post(ruta, json=respuesta, headers=operador).status_code, 200)
            self.assertEqual(c.post(ruta, json=respuesta, headers=operador).status_code, 200)
            consulta = c.get("/mensajes/mision:informe:1", headers=self.headers).json()
            self.assertEqual(consulta["respuesta"]["en_respuesta_a"], self.mensaje["id"])
