-- Registro de versión 1.3.0 en system_versions (idempotente)
SELECT setval(
  pg_get_serial_sequence('system_versions', 'id'),
  COALESCE((SELECT MAX(id) FROM system_versions), 0)
);

INSERT INTO system_versions (version, titulo, descripcion, tipo)
SELECT
  '1.3.0',
  'Registro de pagos en suscripciones',
  'Botón para registrar pago y avanzar la fecha de corte 1 a 24 meses conservando el día del mes. Atajo +1 mes en listado. Endpoint POST /api/suscripciones/:id/registrar-pago.',
  'minor'
WHERE NOT EXISTS (
  SELECT 1 FROM system_versions WHERE version = '1.3.0'
);
