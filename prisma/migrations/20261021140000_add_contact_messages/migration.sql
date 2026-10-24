-- CreateTable
CREATE TABLE IF NOT EXISTS "contact_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) DEFAULT '',
    "subject" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'new',
    "admin_notes" TEXT DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "contact_messages_status_idx" ON "contact_messages"("status");
CREATE INDEX IF NOT EXISTS "contact_messages_email_idx" ON "contact_messages"("email");
CREATE INDEX IF NOT EXISTS "contact_messages_created_at_idx" ON "contact_messages"("created_at");
