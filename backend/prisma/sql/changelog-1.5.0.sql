-- Registro de versión 1.5.0 en system_versions (idempotente)
SELECT setval(
  pg_get_serial_sequence('system_versions', 'id'),
  COALESCE((SELECT MAX(id) FROM system_versions), 0)
);

INSERT INTO system_versions (version, titulo, descripcion, tipo)
SELECT
  '1.5.0',
  'Telegram por grupo y plantillas editables',
  'Telegram centralizado en TELEGRAM_GROUP_CHAT_ID. Plantillas Telegram, edición de usuarios y teléfono en operadores.',
  'minor'
WHERE NOT EXISTS (
  SELECT 1 FROM system_versions WHERE version = '1.5.0'
);
