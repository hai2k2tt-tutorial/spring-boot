package com.techie.microservices.order.dto;

import java.util.List;

public record OrderCreateRequestDto(
        String status,
        List<OrderItemRequestDto> items
) {
    public record OrderItemRequestDto(
            String skuCode,
            Integer quantity
    ) {}
}
