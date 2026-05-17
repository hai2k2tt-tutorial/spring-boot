package com.techie.microservices.product.vo;

import java.time.Instant;
import java.util.UUID;

public record CategoryResponseVo(
        UUID id,
        String name,
        UUID parentId,
        Instant createdAt,
        Instant updatedAt
) {
}
