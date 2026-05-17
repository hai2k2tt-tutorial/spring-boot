package com.techie.microservices.shop.dto;

import java.math.BigDecimal;

public record ShopCreateRequestDto(
        String email,
        String passwordHash,
        String status,
        String shopName,
        String ownerName,
        String phone,
        BigDecimal initialBalance,
        String currency
) {
}
