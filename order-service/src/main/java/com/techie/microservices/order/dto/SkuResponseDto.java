package com.techie.microservices.order.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SkuResponseDto(
        UUID id,
        UUID productId,
        String skuCode,
        BigDecimal priceOverride,
        Integer quantity,
        List<UUID> attributeValueIds
) {
}
