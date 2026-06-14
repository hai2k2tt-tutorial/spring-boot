package com.techie.microservices.notification.config;

import com.techie.microservices.notification.service.ShopNotificationRealtimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
@RequiredArgsConstructor
public class ShopNotificationRedisConfig {
    private final ShopNotificationRealtimeService shopNotificationRealtimeService;

    @Value("${app.notifications.shop-topic:shop-notifications}")
    private String shopNotificationTopic;

    @Bean
    RedisMessageListenerContainer shopNotificationRedisMessageListenerContainer(RedisConnectionFactory connectionFactory) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(shopNotificationRealtimeService, new ChannelTopic(shopNotificationTopic));
        return container;
    }
}