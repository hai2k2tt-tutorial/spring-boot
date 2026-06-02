package com.techie.microservices.order.dto;

import java.util.UUID;

public record PaymentCreateRequestDto(
        UUID orderId,
        String method
) {
}
