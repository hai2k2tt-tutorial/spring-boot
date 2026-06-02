package com.techie.microservices.inventory.dto;

import java.util.List;
import java.util.UUID;

public record InventoryDeductRequestDto(
        List<ItemRequestDto> items
) {
    public record ItemRequestDto(
            UUID skuId,
            Integer quantity
    ) {
    }
}
