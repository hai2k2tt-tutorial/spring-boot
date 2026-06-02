package com.techie.microservices.inventory.dto;

import java.util.UUID;

public record InventoryReleaseRequestDto(
        UUID orderId
) {
}
