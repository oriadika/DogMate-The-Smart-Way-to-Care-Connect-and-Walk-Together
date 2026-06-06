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
 * Applies {@code db/manual/*.sql} on startup.
 * Required for Supabase transaction pooler (6543) where Hibernate ddl-auto=update
 * often does not create health tables ({@code dog_medications}, {@code dog_vaccinations}).
 */
@Component
public class ManualDatabaseMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ManualDatabaseMigration.class);

    /** Order matters: create base tables before ALTER in notification_schema_update.sql */
    private static final String[] MIGRATION_RESOURCES = {
            "db/manual/dog_medications.sql",
            "db/manual/dog_vaccinations.sql",
            "db/manual/notification_schema_update.sql",
    };

    private final JdbcTemplate jdbcTemplate;

    public ManualDatabaseMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        int totalApplied = 0;
        for (String resourcePath : MIGRATION_RESOURCES) {
            totalApplied += applyResource(resourcePath);
        }
        log.info("Manual database migration finished ({} statements executed total)", totalApplied);
        verifyHealthTables();
    }

    private int applyResource(String resourcePath) throws Exception {
        ClassPathResource resource = new ClassPathResource(resourcePath);
        if (!resource.exists()) {
            log.warn("Migration file not found: {}", resourcePath);
            return 0;
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
                log.warn("Migration [{}] statement skipped or failed: {} — {}",
                        resourcePath, summarize(statement), e.getMessage());
            }
        }
        log.info("Applied {} statements from {}", applied, resourcePath);
        return applied;
    }

    private void verifyHealthTables() {
        verifyTableReadable("dog_medications");
        verifyTableReadable("dog_vaccinations");
        verifyTableReadable("food_stocks");
    }

    private void verifyTableReadable(String tableName) {
        try {
            jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + tableName, Long.class);
            log.info("Table {} is accessible", tableName);
        } catch (Exception e) {
            log.error("Table {} is NOT accessible — health endpoints may fail: {}", tableName, e.getMessage());
        }
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
