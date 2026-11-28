-- Rollback of 20261128152344_declared_interests_skills. Drops the two columns only.
-- PostgreSQL cannot remove enum values; INTERESTS / SKILLS stay in "ProfileField" unused (harmless).
-- Run manually, delete matching rows from "privacy_settings" first, then the row in "_prisma_migrations".
DELETE FROM "privacy_settings" WHERE "field" IN ('INTERESTS', 'SKILLS');
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "interests", DROP COLUMN IF EXISTS "skills";
