-- Alertas Telegram para dueños de cuenta (v1.4.0)

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telefono" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "alertas_dueno_telegram_activo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "alertas_dueno_telegram_chat_id" VARCHAR(50);

CREATE TABLE IF NOT EXISTS "historial_notificaciones_dueno" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "dueno_nombre" VARCHAR(120) NOT NULL,
    "telefono" VARCHAR(50),
    "telegram_chat_id" VARCHAR(50) NOT NULL,
    "suscripciones_count" INTEGER NOT NULL,
    "estado_envio" VARCHAR(50) NOT NULL,
    "mensaje_resumen" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "historial_notificaciones_dueno_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "historial_notificaciones_dueno_user_id_idx" ON "historial_notificaciones_dueno"("user_id");

DO $$ BEGIN
  ALTER TABLE "historial_notificaciones_dueno"
    ADD CONSTRAINT "historial_notificaciones_dueno_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
