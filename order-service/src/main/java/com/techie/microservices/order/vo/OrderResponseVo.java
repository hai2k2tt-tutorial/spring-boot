package com.techie.microservices.order.vo;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderResponseVo(
        UUID id,
        String orderNumber,
        UUID customerId,
        String status,
        BigDecimal totalAmount,
        List<OrderItemResponseVo> items,
        Instant createdAt,
        Instant updatedAt
) {
}
