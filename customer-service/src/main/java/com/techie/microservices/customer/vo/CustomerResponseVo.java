package com.techie.microservices.customer.vo;

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
        Instant authCreatedAt,
        Instant authUpdatedAt,
        Instant profileCreatedAt,
        Instant profileUpdatedAt
) {
}
