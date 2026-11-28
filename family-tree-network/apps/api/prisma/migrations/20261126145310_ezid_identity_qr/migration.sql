-- CreateEnum
CREATE TYPE "QrTokenKind" AS ENUM ('PERSONAL', 'TEMPORARY');

-- CreateEnum
CREATE TYPE "QrScanOutcome" AS ENUM ('OK', 'SELF', 'INVALID', 'EXPIRED', 'REVOKED', 'DISABLED', 'BLOCKED');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "qr_enabled" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "searchable" SET DEFAULT false;

-- CreateTable
CREATE TABLE "user_identifiers" (
    "profile_id" UUID NOT NULL,
    "ezid_id" VARCHAR(16) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_identifiers_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "qr_tokens" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "kind" "QrTokenKind" NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "token_encrypted" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_scan_events" (
    "id" BIGSERIAL NOT NULL,
    "token_id" UUID,
    "scanner_profile_id" UUID NOT NULL,
    "outcome" "QrScanOutcome" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_scan_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_identifiers_ezid_id_key" ON "user_identifiers"("ezid_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_tokens_token_hash_key" ON "qr_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "qr_tokens_profile_id_idx" ON "qr_tokens"("profile_id");

-- CreateIndex
CREATE INDEX "qr_scan_events_scanner_profile_id_created_at_idx" ON "qr_scan_events"("scanner_profile_id", "created_at");

-- AddForeignKey
ALTER TABLE "user_identifiers" ADD CONSTRAINT "user_identifiers_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_tokens" ADD CONSTRAINT "qr_tokens_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_scan_events" ADD CONSTRAINT "qr_scan_events_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "qr_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_scan_events" ADD CONSTRAINT "qr_scan_events_scanner_profile_id_fkey" FOREIGN KEY ("scanner_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- EZIDNET identity rules (docs/ezidnet/DATABASE_SCHEMA.md §3)
-- ─────────────────────────────────────────────────────────────

-- EZID ID format: "EZ-" + 8 digits, no personal data.
ALTER TABLE "user_identifiers"
  ADD CONSTRAINT "user_identifiers_ezid_format" CHECK ("ezid_id" ~ '^EZ-[0-9]{8}$');

-- At most one active personal QR token per person.
CREATE UNIQUE INDEX "qr_tokens_one_active_personal"
  ON "qr_tokens" ("profile_id") WHERE "kind" = 'PERSONAL' AND "revoked_at" IS NULL;

-- Backfill: every existing account holder (claimed profile) receives a random, non-sequential EZID ID.
DO $$
DECLARE p RECORD; candidate TEXT;
BEGIN
  FOR p IN SELECT id FROM "profiles" WHERE "user_id" IS NOT NULL LOOP
    LOOP
      candidate := 'EZ-' || lpad(floor(random() * 100000000)::bigint::text, 8, '0');
      BEGIN
        INSERT INTO "user_identifiers" ("profile_id", "ezid_id") VALUES (p.id, candidate);
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- extremely rare collision: try another number
      END;
    END LOOP;
  END LOOP;
END $$;
