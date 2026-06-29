package com.techie.microservices.shop.vo;

import java.time.Instant;
import java.util.UUID;

public record ShopResponseVo(
        UUID authId,
        String email,
        String status,
        UUID shopId,
        String shopName,
        String ownerName,
        String phone,
        Instant authCreatedAt,
        Instant authUpdatedAt,
        Instant profileCreatedAt,
        Instant profileUpdatedAt
) {
}
