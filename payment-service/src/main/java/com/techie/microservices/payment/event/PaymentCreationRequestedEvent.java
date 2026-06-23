package com.techie.microservices.payment.event;

import java.time.Instant;
import java.util.UUID;

public record PaymentCreationRequestedEvent(
        UUID eventId,
        UUID sagaId,
        UUID paymentId,
        UUID orderId,
        UUID customerId,
        String paymentMethod,
        String idempotencyKey,
        Instant createdAt
) {
}
