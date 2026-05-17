package com.techie.microservices.inventory.vo;

public record InventoryCheckResponseVo(
        String skuCode,
        Integer requestedQuantity,
        boolean inStock
) {
}
