package com.DogMate.Config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.util.concurrent.ScheduledThreadPoolExecutor;

/**
 * Overrides Spring's default {@code messageBrokerTaskScheduler} (pool size 1) and
 * wires it into both the STOMP broker and SockJS.
 */
@Configuration
@Order(Ordered.LOWEST_PRECEDENCE)
public class WebSocketExecutorConfiguration {

    public static final int SCHEDULER_POOL_SIZE = 4;
    public static final int CHANNEL_CORE_POOL_SIZE = 4;
    public static final int CHANNEL_MAX_POOL_SIZE = 8;
    public static final int CHANNEL_QUEUE_CAPACITY = 1000;

    private static final Logger log = LoggerFactory.getLogger(WebSocketExecutorConfiguration.class);

    @Bean(name = "messageBrokerTaskScheduler")
    @Primary
    public ThreadPoolTaskScheduler messageBrokerTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = createTaskScheduler();
        log.info(
                "Override messageBrokerTaskScheduler poolSize={} (configured={})",
                scheduler.getScheduledThreadPoolExecutor().getPoolSize(),
                SCHEDULER_POOL_SIZE
        );
        return scheduler;
    }

    private static ThreadPoolTaskScheduler createTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(SCHEDULER_POOL_SIZE);
        scheduler.setThreadNamePrefix("ws-scheduler-");
        scheduler.setRemoveOnCancelPolicy(true);
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(15);
        scheduler.initialize();

        ScheduledThreadPoolExecutor executor = scheduler.getScheduledThreadPoolExecutor();
        executor.setRemoveOnCancelPolicy(true);
        executor.prestartAllCoreThreads();

        return scheduler;
    }
}
