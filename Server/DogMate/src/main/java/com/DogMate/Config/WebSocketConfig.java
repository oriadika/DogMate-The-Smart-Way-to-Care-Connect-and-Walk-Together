package com.DogMate.Config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration(proxyBeanMethods = false)
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebSocketConfig.class);

    private final ThreadPoolTaskScheduler messageBrokerTaskScheduler;

    public WebSocketConfig(
            @Qualifier("messageBrokerTaskScheduler") ThreadPoolTaskScheduler messageBrokerTaskScheduler
    ) {
        this.messageBrokerTaskScheduler = messageBrokerTaskScheduler;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic")
                .setTaskScheduler(messageBrokerTaskScheduler);
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.taskExecutor()
                .corePoolSize(WebSocketThreadPools.CHANNEL_CORE_POOL_SIZE)
                .maxPoolSize(WebSocketThreadPools.CHANNEL_MAX_POOL_SIZE)
                .queueCapacity(WebSocketThreadPools.CHANNEL_QUEUE_CAPACITY);
    }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) {
        registration.taskExecutor()
                .corePoolSize(WebSocketThreadPools.CHANNEL_CORE_POOL_SIZE)
                .maxPoolSize(WebSocketThreadPools.CHANNEL_MAX_POOL_SIZE)
                .queueCapacity(WebSocketThreadPools.CHANNEL_QUEUE_CAPACITY);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws-ping")
                .setAllowedOriginPatterns("*")
                .withSockJS()
                .setTaskScheduler(messageBrokerTaskScheduler);

        log.info(
                "SockJS endpoint registered with messageBrokerTaskScheduler poolSize={}",
                messageBrokerTaskScheduler.getScheduledThreadPoolExecutor().getPoolSize()
        );
    }
}
