package com.techie.microservices.payment.vo;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentResponseVo(
        UUID id,
        UUID customerId,
        UUID orderId,
        BigDecimal amount,
        String method,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
}
