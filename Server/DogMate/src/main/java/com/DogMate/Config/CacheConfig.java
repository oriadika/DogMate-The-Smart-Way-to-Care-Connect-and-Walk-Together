package com.DogMate.Config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(
                "loggedUsers",
                "dogsByUser",
                "remindersByUser",
                "foodStocksByUser"
        );

        // Short TTL keeps data fresh while reducing repeated DB roundtrips.
        cacheManager.setCaffeine(
                Caffeine.newBuilder()
                        .maximumSize(1000)
                        .expireAfterWrite(30, TimeUnit.SECONDS)
        );

        return cacheManager;
    }
}
