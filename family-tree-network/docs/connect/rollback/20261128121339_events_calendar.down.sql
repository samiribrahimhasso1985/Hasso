-- Rollback of the events_calendar migration (EZIDINET Events & ÊZÎDÎ Calendar).
-- Drops ONLY the objects it created. Run manually, then delete its row from "_prisma_migrations".
DROP TABLE IF EXISTS "event_saves";
DROP TABLE IF EXISTS "event_attendees";
DROP TABLE IF EXISTS "event_sessions";
DROP TABLE IF EXISTS "events";
DROP TABLE IF EXISTS "calendar_dates";
DROP TABLE IF EXISTS "calendar_days";
DROP TYPE IF EXISTS "SessionStatus";
DROP TYPE IF EXISTS "RegistrationMode";
DROP TYPE IF EXISTS "EventStatus";
DROP TYPE IF EXISTS "EventAudience";
DROP TYPE IF EXISTS "EventTemplate";
DROP TYPE IF EXISTS "EventCategory";
DROP TYPE IF EXISTS "DateVerification";
DROP TYPE IF EXISTS "CalendarCategory";
