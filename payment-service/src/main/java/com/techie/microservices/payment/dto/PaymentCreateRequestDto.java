package com.techie.microservices.payment.dto;

import java.util.UUID;

public record PaymentCreateRequestDto(
        UUID orderId,
        String method
) {
}
