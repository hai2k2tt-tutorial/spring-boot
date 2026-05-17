package com.techie.microservices.inventory.vo;

import java.time.Instant;
import java.util.UUID;

public record AttributeResponseVo(
        UUID id,
        UUID productId,
        String code,
        String name,
        String inputType,
        Instant createdAt,
        Instant updatedAt
) {
}
