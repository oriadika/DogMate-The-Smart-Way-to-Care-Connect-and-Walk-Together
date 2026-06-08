-- Run once on PostgreSQL / Supabase after deploy (no Flyway in this project).
CREATE TABLE IF NOT EXISTS dog_medications (
    id UUID PRIMARY KEY,
    dog_id UUID NOT NULL REFERENCES dogs (id) ON DELETE CASCADE,
    medication_name TEXT NOT NULL,
    administered_date DATE NOT NULL,
    administered_time TIME DEFAULT '09:00:00',
    next_due_date DATE,
    vet_clinic_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notification_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    schedule_times TEXT DEFAULT '08:00',
    frequency_type VARCHAR(32) NOT NULL DEFAULT 'DAILY',
    frequency_interval INTEGER NOT NULL DEFAULT 1,
    remind_days_before INTEGER DEFAULT 7,
    remind_before_unit VARCHAR(16) NOT NULL DEFAULT 'DAYS',
    next_due_time TIME DEFAULT '09:00:00'
);

CREATE INDEX IF NOT EXISTS idx_dog_medications_dog_id ON dog_medications (dog_id);
CREATE INDEX IF NOT EXISTS idx_dog_medications_administered_date ON dog_medications (administered_date DESC);
