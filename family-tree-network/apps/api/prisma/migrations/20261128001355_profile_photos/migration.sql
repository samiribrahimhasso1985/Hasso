-- CreateTable
CREATE TABLE "profile_photos" (
    "profile_id" UUID NOT NULL,
    "mime" VARCHAR(20) NOT NULL,
    "data" BYTEA NOT NULL,
    "bytes" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "visibility" "Visibility" NOT NULL DEFAULT 'NETWORK',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_photos_pkey" PRIMARY KEY ("profile_id")
);

-- AddForeignKey
ALTER TABLE "profile_photos" ADD CONSTRAINT "profile_photos_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Photos are small, already-compressed images.
ALTER TABLE "profile_photos" ADD CONSTRAINT "profile_photos_size" CHECK ("bytes" > 0 AND "bytes" <= 2097152);
ALTER TABLE "profile_photos" ADD CONSTRAINT "profile_photos_mime" CHECK ("mime" IN ('image/jpeg', 'image/png'));
