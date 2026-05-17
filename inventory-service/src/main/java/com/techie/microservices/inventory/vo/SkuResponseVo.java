package com.techie.microservices.inventory.vo;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SkuResponseVo(
        UUID id,
        UUID productId,
        String skuCode,
        BigDecimal priceOverride,
        Integer quantity,
        List<UUID> attributeValueIds,
        Instant createdAt,
        Instant updatedAt
) {
}
