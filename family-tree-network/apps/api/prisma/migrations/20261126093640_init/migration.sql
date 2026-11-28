-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'NETWORK', 'FAMILY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "RelationshipCategory" AS ENUM ('FAMILY', 'UNION', 'FRIENDSHIP', 'PROFESSIONAL', 'SOCIAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "Directionality" AS ENUM ('SYMMETRIC', 'DIRECTED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('CONFIRM', 'REJECT', 'DISPUTE');

-- CreateEnum
CREATE TYPE "Side" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "ParentSubtype" AS ENUM ('BIOLOGICAL', 'ADOPTIVE', 'STEP', 'FOSTER', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "SiblingSubtype" AS ENUM ('FULL', 'HALF', 'STEP', 'ADOPTIVE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "LineageSide" AS ENUM ('PATERNAL', 'MATERNAL', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "UnionEndReason" AS ENUM ('DIVORCE', 'DEATH', 'SEPARATION', 'ANNULMENT');

-- CreateEnum
CREATE TYPE "StewardRole" AS ENUM ('GUARDIAN', 'CURATOR');

-- CreateEnum
CREATE TYPE "ProfileField" AS ENUM ('BIRTH_DATE', 'COUNTRY', 'CITY', 'BIO', 'LANGUAGES');

-- CreateEnum
CREATE TYPE "CommunityKind" AS ENUM ('FAMILY', 'FAMILY_BRANCH', 'FRIEND_GROUP', 'WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunityVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "JoinPolicy" AS ENUM ('OPEN', 'APPROVAL', 'INVITE_ONLY');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'PENDING');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "locale" VARCHAR(5) NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "display_name" VARCHAR(80) NOT NULL,
    "full_name" VARCHAR(160),
    "gender" "Gender" NOT NULL DEFAULT 'UNSPECIFIED',
    "birth_date" DATE,
    "death_date" DATE,
    "is_minor" BOOLEAN NOT NULL DEFAULT false,
    "country" VARCHAR(2),
    "city" VARCHAR(80),
    "bio" VARCHAR(1000),
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avatar_url" TEXT,
    "searchable" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_stewards" (
    "profile_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "StewardRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_stewards_pkey" PRIMARY KEY ("profile_id","user_id")
);

-- CreateTable
CREATE TABLE "privacy_settings" (
    "profile_id" UUID NOT NULL,
    "field" "ProfileField" NOT NULL,
    "visibility" "Visibility" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "privacy_settings_pkey" PRIMARY KEY ("profile_id","field")
);

-- CreateTable
CREATE TABLE "relationship_types" (
    "key" VARCHAR(40) NOT NULL,
    "category" "RelationshipCategory" NOT NULL,
    "directionality" "Directionality" NOT NULL,
    "sensitive" BOOLEAN NOT NULL,
    "is_union" BOOLEAN NOT NULL DEFAULT false,
    "kinship_up" INTEGER,
    "kinship_down" INTEGER,
    "default_visibility" "Visibility" NOT NULL,
    "labels" JSONB NOT NULL,
    "inverse_labels" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "relationship_types_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "relationships" (
    "id" UUID NOT NULL,
    "type_key" VARCHAR(40) NOT NULL,
    "from_profile_id" UUID NOT NULL,
    "to_profile_id" UUID NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "visibility" "Visibility" NOT NULL,
    "created_by_id" UUID NOT NULL,
    "parent_subtype" "ParentSubtype",
    "sibling_subtype" "SiblingSubtype",
    "lineage_side" "LineageSide",
    "start_date" DATE,
    "end_date" DATE,
    "end_reason" "UnionEndReason",
    "custom_label" VARCHAR(60),
    "custom_category" "RelationshipCategory",
    "note" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationship_verifications" (
    "id" UUID NOT NULL,
    "relationship_id" UUID NOT NULL,
    "side" "Side" NOT NULL,
    "user_id" UUID NOT NULL,
    "decision" "Decision" NOT NULL,
    "comment" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relationship_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communities" (
    "id" UUID NOT NULL,
    "kind" "CommunityKind" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000),
    "cover_url" TEXT,
    "visibility" "CommunityVisibility" NOT NULL DEFAULT 'PRIVATE',
    "join_policy" "JoinPolicy" NOT NULL DEFAULT 'APPROVAL',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_memberships" (
    "community_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_memberships_pkey" PRIMARY KEY ("community_id","profile_id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "blocker_user_id" UUID NOT NULL,
    "blocked_profile_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("blocker_user_id","blocked_profile_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(60) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" VARCHAR(64) NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");

-- CreateIndex
CREATE INDEX "profiles_display_name_idx" ON "profiles"("display_name");

-- CreateIndex
CREATE INDEX "profile_stewards_user_id_idx" ON "profile_stewards"("user_id");

-- CreateIndex
CREATE INDEX "relationships_from_profile_id_status_idx" ON "relationships"("from_profile_id", "status");

-- CreateIndex
CREATE INDEX "relationships_to_profile_id_status_idx" ON "relationships"("to_profile_id", "status");

-- CreateIndex
CREATE INDEX "relationships_type_key_idx" ON "relationships"("type_key");

-- CreateIndex
CREATE INDEX "relationship_verifications_relationship_id_created_at_idx" ON "relationship_verifications"("relationship_id", "created_at");

-- CreateIndex
CREATE INDEX "relationship_verifications_user_id_idx" ON "relationship_verifications"("user_id");

-- CreateIndex
CREATE INDEX "community_memberships_profile_id_idx" ON "community_memberships"("profile_id");

-- CreateIndex
CREATE INDEX "blocks_blocked_profile_id_idx" ON "blocks"("blocked_profile_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_stewards" ADD CONSTRAINT "profile_stewards_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_stewards" ADD CONSTRAINT "profile_stewards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_type_key_fkey" FOREIGN KEY ("type_key") REFERENCES "relationship_types"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_from_profile_id_fkey" FOREIGN KEY ("from_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_to_profile_id_fkey" FOREIGN KEY ("to_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_verifications" ADD CONSTRAINT "relationship_verifications_relationship_id_fkey" FOREIGN KEY ("relationship_id") REFERENCES "relationships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_verifications" ADD CONSTRAINT "relationship_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_user_id_fkey" FOREIGN KEY ("blocker_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_profile_id_fkey" FOREIGN KEY ("blocked_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- Integrity rules that Prisma's schema language cannot express.
-- (See docs/DATABASE_SCHEMA.md §Constraints.)
-- ─────────────────────────────────────────────────────────────

-- No relationship of a person with themselves.
ALTER TABLE "relationships"
  ADD CONSTRAINT "relationships_no_self" CHECK ("from_profile_id" <> "to_profile_id");

-- Union end must not precede its start.
ALTER TABLE "relationships"
  ADD CONSTRAINT "relationships_date_order" CHECK ("end_date" IS NULL OR "start_date" IS NULL OR "end_date" >= "start_date");

-- Custom relationships need a label.
ALTER TABLE "relationships"
  ADD CONSTRAINT "relationships_custom_label" CHECK ("type_key" <> 'CUSTOM' OR "custom_label" IS NOT NULL);

-- One active fact per (type, ordered pair, custom label).
-- Rejected requests and ended unions do not block new ones (e.g. remarriage).
CREATE UNIQUE INDEX "relationships_active_unique"
  ON "relationships" ("type_key", "from_profile_id", "to_profile_id", COALESCE("custom_label", ''))
  WHERE "status" <> 'REJECTED' AND "end_date" IS NULL AND "end_reason" IS NULL;

-- Symmetric types are stored with from < to (canonical ordering), enforced by trigger
-- because it depends on the type catalog.
CREATE OR REPLACE FUNCTION relationships_enforce_canonical() RETURNS trigger AS $$
DECLARE dir "Directionality";
BEGIN
  SELECT "directionality" INTO dir FROM "relationship_types" WHERE "key" = NEW."type_key";
  -- uuid comparison is bytewise, identical to comparing lower-case hex strings in JS
  IF dir = 'SYMMETRIC' AND NEW."from_profile_id" > NEW."to_profile_id" THEN
    RAISE EXCEPTION 'symmetric relationship must be stored with from_profile_id < to_profile_id'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "relationships_canonical"
  BEFORE INSERT OR UPDATE OF "from_profile_id", "to_profile_id", "type_key" ON "relationships"
  FOR EACH ROW EXECUTE FUNCTION relationships_enforce_canonical();

-- Decision log is append-only.
CREATE OR REPLACE FUNCTION relationship_verifications_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'relationship_verifications is append-only' USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "relationship_verifications_no_update"
  BEFORE UPDATE ON "relationship_verifications"
  FOR EACH ROW EXECUTE FUNCTION relationship_verifications_append_only();
