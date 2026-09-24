-- Registro de versión 1.5.5 en system_versions (idempotente)
SELECT setval(
  pg_get_serial_sequence('system_versions', 'id'),
  COALESCE((SELECT MAX(id) FROM system_versions), 0)
);

INSERT INTO system_versions (version, titulo, descripcion, tipo)
SELECT
  '1.5.5',
  'Correo SMTP, mail-status y fixes Notificaciones',
  'MAIL_PROVIDER=smtp, avisos Resend sandbox, historial correos sin FK rota, estado Telegram dueños.',
  'patch'
WHERE NOT EXISTS (
  SELECT 1 FROM system_versions WHERE version = '1.5.5'
);
