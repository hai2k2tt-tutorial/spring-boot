package com.techie.microservices.payment.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentCreateRequestDto(
        UUID customerId,
        UUID orderId,
        BigDecimal amount,
        String method,
        String status
) {
}
