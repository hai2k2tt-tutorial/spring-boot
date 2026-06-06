package com.techie.microservices.order.vo;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderItemResponseVo(
        UUID id,
        UUID skuId,
        String skuCode,
        UUID productId,
        UUID shopId,
        BigDecimal price,
        Integer quantity
) {
}
