package com.techie.microservices.order.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductResponseDto(
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
