-- Esquema inicial (docs/superpowers/specs/2026-11-14-base-datos-local-design.md).
-- Horas en UTC ISO 8601; t_mision tiene la forma D022T00:05:00 y es NULL antes del día 1.
CREATE TABLE mision (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  perfil TEXT NOT NULL CHECK (perfil IN ('estacion', 'transito', 'superficie')),
  dia1_t_real TEXT NOT NULL
);

CREATE TABLE tripulante (
  id INTEGER PRIMARY KEY,
  alias TEXT NOT NULL,
  mision_id INTEGER NOT NULL REFERENCES mision (id),
  rol TEXT NOT NULL CHECK (rol IN ('astronauta', 'oficial_medico', 'comandante')),
  UNIQUE (mision_id, alias)
);

CREATE TABLE indicador (
  id TEXT PRIMARY KEY,
  unidad TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('fisiologico', 'conductual')),
  frecuencia TEXT NOT NULL CHECK (frecuencia IN ('diaria', 'semanal')),
  capas TEXT NOT NULL DEFAULT ''
);
INSERT INTO indicador (id, unidad, tipo, frecuencia, capas) VALUES
  ('presion_arterial_sistolica', 'mmHg', 'fisiologico', 'diaria', 'A,B'),
  ('spo2', '%', 'fisiologico', 'diaria', 'A'),
  ('temperatura_central', '°C', 'fisiologico', 'diaria', 'A'),
  ('frecuencia_cardiaca_reposo', 'lpm', 'fisiologico', 'diaria', 'A,B,C'),
  ('sueno', 'h', 'conductual', 'diaria', 'B,C'),
  ('estado_animo', 'puntos', 'conductual', 'diaria', 'B,C'),
  ('glucosa', 'mg/dL', 'fisiologico', 'semanal', 'B'),
  ('masa_corporal', 'kg', 'fisiologico', 'semanal', '');

CREATE TABLE lectura (
  id INTEGER PRIMARY KEY,
  tripulante_id INTEGER NOT NULL REFERENCES tripulante (id),
  indicador TEXT NOT NULL REFERENCES indicador (id),
  valor REAL NOT NULL,
  t_real TEXT NOT NULL,
  t_mision TEXT,
  origen TEXT NOT NULL CHECK (origen IN ('manual', 'sensor', 'simulado')),
  metodo TEXT,
  naturaleza TEXT NOT NULL CHECK (naturaleza IN ('Real', 'Simulado')),
  UNIQUE (tripulante_id, indicador, t_real, origen)
);

CREATE TABLE sintoma (
  id INTEGER PRIMARY KEY,
  tripulante_id INTEGER NOT NULL REFERENCES tripulante (id),
  t_real TEXT NOT NULL,
  t_mision TEXT,
  codigo TEXT NOT NULL,
  gravedad INTEGER NOT NULL CHECK (gravedad BETWEEN 1 AND 3)
);

CREATE TABLE linea_base (
  tripulante_id INTEGER NOT NULL REFERENCES tripulante (id),
  indicador TEXT NOT NULL REFERENCES indicador (id),
  origen TEXT NOT NULL CHECK (origen IN ('tierra', 'vuelo')),
  mediana REAL NOT NULL,
  mad REAL NOT NULL CHECK (mad >= 0),
  n INTEGER NOT NULL CHECK (n > 0),
  desde TEXT NOT NULL,
  hasta TEXT NOT NULL,
  PRIMARY KEY (tripulante_id, indicador, origen)
);

CREATE TABLE alerta (
  id INTEGER PRIMARY KEY,
  tripulante_id INTEGER NOT NULL REFERENCES tripulante (id),
  indicador TEXT NOT NULL REFERENCES indicador (id),
  capa TEXT NOT NULL CHECK (capa IN ('A', 'B', 'C', 'contexto')),
  nivel TEXT NOT NULL CHECK (nivel IN ('verde', 'ambar', 'rojo')),
  valor REAL NOT NULL,
  t_real TEXT NOT NULL,
  t_mision TEXT,
  explicacion TEXT NOT NULL,
  tramo TEXT,
  regla_version TEXT NOT NULL
);

CREATE TABLE escalamiento (
  id INTEGER PRIMARY KEY,
  alerta_id INTEGER NOT NULL REFERENCES alerta (id),
  destinatario_id INTEGER NOT NULL REFERENCES tripulante (id),
  enviado_t_real TEXT NOT NULL,
  contenido TEXT NOT NULL,
  contexto_astronauta TEXT
);

CREATE TABLE reporte_cola (
  id INTEGER PRIMARY KEY,
  tripulante_id INTEGER NOT NULL REFERENCES tripulante (id),
  creado_t_real TEXT NOT NULL,
  retardo_min INTEGER NOT NULL CHECK (retardo_min BETWEEN 3 AND 22),
  llega_t_real TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'en_cola' CHECK (estado IN ('en_cola', 'entregado', 'respondido')),
  respuesta TEXT
);

CREATE TABLE consentimiento (
  tripulante_id INTEGER NOT NULL REFERENCES tripulante (id),
  regla TEXT NOT NULL,
  aceptado_t_real TEXT NOT NULL,
  PRIMARY KEY (tripulante_id, regla)
);

CREATE TABLE auditoria (
  id INTEGER PRIMARY KEY,
  t_real TEXT NOT NULL,
  actor_id INTEGER,
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id INTEGER,
  detalle TEXT
);

-- Registros de solo adición: nunca se actualizan ni se borran.
CREATE TRIGGER alerta_sin_update BEFORE UPDATE ON alerta BEGIN SELECT RAISE(ABORT, 'alerta es de solo adición'); END;
CREATE TRIGGER alerta_sin_delete BEFORE DELETE ON alerta BEGIN SELECT RAISE(ABORT, 'alerta es de solo adición'); END;
CREATE TRIGGER auditoria_sin_update BEFORE UPDATE ON auditoria BEGIN SELECT RAISE(ABORT, 'auditoria es de solo adición'); END;
CREATE TRIGGER auditoria_sin_delete BEFORE DELETE ON auditoria BEGIN SELECT RAISE(ABORT, 'auditoria es de solo adición'); END;
CREATE TRIGGER escalamiento_sin_delete BEFORE DELETE ON escalamiento BEGIN SELECT RAISE(ABORT, 'escalamiento es de solo adición'); END;
-- En un escalamiento solo se puede añadir, una vez, el contexto del astronauta.
CREATE TRIGGER escalamiento_solo_contexto BEFORE UPDATE ON escalamiento
WHEN OLD.contexto_astronauta IS NOT NULL OR NEW.contenido IS NOT OLD.contenido OR NEW.alerta_id IS NOT OLD.alerta_id
  OR NEW.destinatario_id IS NOT OLD.destinatario_id OR NEW.enviado_t_real IS NOT OLD.enviado_t_real
BEGIN SELECT RAISE(ABORT, 'escalamiento es de solo adición'); END;
