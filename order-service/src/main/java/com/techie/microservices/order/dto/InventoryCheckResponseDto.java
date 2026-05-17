package com.techie.microservices.order.dto;

public record InventoryCheckResponseDto(
        String skuCode,
        Integer requestedQuantity,
        boolean inStock
) {
}
