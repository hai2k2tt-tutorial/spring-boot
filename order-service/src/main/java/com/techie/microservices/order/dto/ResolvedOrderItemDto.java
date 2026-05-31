package com.techie.microservices.order.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ResolvedOrderItemDto(
        UUID skuId,
        String skuCode,
        UUID productId,
        UUID shopId,
        BigDecimal price,
        Integer quantity
) {
}
