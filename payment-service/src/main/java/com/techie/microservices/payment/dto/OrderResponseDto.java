package com.techie.microservices.payment.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record OrderResponseDto(
        UUID id,
        String orderNumber,
        UUID customerId,
        String status,
        BigDecimal totalAmount,
        List<OrderItemResponseDto> items
) {
    public record OrderItemResponseDto(
            UUID id,
            UUID skuId,
            UUID productId,
            UUID shopId,
            BigDecimal price,
            Integer quantity
    ) {
    }
}
