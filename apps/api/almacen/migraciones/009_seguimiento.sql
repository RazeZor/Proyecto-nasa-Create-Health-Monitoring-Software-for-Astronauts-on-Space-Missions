CREATE TABLE episodio (
  id TEXT PRIMARY KEY,
  tripulante_id INTEGER NOT NULL REFERENCES tripulante(id),
  clave TEXT NOT NULL,
  indicador TEXT NOT NULL,
  estado TEXT NOT NULL CHECK(estado IN ('abierto','en_seguimiento','en_revision','cerrado')),
  version INTEGER NOT NULL CHECK(version > 0)
);
CREATE UNIQUE INDEX episodio_activo ON episodio(tripulante_id, clave) WHERE estado != 'cerrado';
CREATE TABLE episodio_evento (
  id TEXT PRIMARY KEY,
  episodio_id TEXT NOT NULL REFERENCES episodio(id),
  actor_id INTEGER NOT NULL REFERENCES tripulante(id),
  tipo TEXT NOT NULL,
  t_real TEXT NOT NULL,
  recibido_t_real TEXT NOT NULL,
  version INTEGER NOT NULL,
  contenido TEXT NOT NULL,
  UNIQUE(episodio_id, version)
);
CREATE TRIGGER episodio_evento_no_actualizar BEFORE UPDATE ON episodio_evento
BEGIN SELECT RAISE(ABORT, 'episodio_evento: solo adicion'); END;
CREATE TRIGGER episodio_evento_no_borrar BEFORE DELETE ON episodio_evento
BEGIN SELECT RAISE(ABORT, 'episodio_evento: solo adicion'); END;
CREATE TABLE evaluacion (
  id TEXT PRIMARY KEY,
  tripulante_id INTEGER NOT NULL REFERENCES tripulante(id),
  t_real TEXT NOT NULL,
  contenido TEXT NOT NULL
);
CREATE TRIGGER evaluacion_no_actualizar BEFORE UPDATE ON evaluacion
BEGIN SELECT RAISE(ABORT, 'evaluacion: solo adicion'); END;
CREATE TRIGGER evaluacion_no_borrar BEFORE DELETE ON evaluacion
BEGIN SELECT RAISE(ABORT, 'evaluacion: solo adicion'); END;
