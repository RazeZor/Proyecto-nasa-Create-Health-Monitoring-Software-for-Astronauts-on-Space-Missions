-- Vínculo explícito entre el nombre configurado en un reloj y un tripulante (puente_reloj.py).
-- Complementa a SMART_TRIPULANTES: lo crea la propia persona desde la app («este es mi reloj»).
CREATE TABLE reloj_vinculo (
  nombre TEXT PRIMARY KEY,
  tripulante_id INTEGER NOT NULL REFERENCES tripulante (id),
  t_real TEXT NOT NULL
);
