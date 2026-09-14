-- Run with psql -v legacy_timezone='Asia/Kolkata' -f this_file.sql
-- Choose the timezone actually used by the legacy deployment; back up first.
-- Stop writers during migration. Intended for the pre-Instant schema only.
\set ON_ERROR_STOP on
BEGIN;
ALTER TABLE food_entries
    ALTER COLUMN consumed_at TYPE timestamptz
    USING consumed_at AT TIME ZONE :'legacy_timezone';
ALTER TABLE food_entries ADD COLUMN idempotency_key varchar(64);
ALTER TABLE food_entries ADD CONSTRAINT uq_food_entry_user_idempotency
    UNIQUE (user_id, idempotency_key);
COMMIT;
