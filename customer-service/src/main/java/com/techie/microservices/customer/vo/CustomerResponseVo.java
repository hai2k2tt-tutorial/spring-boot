package com.techie.microservices.customer.vo;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CustomerResponseVo(
        UUID authId,
        String email,
        String status,
        UUID customerId,
        String firstName,
        String lastName,
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
