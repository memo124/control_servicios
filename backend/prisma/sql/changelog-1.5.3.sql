-- Registro de versión 1.5.3 en system_versions (idempotente)
SELECT setval(
  pg_get_serial_sequence('system_versions', 'id'),
  COALESCE((SELECT MAX(id) FROM system_versions), 0)
);

INSERT INTO system_versions (version, titulo, descripcion, tipo)
SELECT
  '1.5.3',
  'Rate limit y restore de backup',
  'Throttler auth solo en login/2FA. Backup SQL: datos en orden FK, PK/FK tras INSERT, secuencias.',
  'patch'
WHERE NOT EXISTS (
  SELECT 1 FROM system_versions WHERE version = '1.5.3'
);
