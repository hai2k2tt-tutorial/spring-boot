package com.techie.microservices.notification.dto;

import java.util.Map;

public record ShopNotificationCreateCommand(
        String shopId,
        String type,
        String title,
        String content,
        String linkUrl,
        Map<String, Object> metadata
) {
}