# Manual database scripts (PostgreSQL / Supabase)

This project does not use Flyway. Run scripts here when deploying or when `spring.jpa.hibernate.ddl-auto=update` does not apply changes (e.g. Supabase transaction pooler on port 6543).

## Scripts

| File | Purpose |
|------|---------|
| `dog_medications.sql` | Create `dog_medications` table (fresh install) |
| `dog_vaccinations.sql` | Create `dog_vaccinations` table (fresh install) |
| `email_verification_backfill.sql` | One-off email verification data fix |
| `notification_schema_update.sql` | **Notification columns** on `dog_medications`, `dog_vaccinations`, `food_stocks`, `reminders`, plus `user_notification_preferences` table |

## Notification columns (2026)

Applied automatically on server startup via `NotificationSchemaMigration`, or run manually:

```bash
psql "$DATABASE_URL" -f src/main/resources/db/manual/notification_schema_update.sql
```

### Columns added

- **dog_medications:** `notification_enabled`, `schedule_times`, `frequency_type`, `frequency_interval`
- **dog_vaccinations:** `notification_enabled`, `remind_days_before`
- **food_stocks:** `notification_enabled`, `low_stock_threshold_kg`
- **reminders:** `notification_enabled`
- **user_notification_preferences:** new table (`user_id`, `notifications_enabled`, `updated_at`)
