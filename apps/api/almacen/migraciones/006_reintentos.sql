-- Una operación estable por informe o síntoma. NULL conserva compatibilidad con clientes anteriores.
ALTER TABLE reporte_cola ADD COLUMN operacion_id TEXT;
CREATE UNIQUE INDEX reporte_operacion ON reporte_cola (tripulante_id, operacion_id);
ALTER TABLE sintoma ADD COLUMN operacion_id TEXT;
CREATE UNIQUE INDEX sintoma_operacion ON sintoma (tripulante_id, operacion_id);
