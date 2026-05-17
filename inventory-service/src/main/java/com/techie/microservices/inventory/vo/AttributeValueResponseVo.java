package com.techie.microservices.inventory.vo;

import java.util.UUID;

public record AttributeValueResponseVo(
        UUID id,
        UUID attributeId,
        String value,
        Integer sortOrder
) {
}
