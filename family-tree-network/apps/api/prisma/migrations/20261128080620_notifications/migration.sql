-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('RELATIONSHIPS', 'FRIENDS', 'FOLLOWS', 'MESSAGES', 'CALLS', 'GROUPS', 'EVENTS', 'INVITATIONS', 'LEARNING', 'CREATORS', 'COLLABORATION', 'COMMUNITY', 'SAFETY');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_profile_id" UUID NOT NULL,
    "actor_profile_id" UUID,
    "category" "NotificationCategory" NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "entity_type" VARCHAR(40),
    "entity_id" VARCHAR(64),
    "data" JSONB,
    "dedupe_key" VARCHAR(120),
    "silent" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "profile_id" UUID NOT NULL,
    "muted_categories" "NotificationCategory"[] DEFAULT ARRAY[]::"NotificationCategory"[],
    "push_enabled" BOOLEAN NOT NULL DEFAULT false,
    "quiet_start" SMALLINT,
    "quiet_end" SMALLINT,
    "time_zone" VARCHAR(40) NOT NULL DEFAULT 'UTC',
    "dnd_until" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("profile_id")
);

-- CreateIndex
CREATE INDEX "notifications_recipient_profile_id_created_at_idx" ON "notifications"("recipient_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_profile_id_read_at_idx" ON "notifications"("recipient_profile_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_recipient_profile_id_dedupe_key_key" ON "notifications"("recipient_profile_id", "dedupe_key");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_profile_id_fkey" FOREIGN KEY ("recipient_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Quiet hours are minutes of the day.
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_quiet_range"
  CHECK (("quiet_start" IS NULL OR "quiet_start" BETWEEN 0 AND 1439) AND ("quiet_end" IS NULL OR "quiet_end" BETWEEN 0 AND 1439));
