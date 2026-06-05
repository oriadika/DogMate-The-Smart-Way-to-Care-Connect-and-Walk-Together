package com.DogMate.Config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.nio.charset.StandardCharsets;

/**
 * Applies {@code db/manual/notification_schema_update.sql} on startup so notification
 * columns exist even when Hibernate ddl-auto=update does not run against Supabase pooler.
 */
@Component
public class NotificationSchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(NotificationSchemaMigration.class);
    private static final String MIGRATION_RESOURCE = "db/manual/notification_schema_update.sql";

    private final JdbcTemplate jdbcTemplate;

    public NotificationSchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        ClassPathResource resource = new ClassPathResource(MIGRATION_RESOURCE);
        if (!resource.exists()) {
            log.warn("Notification schema migration file not found: {}", MIGRATION_RESOURCE);
            return;
        }

        String sql = StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
        String[] statements = sql.split(";");

        int applied = 0;
        for (String raw : statements) {
            String statement = stripSqlComments(raw).trim();
            if (statement.isEmpty()) {
                continue;
            }
            try {
                jdbcTemplate.execute(statement);
                applied++;
            } catch (Exception e) {
                log.warn("Notification schema statement skipped or failed: {} — {}",
                        summarize(statement), e.getMessage());
            }
        }
        log.info("Notification schema migration finished ({} statements executed)", applied);
    }

    private static String stripSqlComments(String block) {
        StringBuilder out = new StringBuilder();
        for (String line : block.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.startsWith("--") || trimmed.isEmpty()) {
                continue;
            }
            out.append(line).append('\n');
        }
        return out.toString();
    }

    private static String summarize(String statement) {
        String oneLine = statement.replaceAll("\\s+", " ").trim();
        return oneLine.length() > 80 ? oneLine.substring(0, 80) + "..." : oneLine;
    }
}
