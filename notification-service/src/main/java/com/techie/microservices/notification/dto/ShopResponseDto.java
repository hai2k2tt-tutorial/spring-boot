package com.techie.microservices.notification.dto;

import java.util.UUID;

public record ShopResponseDto(
        UUID shopId,
        String email,
        String shopName
) {
}