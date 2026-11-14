-- El contenido del informe (título, resumen, lectura...) vive en el servidor: la app solo conoce la API.
ALTER TABLE reporte_cola ADD COLUMN contenido TEXT;
