package com.DogMate.Config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/**
 * Overrides Spring's default {@code messageBrokerTaskScheduler} (pool size 1) and
 * wires it into both the STOMP broker and SockJS.
 */
@Configuration
@Order(Ordered.LOWEST_PRECEDENCE)
public class WebSocketExecutorConfiguration {

    private static final Logger log = LoggerFactory.getLogger(WebSocketExecutorConfiguration.class);

    @Bean(name = "messageBrokerTaskScheduler")
    @Primary
    public ThreadPoolTaskScheduler messageBrokerTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = WebSocketThreadPools.createTaskScheduler();
        log.info(
                "Override messageBrokerTaskScheduler poolSize={} (configured={})",
                scheduler.getScheduledThreadPoolExecutor().getPoolSize(),
                WebSocketThreadPools.SCHEDULER_POOL_SIZE
        );
        return scheduler;
    }
}
