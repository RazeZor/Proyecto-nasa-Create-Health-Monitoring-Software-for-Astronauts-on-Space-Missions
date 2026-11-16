-- Algunas bases v4 aplicaron la migración de cuentas de otra rama en lugar de la del reloj.
-- Conservar cuentas y vínculos existentes; no activar ni modificar autenticación experimental.
CREATE TABLE IF NOT EXISTS reloj_vinculo (
  nombre TEXT PRIMARY KEY,
  tripulante_id INTEGER NOT NULL REFERENCES tripulante (id),
  t_real TEXT NOT NULL
);
