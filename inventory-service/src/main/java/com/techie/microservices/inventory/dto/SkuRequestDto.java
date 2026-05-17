package com.techie.microservices.inventory.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SkuRequestDto(
        UUID productId,
        String skuCode,
        BigDecimal priceOverride,
        List<UUID> attributeValueIds,
        Integer quantity
) {
}
