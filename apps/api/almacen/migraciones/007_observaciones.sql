-- La observación conserva cada toma; lectura sigue siendo la proyección compatible.
CREATE TABLE observacion (
  id TEXT PRIMARY KEY,
  tripulante_id INTEGER NOT NULL REFERENCES tripulante(id),
  mision_id INTEGER NOT NULL REFERENCES mision(id),
  operacion_id TEXT NOT NULL,
  indicador TEXT NOT NULL REFERENCES indicador(id),
  valor REAL NOT NULL,
  unidad TEXT NOT NULL,
  t_real TEXT,
  recibido_t_real TEXT,
  precision_tiempo TEXT NOT NULL CHECK(precision_tiempo IN ('segundo','declarada','desconocida')),
  origen TEXT NOT NULL,
  metodo TEXT,
  instrumento TEXT,
  sitio TEXT,
  uso TEXT NOT NULL CHECK(uso IN ('operativo','referencia','escenario')),
  perfil TEXT NOT NULL,
  configuracion_version TEXT NOT NULL,
  comparable INTEGER NOT NULL CHECK(comparable IN (0,1)),
  corrige_id TEXT REFERENCES observacion(id),
  lectura_id INTEGER REFERENCES lectura(id),
  contenido TEXT NOT NULL,
  UNIQUE(tripulante_id, operacion_id)
);
CREATE INDEX observacion_sujeto_tiempo ON observacion(tripulante_id, t_real, indicador);
INSERT INTO observacion
SELECT 'legado:' || l.id, l.tripulante_id, t.mision_id, 'legado:' || l.id, l.indicador, l.valor,
       i.unidad, l.t_real, NULL, 'declarada', l.origen, l.metodo, NULL, NULL,
       CASE WHEN l.naturaleza = 'Real' THEN 'operativo' ELSE 'escenario' END,
       m.perfil, 'legado-no-caracterizado', 0, NULL, l.id, '{}'
FROM lectura l JOIN indicador i ON i.id = l.indicador
JOIN tripulante t ON t.id = l.tripulante_id JOIN mision m ON m.id = t.mision_id;
CREATE TRIGGER observacion_no_actualizar BEFORE UPDATE ON observacion
BEGIN SELECT RAISE(ABORT, 'observacion: solo adicion'); END;
CREATE TRIGGER observacion_no_borrar BEFORE DELETE ON observacion
BEGIN SELECT RAISE(ABORT, 'observacion: solo adicion'); END;
