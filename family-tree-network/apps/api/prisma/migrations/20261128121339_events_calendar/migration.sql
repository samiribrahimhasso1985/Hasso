-- CreateEnum
CREATE TYPE "CalendarCategory" AS ENUM ('RELIGIOUS_HOLIDAY', 'FASTING', 'CULTURAL', 'PILGRIMAGE', 'HERITAGE', 'REMEMBRANCE', 'COMMUNITY', 'LOCAL_TRADITION');

-- CreateEnum
CREATE TYPE "DateVerification" AS ENUM ('UNVERIFIED', 'VERIFIED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('CULTURAL_FESTIVAL', 'RELIGIOUS_CELEBRATION', 'COMMUNITY_GATHERING', 'HERITAGE_EXHIBITION', 'MUSIC', 'EDUCATIONAL', 'YOUTH', 'CHARITY', 'MEMORIAL', 'ONLINE', 'INTERNATIONAL_MEETUP');

-- CreateEnum
CREATE TYPE "EventTemplate" AS ENUM ('RELIGIOUS', 'CULTURAL', 'HERITAGE', 'COMMUNITY', 'MEMORIAL', 'MUSIC', 'INTERNATIONAL', 'ONLINE', 'LOCAL');

-- CreateEnum
CREATE TYPE "EventAudience" AS ENUM ('PUBLIC', 'FRIENDS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RegistrationMode" AS ENUM ('NONE', 'RSVP', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "calendar_days" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "category" "CalendarCategory" NOT NULL,
    "names" JSONB NOT NULL,
    "summary" JSONB,
    "description" JSONB,
    "region" VARCHAR(120),
    "tradition" VARCHAR(200),
    "sources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "template" "EventTemplate" NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_dates" (
    "id" UUID NOT NULL,
    "day_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "traditional_date" VARCHAR(120),
    "verification" "DateVerification" NOT NULL DEFAULT 'UNVERIFIED',
    "note" VARCHAR(500),
    "verified_by_user_id" UUID,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "organizer_profile_id" UUID NOT NULL,
    "host_name" VARCHAR(120),
    "title" VARCHAR(140) NOT NULL,
    "summary" VARCHAR(300) NOT NULL,
    "description" VARCHAR(8000) NOT NULL DEFAULT '',
    "category" "EventCategory" NOT NULL,
    "template" "EventTemplate" NOT NULL,
    "audience" "EventAudience" NOT NULL DEFAULT 'PUBLIC',
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "time_zone" VARCHAR(40) NOT NULL DEFAULT 'UTC',
    "country" VARCHAR(2),
    "city" VARCHAR(80),
    "venue" VARCHAR(200),
    "venue_public" BOOLEAN NOT NULL DEFAULT true,
    "online_url" VARCHAR(300),
    "registration" "RegistrationMode" NOT NULL DEFAULT 'NONE',
    "registration_url" VARCHAR(300),
    "capacity" INTEGER,
    "contact" VARCHAR(200),
    "speakers" JSONB,
    "faq" JSONB,
    "calendar_day_id" UUID,
    "featured_at" TIMESTAMP(3),
    "review_note" VARCHAR(500),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_sessions" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "title" VARCHAR(140) NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "stage" VARCHAR(80),
    "host" VARCHAR(120),
    "kind" VARCHAR(60),
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "event_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendees" (
    "event_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("event_id","profile_id")
);

-- CreateTable
CREATE TABLE "event_saves" (
    "event_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_saves_pkey" PRIMARY KEY ("event_id","profile_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calendar_days_slug_key" ON "calendar_days"("slug");

-- CreateIndex
CREATE INDEX "calendar_dates_start_date_end_date_idx" ON "calendar_dates"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_dates_day_id_start_date_key" ON "calendar_dates"("day_id", "start_date");

-- CreateIndex
CREATE INDEX "events_status_audience_starts_at_idx" ON "events"("status", "audience", "starts_at");

-- CreateIndex
CREATE INDEX "events_organizer_profile_id_idx" ON "events"("organizer_profile_id");

-- CreateIndex
CREATE INDEX "events_calendar_day_id_idx" ON "events"("calendar_day_id");

-- CreateIndex
CREATE INDEX "event_sessions_event_id_starts_at_idx" ON "event_sessions"("event_id", "starts_at");

-- CreateIndex
CREATE INDEX "event_attendees_profile_id_idx" ON "event_attendees"("profile_id");

-- CreateIndex
CREATE INDEX "event_saves_profile_id_idx" ON "event_saves"("profile_id");

-- AddForeignKey
ALTER TABLE "calendar_dates" ADD CONSTRAINT "calendar_dates_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "calendar_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_profile_id_fkey" FOREIGN KEY ("organizer_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_calendar_day_id_fkey" FOREIGN KEY ("calendar_day_id") REFERENCES "calendar_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_saves" ADD CONSTRAINT "event_saves_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_saves" ADD CONSTRAINT "event_saves_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity rules.
ALTER TABLE "calendar_dates" ADD CONSTRAINT "calendar_dates_order" CHECK ("end_date" >= "start_date");
ALTER TABLE "events" ADD CONSTRAINT "events_time_order" CHECK ("ends_at" >= "starts_at");
ALTER TABLE "events" ADD CONSTRAINT "events_capacity_positive" CHECK ("capacity" IS NULL OR "capacity" > 0);
ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_time_order" CHECK ("ends_at" >= "starts_at");
