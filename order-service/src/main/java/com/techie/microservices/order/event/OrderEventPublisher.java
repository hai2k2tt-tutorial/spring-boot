package com.techie.microservices.order.event;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OrderEventPublisher {
    private static final String ORDER_EVENTS_STREAM = "order-events";
    private static final String ORDER_CONTACT_KEY_PREFIX = "order-contact:";

    private final StringRedisTemplate redisTemplate;

    public void publishOrderPlaced(OrderPlacedEvent event) {
        Map<String, String> body = Map.of(
                "eventType", "ORDER_PLACED",
                "orderId", event.orderId(),
                "orderNumber", event.orderNumber(),
                "customerId", event.customerId(),
                "email", event.email(),
                "firstName", event.firstName(),
                "lastName", event.lastName()
        );

        redisTemplate.<String, String>opsForHash().putAll(orderContactKey(event.orderId()), Map.of(
                "email", event.email(),
                "firstName", event.firstName(),
                "lastName", event.lastName()
        ));
        redisTemplate.opsForStream().add(ORDER_EVENTS_STREAM, body);
    }

    public void publishOrderPaid(OrderPaidEvent event) {
        Map<String, String> body = new HashMap<>();
        body.put("eventType", "ORDER_PAID");
        body.put("orderId", event.orderId());
        body.put("orderNumber", event.orderNumber());
        body.put("customerId", event.customerId());
        putIfNotBlank(body, "paymentId", event.paymentId());
        putIfNotBlank(body, "paidAt", event.paidAt());

        Map<String, String> contact = redisTemplate.<String, String>opsForHash().entries(orderContactKey(event.orderId()));
        putIfNotBlank(body, "email", firstNonBlank(event.email(), contact.get("email")));
        putIfNotBlank(body, "firstName", firstNonBlank(event.firstName(), contact.get("firstName")));
        putIfNotBlank(body, "lastName", firstNonBlank(event.lastName(), contact.get("lastName")));
        if (event.shopIds() != null && !event.shopIds().isEmpty()) {
            body.put("shopIds", String.join(",", event.shopIds()));
        }

        redisTemplate.opsForStream().add(ORDER_EVENTS_STREAM, body);
    }

    private String orderContactKey(String orderId) {
        return ORDER_CONTACT_KEY_PREFIX + orderId;
    }

    private void putIfNotBlank(Map<String, String> body, String key, String value) {
        if (value != null && !value.isBlank()) {
            body.put(key, value);
        }
    }

    private String firstNonBlank(String first, String second) {
        return first != null && !first.isBlank() ? first : second;
    }
}
