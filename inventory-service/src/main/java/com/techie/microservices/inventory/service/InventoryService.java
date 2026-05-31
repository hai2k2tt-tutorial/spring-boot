package com.techie.microservices.inventory.service;

import com.techie.microservices.inventory.dto.AttributeRequestDto;
import com.techie.microservices.inventory.dto.AttributeValueRequestDto;
import com.techie.microservices.inventory.dto.SkuRequestDto;
import com.techie.microservices.inventory.mapper.AttributeMapper;
import com.techie.microservices.inventory.mapper.SkuMapper;
import com.techie.microservices.inventory.model.Attribute;
import com.techie.microservices.inventory.model.AttributeValue;
import com.techie.microservices.inventory.model.Inventory;
import com.techie.microservices.inventory.model.Sku;
import com.techie.microservices.inventory.model.SkuAttributeValue;
import com.techie.microservices.inventory.repository.AttributeRepository;
import com.techie.microservices.inventory.repository.AttributeValueRepository;
import com.techie.microservices.inventory.repository.InventoryRepository;
import com.techie.microservices.inventory.repository.SkuAttributeValueRepository;
import com.techie.microservices.inventory.repository.SkuRepository;
import com.techie.microservices.inventory.vo.AttributeResponseVo;
import com.techie.microservices.inventory.vo.AttributeValueResponseVo;
import com.techie.microservices.inventory.vo.InventoryCheckResponseVo;
import com.techie.microservices.inventory.vo.SkuResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final AttributeRepository attributeRepository;
    private final AttributeValueRepository attributeValueRepository;
    private final SkuRepository skuRepository;
    private final SkuAttributeValueRepository skuAttributeValueRepository;
    private final InventoryRepository inventoryRepository;
    private final AttributeMapper attributeMapper;
    private final SkuMapper skuMapper;

    @Transactional
    public AttributeResponseVo createAttribute(AttributeRequestDto attributeRequestDto) {
        String productId = attributeRequestDto.productId().toString();
        if (attributeRepository.existsByProductIdAndCode(productId, attributeRequestDto.code())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Attribute code already exists for product");
        }
        Attribute attribute = attributeMapper.toEntity(attributeRequestDto);
        attributeRepository.save(attribute);
        log.info("Attribute created successfully");
        return attributeMapper.toVo(attribute);
    }

    @Transactional
    public AttributeValueResponseVo createAttributeValue(UUID attributeId, AttributeValueRequestDto attributeValueRequestDto) {
        Attribute attribute = attributeRepository.findById(attributeId.toString())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attribute not found"));
        AttributeValue attributeValue = attributeMapper.toEntity(attribute, attributeValueRequestDto);
        attributeValueRepository.save(attributeValue);
        log.info("Attribute value created successfully");
        return attributeMapper.toVo(attributeValue);
    }

    @Transactional(readOnly = true)
    public List<AttributeResponseVo> getAttributes(UUID productId) {
        return attributeRepository.findAllByProductId(productId.toString()).stream()
                .map(attributeMapper::toVo)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AttributeValueResponseVo> getAttributeValues(UUID attributeId) {
        return attributeValueRepository.findAllByAttributeIdOrderBySortOrderAsc(attributeId.toString()).stream()
                .map(attributeMapper::toVo)
                .toList();
    }

    @Transactional
    public SkuResponseVo createSku(SkuRequestDto skuRequestDto) {
        if (skuRequestDto.attributeValueIds() == null || skuRequestDto.attributeValueIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one attribute value is required");
        }
        if (skuRequestDto.quantity() == null || skuRequestDto.quantity() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be zero or greater");
        }

        Sku sku = skuRepository.save(skuMapper.toEntity(skuRequestDto));

        List<String> attributeValueIds = skuRequestDto.attributeValueIds().stream()
                .map(UUID::toString)
                .toList();
        List<AttributeValue> attributeValues = attributeValueRepository.findAllByIdIn(attributeValueIds);
        if (attributeValues.size() != attributeValueIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more attribute values were not found");
        }

        for (AttributeValue attributeValue : attributeValues) {
            if (!attributeValue.getAttribute().getProductId().equals(sku.getProductId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attribute value does not belong to product");
            }
            skuAttributeValueRepository.save(SkuAttributeValue.builder()
                    .sku(sku)
                    .attributeValue(attributeValue)
                    .build());
        }

        Inventory inventory = inventoryRepository.save(skuMapper.toInventoryEntity(sku, skuRequestDto.quantity()));

        log.info("SKU created successfully");
        return skuMapper.toVo(sku, inventory, skuRequestDto.attributeValueIds());
    }

    @Transactional(readOnly = true)
    public List<SkuResponseVo> getSkus(UUID productId) {
        return skuRepository.findAllByProductId(productId.toString()).stream()
                .map(this::mapSku)
                .toList();
    }

    @Transactional(readOnly = true)
    public SkuResponseVo getSku(String skuCode) {
        Sku sku = skuRepository.findBySkuCode(skuCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "SKU not found"));
        return mapSku(sku);
    }

    @Transactional(readOnly = true)
    public InventoryCheckResponseVo isInStock(String skuCode, Integer quantity) {
        Inventory inventory = inventoryRepository.findBySkuSkuCode(skuCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "SKU not found"));
        boolean inStock = inventory.getQuantity() >= quantity;
        log.info("Stock checked for skuCode {}", skuCode);
        return skuMapper.toInventoryCheckVo(skuCode, quantity, inStock);
    }

    private SkuResponseVo mapSku(Sku sku) {
        Inventory inventory = inventoryRepository.findBySkuId(sku.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory not found for SKU"));
        List<UUID> attributeValueIds = skuAttributeValueRepository.findAllBySkuId(sku.getId()).stream()
                .map(skuAttributeValue -> UUID.fromString(skuAttributeValue.getAttributeValue().getId()))
                .sorted(Comparator.comparing(UUID::toString))
                .toList();
        return skuMapper.toVo(sku, inventory, attributeValueIds);
    }
}
