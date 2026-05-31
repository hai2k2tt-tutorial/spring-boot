package com.techie.microservices.inventory.vo;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AttributeResponseVo(
        UUID id,
        UUID productId,
        String code,
        String name,
        List<AttributeValueResponseVo> values,
        Instant createdAt,
        Instant updatedAt
) {
}
