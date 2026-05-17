package com.techie.microservices.shop.dto;

import java.math.BigDecimal;

public record ShopWalletUpdateRequestDto(
        BigDecimal balance,
        String currency
) {
}
