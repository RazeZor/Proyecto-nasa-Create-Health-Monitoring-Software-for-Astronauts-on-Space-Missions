-- Retardo de 0 a 22 min (estación y superficie lunar no tienen retardo apreciable) y presión diastólica.
-- SQLite no cambia un CHECK: se reconstruye reporte_cola (ninguna otra tabla la referencia).
CREATE TABLE reporte_cola_nueva (
  id INTEGER PRIMARY KEY,
  tripulante_id INTEGER NOT NULL REFERENCES tripulante (id),
  creado_t_real TEXT NOT NULL,
  retardo_min INTEGER NOT NULL CHECK (retardo_min BETWEEN 0 AND 22),
  llega_t_real TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'en_cola' CHECK (estado IN ('en_cola', 'entregado', 'respondido')),
  respuesta TEXT
);
INSERT INTO reporte_cola_nueva SELECT * FROM reporte_cola;
DROP TABLE reporte_cola;
ALTER TABLE reporte_cola_nueva RENAME TO reporte_cola;

INSERT INTO indicador (id, unidad, tipo, frecuencia, capas) VALUES
  ('presion_arterial_diastolica', 'mmHg', 'fisiologico', 'diaria', '');
