package com.techie.microservices.notification.listener;

import com.techie.microservices.notification.config.RedisStreamConfig;
import com.techie.microservices.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.stream.StreamListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationStreamListener implements StreamListener<String, MapRecord<String, String, String>> {

    private final NotificationService notificationService;
    private final StringRedisTemplate redisTemplate;

    @Override
    public void onMessage(MapRecord<String, String, String> message) {
        Map<String, String> body = message.getValue();

        try {
            String eventType = body.get("eventType");
            if (eventType == null || eventType.isBlank()) {
                log.warn("Skipping Redis Stream message {} without eventType", message.getId());
                acknowledge(message);
                return;
            }

            switch (eventType) {
                case "ORDER_PLACED" -> notificationService.sendOrderPlacedEmail(body);
                case "ORDER_PAID" -> notificationService.sendOrderPaidEmail(body);
                default -> log.warn("Unknown event type {}", eventType);
            }

            acknowledge(message);
        } catch (Exception ex) {
            log.error("Failed to process Redis Stream message {}", message.getId(), ex);
        }
    }

    private void acknowledge(MapRecord<String, String, String> message) {
        redisTemplate.opsForStream().acknowledge(
                RedisStreamConfig.ORDER_EVENTS_STREAM,
                RedisStreamConfig.NOTIFICATION_GROUP,
                message.getId()
        );
    }
}
