package com.techie.microservices.wallet.dto;

import java.util.UUID;

public record CustomerResponseDto(
        UUID customerId,
        String email
) {
}
