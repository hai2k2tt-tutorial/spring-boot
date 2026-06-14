package com.techie.microservices.notification.vo;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ShopNotificationResponseVo(
        UUID id,
        UUID shopId,
        String type,
        String title,
        String content,
        String linkUrl,
        Map<String, Object> metadata,
        Instant createdAt,
        Instant readAt
) {
}