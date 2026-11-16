CREATE TABLE transporte_respuesta (
  id TEXT PRIMARY KEY,
  reporte_id INTEGER NOT NULL UNIQUE REFERENCES reporte_cola(id),
  mensaje_id TEXT NOT NULL,
  t_real TEXT NOT NULL,
  recibido_t_real TEXT NOT NULL,
  contenido TEXT NOT NULL
);
CREATE TRIGGER transporte_respuesta_no_actualizar BEFORE UPDATE ON transporte_respuesta
BEGIN SELECT RAISE(ABORT, 'transporte_respuesta: solo adicion'); END;
CREATE TRIGGER transporte_respuesta_no_borrar BEFORE DELETE ON transporte_respuesta
BEGIN SELECT RAISE(ABORT, 'transporte_respuesta: solo adicion'); END;
