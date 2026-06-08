-- Notification & reminder schema update (PostgreSQL / Supabase)
-- Run once when JPA ddl-auto=update did not add columns (common with pooler/session limits).
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- ---------------------------------------------------------------------------
-- dog_medications
-- ---------------------------------------------------------------------------
ALTER TABLE dog_medications
    ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE dog_medications
    ADD COLUMN IF NOT EXISTS schedule_times TEXT DEFAULT '08:00';

ALTER TABLE dog_medications
    ADD COLUMN IF NOT EXISTS frequency_type VARCHAR(32) NOT NULL DEFAULT 'DAILY';

ALTER TABLE dog_medications
    ADD COLUMN IF NOT EXISTS frequency_interval INTEGER NOT NULL DEFAULT 1;

ALTER TABLE dog_medications
    ADD COLUMN IF NOT EXISTS remind_days_before INTEGER DEFAULT 7;

ALTER TABLE dog_medications
    ADD COLUMN IF NOT EXISTS remind_before_unit VARCHAR(16) NOT NULL DEFAULT 'DAYS';

ALTER TABLE dog_medications
    ADD COLUMN IF NOT EXISTS next_due_time TIME DEFAULT '09:00:00';

UPDATE dog_medications SET remind_before_unit = 'DAYS' WHERE remind_before_unit IS NULL;

UPDATE dog_medications SET remind_days_before = 7 WHERE remind_days_before IS NULL;

UPDATE dog_medications SET next_due_time = '09:00:00' WHERE next_due_time IS NULL;

ALTER TABLE dog_medications
    ADD COLUMN IF NOT EXISTS administered_time TIME DEFAULT '09:00:00';

UPDATE dog_medications SET administered_time = '09:00:00' WHERE administered_time IS NULL;

-- ---------------------------------------------------------------------------
-- dog_vaccinations
-- ---------------------------------------------------------------------------
ALTER TABLE dog_vaccinations
    ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE dog_vaccinations
    ADD COLUMN IF NOT EXISTS remind_days_before TEXT DEFAULT '7';

UPDATE dog_vaccinations SET remind_days_before = '7' WHERE remind_days_before IS NULL OR remind_days_before = '7,1';

-- ---------------------------------------------------------------------------
-- food_stocks
-- ---------------------------------------------------------------------------
ALTER TABLE food_stocks
    ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE food_stocks
    ADD COLUMN IF NOT EXISTS low_stock_threshold_days INTEGER;

-- Legacy column (kg threshold) — replaced by low_stock_threshold_days
-- ALTER TABLE food_stocks DROP COLUMN IF EXISTS low_stock_threshold_kg;

-- ---------------------------------------------------------------------------
-- reminders (manual user reminders)
-- ---------------------------------------------------------------------------
ALTER TABLE reminders
    ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE reminders
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(32);

ALTER TABLE reminders
    ADD COLUMN IF NOT EXISTS source_id UUID;

ALTER TABLE reminders
    ADD COLUMN IF NOT EXISTS system_generated BOOLEAN DEFAULT FALSE;

UPDATE reminders SET system_generated = FALSE WHERE system_generated IS NULL;

ALTER TABLE reminders
    ALTER COLUMN system_generated SET DEFAULT FALSE;

ALTER TABLE reminders
    ALTER COLUMN system_generated SET NOT NULL;

-- ---------------------------------------------------------------------------
-- user_notification_preferences (global master toggle per user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES regular_users (id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
