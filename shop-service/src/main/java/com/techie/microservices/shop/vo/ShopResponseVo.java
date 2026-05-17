package com.techie.microservices.shop.vo;

import java.math.BigDecimal;
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
        BigDecimal balance,
        String currency,
        Instant authCreatedAt,
        Instant authUpdatedAt,
        Instant profileCreatedAt,
        Instant profileUpdatedAt,
        Instant walletUpdatedAt
) {
}
