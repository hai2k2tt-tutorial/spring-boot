package com.techie.microservices.order.dto;

import java.util.UUID;

public record ShopResponseDto(
        UUID shopId,
        String email,
        String shopName
) {
}
