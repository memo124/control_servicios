-- Registro de versión 1.4.1 en system_versions (idempotente)
SELECT setval(
  pg_get_serial_sequence('system_versions', 'id'),
  COALESCE((SELECT MAX(id) FROM system_versions), 0)
);

INSERT INTO system_versions (version, titulo, descripcion, tipo)
SELECT
  '1.4.1',
  'Corrección email operador Guillermo',
  'Operador Guillermo usa guillermo@controlservicios.local. Seed elimina usuario legacy con correo personal.',
  'patch'
WHERE NOT EXISTS (
  SELECT 1 FROM system_versions WHERE version = '1.4.1'
);
