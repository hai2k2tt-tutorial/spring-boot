package com.techie.microservices.payment.dto;

import java.util.UUID;

public record PaymentProviderWebhookRequestDto(
        UUID paymentId,
        String providerSessionId,
        String clientSecret,
        String status,
        String eventId
) {
}
