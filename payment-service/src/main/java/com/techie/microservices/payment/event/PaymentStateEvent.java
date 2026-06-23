package com.techie.microservices.payment.event;

import java.time.Instant;
import java.util.UUID;

public record PaymentStateEvent(
        UUID eventId,
        UUID sagaId,
        UUID paymentId,
        UUID orderId,
        UUID customerId,
        String eventType,
        String paymentStatus,
        String sessionStatus,
        Instant createdAt
) {
}
