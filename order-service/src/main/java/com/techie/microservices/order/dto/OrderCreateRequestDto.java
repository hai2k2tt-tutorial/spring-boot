package com.techie.microservices.order.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record OrderCreateRequestDto(
        UUID customerId,
        String status,
        CustomerDetailsDto customerDetails,
        List<OrderItemRequestDto> items
) {
    public record CustomerDetailsDto(String email, String firstName, String lastName) {}

    public record OrderItemRequestDto(
            UUID skuId,
            String skuCode,
            UUID productId,
            UUID shopId,
            BigDecimal price,
            Integer quantity
    ) {}
}
