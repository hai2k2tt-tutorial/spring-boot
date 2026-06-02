package com.techie.microservices.order.dto;

import java.util.UUID;

public record InventoryReleaseRequestDto(
        UUID orderId
) {
}
