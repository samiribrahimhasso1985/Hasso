-- Rollback of migration 20261128080620_notifications (unified Notification Service).
-- Drops ONLY the objects that migration created. Run manually, then delete its row from "_prisma_migrations".
DROP TABLE IF EXISTS "notification_preferences";
DROP TABLE IF EXISTS "notifications";
DROP TYPE IF EXISTS "NotificationCategory";
