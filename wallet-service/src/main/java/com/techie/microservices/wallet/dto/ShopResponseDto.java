package com.techie.microservices.wallet.dto;

import java.util.UUID;

public record ShopResponseDto(
        UUID shopId,
        String email,
        String shopName
) {
}
