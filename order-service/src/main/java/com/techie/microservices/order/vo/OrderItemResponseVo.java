package com.techie.microservices.order.vo;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderItemResponseVo(
        UUID id,
        UUID skuId,
        UUID productId,
        UUID shopId,
        BigDecimal price,
        Integer quantity
) {
}
