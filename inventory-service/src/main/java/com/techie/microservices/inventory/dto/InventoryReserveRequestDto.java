package com.techie.microservices.inventory.dto;

import java.util.List;
import java.util.UUID;

public record InventoryReserveRequestDto(
        UUID orderId,
        List<ItemRequestDto> items
) {
    public record ItemRequestDto(
            UUID skuId,
            Integer quantity
    ) {
    }
}
