package com.techie.microservices.customer.dto;

import java.math.BigDecimal;

public record CustomerWalletUpdateRequestDto(
        BigDecimal balance,
        String currency
) {
}
