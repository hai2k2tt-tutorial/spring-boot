package com.techie.microservices.product.dto;

import java.util.UUID;

public record CategoryRequestDto(
        String name,
        UUID parentId
) {
}
