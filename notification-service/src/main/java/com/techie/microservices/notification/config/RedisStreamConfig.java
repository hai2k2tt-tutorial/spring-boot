package com.techie.microservices.notification.config;

import com.techie.microservices.notification.listener.NotificationStreamListener;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.RedisSystemException;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.stream.StreamMessageListenerContainer;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Configuration
@RequiredArgsConstructor
public class RedisStreamConfig {
    public static final String ORDER_EVENTS_STREAM = "order-events";
    public static final String NOTIFICATION_GROUP = "notification-service";
    public static final String NOTIFICATION_CONSUMER = "notification-service-1";

    private final StringRedisTemplate redisTemplate;

    @Bean
    StreamMessageListenerContainer<String, MapRecord<String, String, String>> redisStreamListenerContainer(
            RedisConnectionFactory redisConnectionFactory,
            NotificationStreamListener listener
    ) {
        initializeConsumerGroup();

        StreamMessageListenerContainer.StreamMessageListenerContainerOptions<String, MapRecord<String, String, String>> options = StreamMessageListenerContainer
                .StreamMessageListenerContainerOptions
                .builder()
                .pollTimeout(Duration.ofSeconds(2))
                .build();

        StreamMessageListenerContainer<String, MapRecord<String, String, String>> container = StreamMessageListenerContainer.create(redisConnectionFactory, options);

        container.receive(Consumer.from(NOTIFICATION_GROUP, NOTIFICATION_CONSUMER),
                StreamOffset.create(ORDER_EVENTS_STREAM, ReadOffset.lastConsumed()), listener);

        container.start();
        return container;
    }

    private void initializeConsumerGroup() {
        try {
            redisTemplate.execute((RedisCallback<Void>) connection -> {
                connection.streamCommands().xGroupCreate(
                        ORDER_EVENTS_STREAM.getBytes(StandardCharsets.UTF_8),
                        NOTIFICATION_GROUP,
                        ReadOffset.from("0-0"),
                        true
                );
                return null;
            });
        } catch (RedisSystemException ex) {
            if (!isConsumerGroupAlreadyCreated(ex)) {
                throw ex;
            }
        }
    }

    private boolean isConsumerGroupAlreadyCreated(RedisSystemException ex) {
        String message = ex.getMessage();
        return message != null && message.contains("BUSYGROUP");
    }
}
