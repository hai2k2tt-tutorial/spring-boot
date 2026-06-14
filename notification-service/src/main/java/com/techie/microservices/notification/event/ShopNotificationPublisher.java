package com.techie.microservices.notification.event;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techie.microservices.notification.vo.ShopNotificationResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopNotificationPublisher {
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.notifications.shop-topic:shop-notifications}")
    private String topic;

    public void publish(ShopNotificationResponseVo notification) {
        try {
            redisTemplate.convertAndSend(topic, objectMapper.writeValueAsString(notification));
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize shop notification {}", notification.id(), ex);
        } catch (RuntimeException ex) {
            log.warn("Failed to publish shop notification {}", notification.id(), ex);
        }
    }
}