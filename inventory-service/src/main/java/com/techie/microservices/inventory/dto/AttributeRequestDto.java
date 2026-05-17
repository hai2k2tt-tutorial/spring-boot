package com.techie.microservices.inventory.dto;

import java.util.UUID;

public record AttributeRequestDto(
        UUID productId,
        String code,
        String name,
        String inputType
) {
}
