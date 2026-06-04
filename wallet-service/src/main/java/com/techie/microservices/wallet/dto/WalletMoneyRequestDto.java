package com.techie.microservices.wallet.dto;

import java.math.BigDecimal;

public record WalletMoneyRequestDto(
        BigDecimal amount,
        String currency,
        String externalRef,
        String description
) {
}
