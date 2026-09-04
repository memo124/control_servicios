-- Registro de versión 1.2.1 en system_versions (idempotente)
SELECT setval(
  pg_get_serial_sequence('system_versions', 'id'),
  COALESCE((SELECT MAX(id) FROM system_versions), 0)
);

INSERT INTO system_versions (version, titulo, descripcion, tipo)
SELECT
  '1.2.1',
  'Corrección tema claro',
  'Variables CSS centralizadas y tablas/formularios adaptados al tema claro. Se eliminaron estilos oscuros hardcodeados en todas las vistas. Ver docs/THEMES.md.',
  'patch'
WHERE NOT EXISTS (
  SELECT 1 FROM system_versions WHERE version = '1.2.1'
);
