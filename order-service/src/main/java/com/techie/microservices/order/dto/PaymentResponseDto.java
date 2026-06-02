package com.techie.microservices.order.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentResponseDto(
        UUID id,
        UUID customerId,
        UUID orderId,
        BigDecimal amount,
        String method,
        String status,
        String sessionStatus,
        String paymentUrl,
        String clientSecret,
        Instant createdAt,
        Instant updatedAt
) {
}
