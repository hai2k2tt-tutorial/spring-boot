package com.techie.microservices.inventory.dto;

import java.util.List;
import java.util.UUID;

public record AttributeRequestDto(
        UUID productId,
        String code,
        String name,
        List<AttributeValueRequestDto> values
) {
}
