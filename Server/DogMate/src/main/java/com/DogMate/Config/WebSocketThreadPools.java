package com.DogMate.Config;

import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.ThreadPoolExecutor;

final class WebSocketThreadPools {

    static final int SCHEDULER_POOL_SIZE = 4;
    static final int CHANNEL_CORE_POOL_SIZE = 4;
    static final int CHANNEL_MAX_POOL_SIZE = 8;
    static final int CHANNEL_QUEUE_CAPACITY = 1000;

    private WebSocketThreadPools() {
    }

    static ThreadPoolTaskScheduler createTaskScheduler() {
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

    static ThreadPoolTaskExecutor createChannelExecutor(String threadNamePrefix) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(CHANNEL_CORE_POOL_SIZE);
        executor.setMaxPoolSize(CHANNEL_MAX_POOL_SIZE);
        executor.setQueueCapacity(CHANNEL_QUEUE_CAPACITY);
        executor.setThreadNamePrefix(threadNamePrefix);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(15);
        executor.initialize();

        ThreadPoolExecutor threadPool = executor.getThreadPoolExecutor();
        threadPool.prestartAllCoreThreads();

        return executor;
    }
}
