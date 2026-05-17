package com.techie.microservices.inventory.mapper;

import com.techie.microservices.inventory.dto.SkuRequestDto;
import com.techie.microservices.inventory.model.Inventory;
import com.techie.microservices.inventory.model.Sku;
import com.techie.microservices.inventory.vo.InventoryCheckResponseVo;
import com.techie.microservices.inventory.vo.SkuResponseVo;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class SkuMapper {

    public Sku toEntity(SkuRequestDto skuRequestDto) {
        return Sku.builder()
                .productId(skuRequestDto.productId().toString())
                .skuCode(skuRequestDto.skuCode())
                .priceOverride(skuRequestDto.priceOverride())
                .build();
    }

    public Inventory toInventoryEntity(Sku sku, Integer quantity) {
        return Inventory.builder()
                .sku(sku)
                .quantity(quantity)
                .build();
    }

    public SkuResponseVo toVo(Sku sku, Inventory inventory, List<UUID> attributeValueIds) {
        return new SkuResponseVo(
                UUID.fromString(sku.getId()),
                UUID.fromString(sku.getProductId()),
                sku.getSkuCode(),
                sku.getPriceOverride(),
                inventory.getQuantity(),
                attributeValueIds,
                sku.getCreatedAt(),
                sku.getUpdatedAt()
        );
    }

    public InventoryCheckResponseVo toInventoryCheckVo(String skuCode, Integer quantity, boolean inStock) {
        return new InventoryCheckResponseVo(skuCode, quantity, inStock);
    }
}
