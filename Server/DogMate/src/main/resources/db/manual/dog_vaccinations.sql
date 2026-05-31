-- Run once on PostgreSQL / Supabase after deploy (no Flyway in this project).
CREATE TABLE IF NOT EXISTS dog_vaccinations (
    id UUID PRIMARY KEY,
    dog_id UUID NOT NULL REFERENCES dogs (id) ON DELETE CASCADE,
    vaccine_name TEXT NOT NULL,
    administered_date DATE NOT NULL,
    next_due_date DATE,
    vet_clinic_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dog_vaccinations_dog_id ON dog_vaccinations (dog_id);
CREATE INDEX IF NOT EXISTS idx_dog_vaccinations_administered_date ON dog_vaccinations (administered_date DESC);
