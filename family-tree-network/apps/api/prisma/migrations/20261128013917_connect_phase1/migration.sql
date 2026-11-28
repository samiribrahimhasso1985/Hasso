-- CreateEnum
CREATE TYPE "ConnectAudience" AS ENUM ('EVERYONE', 'FRIENDS_OF_FRIENDS', 'FRIENDS', 'NOBODY', 'ONLY_ME');

-- CreateEnum
CREATE TYPE "PresenceMode" AS ENUM ('ONLINE', 'BUSY', 'AWAY', 'INVISIBLE');

-- CreateTable
CREATE TABLE "follows" (
    "follower_profile_id" UUID NOT NULL,
    "followee_profile_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_profile_id","followee_profile_id")
);

-- CreateTable
CREATE TABLE "connect_settings" (
    "profile_id" UUID NOT NULL,
    "friend_requests_from" "ConnectAudience" NOT NULL DEFAULT 'EVERYONE',
    "follows_from" "ConnectAudience" NOT NULL DEFAULT 'EVERYONE',
    "presence_visible_to" "ConnectAudience" NOT NULL DEFAULT 'FRIENDS',
    "show_last_seen" BOOLEAN NOT NULL DEFAULT true,
    "friend_list_visible_to" "ConnectAudience" NOT NULL DEFAULT 'FRIENDS',
    "status_mode" "PresenceMode" NOT NULL DEFAULT 'ONLINE',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connect_settings_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "user_presence" (
    "profile_id" UUID NOT NULL,
    "last_active_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_presence_pkey" PRIMARY KEY ("profile_id")
);

-- CreateIndex
CREATE INDEX "follows_followee_profile_id_created_at_idx" ON "follows"("followee_profile_id", "created_at");

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_profile_id_fkey" FOREIGN KEY ("follower_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followee_profile_id_fkey" FOREIGN KEY ("followee_profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connect_settings" ADD CONSTRAINT "connect_settings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_presence" ADD CONSTRAINT "user_presence_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Nobody follows themselves.
ALTER TABLE "follows" ADD CONSTRAINT "follows_not_self" CHECK ("follower_profile_id" <> "followee_profile_id");
