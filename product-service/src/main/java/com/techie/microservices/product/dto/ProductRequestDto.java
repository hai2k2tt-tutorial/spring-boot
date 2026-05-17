package com.techie.microservices.product.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductRequestDto(
        UUID shopId,
        String name,
        String description,
        BigDecimal price,
        String imageUrl,
        UUID categoryId,
        String status
) {
}
