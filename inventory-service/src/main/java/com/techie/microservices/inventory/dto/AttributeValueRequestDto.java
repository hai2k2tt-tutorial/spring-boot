package com.techie.microservices.inventory.dto;

public record AttributeValueRequestDto(
        String value,
        Integer sortOrder
) {
}
