CREATE TABLE transporte_instancia (id INTEGER PRIMARY KEY CHECK(id = 1), identificador TEXT NOT NULL UNIQUE);
CREATE TABLE transporte_acuse (
  reporte_id INTEGER PRIMARY KEY REFERENCES reporte_cola(id),
  mensaje_id TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  t_real TEXT NOT NULL
);
CREATE TRIGGER transporte_acuse_no_actualizar BEFORE UPDATE ON transporte_acuse
BEGIN SELECT RAISE(ABORT, 'transporte_acuse: solo adicion'); END;
CREATE TRIGGER transporte_acuse_no_borrar BEFORE DELETE ON transporte_acuse
BEGIN SELECT RAISE(ABORT, 'transporte_acuse: solo adicion'); END;
