-- Nombres propios para no reutilizar tablas experimentales de otra rama.
CREATE TABLE identidad_cuenta (
  id INTEGER PRIMARY KEY,
  usuario TEXT NOT NULL UNIQUE,
  tripulante_id INTEGER NOT NULL REFERENCES tripulante(id),
  rol TEXT NOT NULL CHECK(rol IN ('astronaut','cmo','surgeon')),
  sal TEXT NOT NULL,
  clave_hash TEXT NOT NULL,
  activa INTEGER NOT NULL DEFAULT 1 CHECK(activa IN (0,1))
);
CREATE TABLE identidad_sesion (
  token_hash TEXT PRIMARY KEY,
  cuenta_id INTEGER NOT NULL REFERENCES identidad_cuenta(id),
  csrf_hash TEXT NOT NULL,
  creada_t_real TEXT NOT NULL,
  vence_t_real TEXT NOT NULL,
  revocada INTEGER NOT NULL DEFAULT 0 CHECK(revocada IN (0,1))
);
CREATE TABLE identidad_intento (
  clave TEXT PRIMARY KEY,
  fallos INTEGER NOT NULL,
  hasta_t_real TEXT NOT NULL
);
