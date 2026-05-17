package com.techie.microservices.payment.vo;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentHistoryResponseVo(
        UUID id,
        UUID customerId,
        UUID paymentId,
        String type,
        BigDecimal amount,
        Instant createdAt
) {
}
