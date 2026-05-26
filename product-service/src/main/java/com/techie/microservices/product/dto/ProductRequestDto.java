package com.techie.microservices.product.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductRequestDto(
        UUID id,
        UUID shopId,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        UUID categoryId,
        String status
) {
}
