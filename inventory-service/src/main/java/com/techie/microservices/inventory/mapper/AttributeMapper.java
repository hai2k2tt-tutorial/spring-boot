package com.techie.microservices.inventory.mapper;

import com.techie.microservices.inventory.dto.AttributeRequestDto;
import com.techie.microservices.inventory.dto.AttributeValueRequestDto;
import com.techie.microservices.inventory.model.Attribute;
import com.techie.microservices.inventory.model.AttributeInputType;
import com.techie.microservices.inventory.model.AttributeValue;
import com.techie.microservices.inventory.vo.AttributeResponseVo;
import com.techie.microservices.inventory.vo.AttributeValueResponseVo;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class AttributeMapper {

    public Attribute toEntity(AttributeRequestDto attributeRequestDto) {
        return Attribute.builder()
                .productId(attributeRequestDto.productId().toString())
                .code(attributeRequestDto.code().trim())
                .name(attributeRequestDto.name().trim())
                .inputType(AttributeInputType.SELECT)
                .build();
    }

    public AttributeValue toEntity(Attribute attribute, AttributeValueRequestDto attributeValueRequestDto) {
        return AttributeValue.builder()
                .attribute(attribute)
                .value(attributeValueRequestDto.value().trim())
                .sortOrder(attributeValueRequestDto.sortOrder())
                .build();
    }

    public AttributeResponseVo toVo(Attribute attribute, List<AttributeValueResponseVo> values) {
        return new AttributeResponseVo(
                UUID.fromString(attribute.getId()),
                UUID.fromString(attribute.getProductId()),
                attribute.getCode(),
                attribute.getName(),
                values,
                attribute.getCreatedAt(),
                attribute.getUpdatedAt()
        );
    }

    public AttributeValueResponseVo toVo(AttributeValue attributeValue) {
        return new AttributeValueResponseVo(
                UUID.fromString(attributeValue.getId()),
                UUID.fromString(attributeValue.getAttribute().getId()),
                attributeValue.getValue(),
                attributeValue.getSortOrder()
        );
    }

    public AttributeResponseVo toVo(Attribute attribute) {
        return toVo(attribute, List.of());
    }
}
