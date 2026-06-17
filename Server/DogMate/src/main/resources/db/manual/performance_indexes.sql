-- Performance indexes for user-scoped list queries and map endpoints.
CREATE INDEX IF NOT EXISTS idx_dog_relationships_regular_user_id ON dog_relationships (regular_user_id);
CREATE INDEX IF NOT EXISTS idx_dog_relationships_dog_id ON dog_relationships (dog_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders (user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_source ON reminders (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_reminder_dogs_dog_id ON reminder_dogs (dog_id);
CREATE INDEX IF NOT EXISTS idx_dogs_food_stock_id ON dogs (food_stock_id);
CREATE INDEX IF NOT EXISTS idx_dog_walker_ratings_walker_id ON dog_walker_ratings (walker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_accounts_logged_in ON user_accounts (logged_in) WHERE logged_in = true;
