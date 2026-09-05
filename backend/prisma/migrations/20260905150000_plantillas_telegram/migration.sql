-- Plantillas Telegram (v1.4.2)
CREATE TABLE IF NOT EXISTS "plantillas_telegram" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "cuerpo_texto" TEXT NOT NULL,
    "variables_disponibles" JSONB NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plantillas_telegram_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "plantillas_telegram_codigo_key" ON "plantillas_telegram"("codigo");
