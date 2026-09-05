-- Registro de versión 1.4.0 en system_versions (idempotente)
SELECT setval(
  pg_get_serial_sequence('system_versions', 'id'),
  COALESCE((SELECT MAX(id) FROM system_versions), 0)
);

INSERT INTO system_versions (version, titulo, descripcion, tipo)
SELECT
  '1.4.0',
  'Alertas Telegram para dueños de cuenta',
  'Notificaciones por Telegram a operadores/dueños cuando clientes están en gracia o vencidos, separado del correo al cliente. Configuración en Seguridad.',
  'minor'
WHERE NOT EXISTS (
  SELECT 1 FROM system_versions WHERE version = '1.4.0'
);
