-- Registro de versión 1.5.4 en system_versions (idempotente)
SELECT setval(
  pg_get_serial_sequence('system_versions', 'id'),
  COALESCE((SELECT MAX(id) FROM system_versions), 0)
);

INSERT INTO system_versions (version, titulo, descripcion, tipo)
SELECT
  '1.5.4',
  'QR escaneable, datos de pago en correos y plantilla HTML',
  'qrcode, PAYMENT_* en AVISO_PAGO, npm run db:plantilla-correo, login QR con FRONTEND_URL.',
  'minor'
WHERE NOT EXISTS (
  SELECT 1 FROM system_versions WHERE version = '1.5.4'
);
