package com.techie.microservices.product.dto;

import java.util.UUID;

public record ShopResponseDto(
        UUID shopId,
        String email,
        String shopName
) {
}
