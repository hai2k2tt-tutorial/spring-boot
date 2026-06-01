package com.techie.microservices.product.vo;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProductResponseVo(
        UUID id,
        UUID shopId,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        UUID categoryId,
        String categoryName,
        String status,
        Instant createdAt,
        Instant updatedAt,
        Instant deletedAt
) {
}
