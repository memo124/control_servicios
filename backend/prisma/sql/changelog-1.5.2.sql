-- Registro de versión 1.5.2 en system_versions (idempotente)
SELECT setval(
  pg_get_serial_sequence('system_versions', 'id'),
  COALESCE((SELECT MAX(id) FROM system_versions), 0)
);

INSERT INTO system_versions (version, titulo, descripcion, tipo)
SELECT
  '1.5.2',
  'Backup de BD descargable con aviso Telegram',
  'GET /api/system/backup (admin), script npm run db:backup, plantilla TELEGRAM_BACKUP_BD.',
  'minor'
WHERE NOT EXISTS (
  SELECT 1 FROM system_versions WHERE version = '1.5.2'
);
