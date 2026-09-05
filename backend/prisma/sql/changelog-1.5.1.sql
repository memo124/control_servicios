-- Registro de versión 1.5.1 en system_versions (idempotente)
SELECT setval(
  pg_get_serial_sequence('system_versions', 'id'),
  COALESCE((SELECT MAX(id) FROM system_versions), 0)
);

INSERT INTO system_versions (version, titulo, descripcion, tipo)
SELECT
  '1.5.1',
  'Documentación de flujos y seguridad',
  'docs/FLOWS.md (cron, correos, Telegram, plantillas) y docs/SECURITY.md (auth, RBAC, pentest).',
  'patch'
WHERE NOT EXISTS (
  SELECT 1 FROM system_versions WHERE version = '1.5.1'
);
