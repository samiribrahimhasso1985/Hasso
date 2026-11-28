-- Rollback of migration 20261128013917_connect_phase1 (EZIDINET CONNECT phase 1).
-- Drops ONLY the objects that migration created; friendships live in "relationships" and are not touched.
-- Run manually (psql), then delete the row from "_prisma_migrations" for this migration name.
DROP TABLE IF EXISTS "user_presence";
DROP TABLE IF EXISTS "connect_settings";
DROP TABLE IF EXISTS "follows";
DROP TYPE IF EXISTS "PresenceMode";
DROP TYPE IF EXISTS "ConnectAudience";
