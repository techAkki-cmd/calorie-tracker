-- Normalize the Instant-backed column. Existing values created by the current application are
-- UTC wall-clock timestamps; PostgreSQL must attach UTC before changing the physical type.
-- The conditional makes this safe to run more than once.
\set ON_ERROR_STOP on
BEGIN;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'food_entries'
          AND column_name = 'consumed_at'
          AND data_type = 'timestamp without time zone'
    ) THEN
        ALTER TABLE food_entries
            ALTER COLUMN consumed_at TYPE timestamptz
            USING consumed_at AT TIME ZONE 'UTC';
    END IF;
END
$$;
COMMIT;
