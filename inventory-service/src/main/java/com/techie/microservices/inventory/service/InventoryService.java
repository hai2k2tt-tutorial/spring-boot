package com.techie.microservices.inventory.service;

import com.techie.microservices.inventory.dto.AttributeRequestDto;
import com.techie.microservices.inventory.dto.AttributeValueRequestDto;
import com.techie.microservices.inventory.dto.InventoryDeductRequestDto;
import com.techie.microservices.inventory.dto.InventoryReleaseRequestDto;
import com.techie.microservices.inventory.dto.InventoryReserveRequestDto;
import com.techie.microservices.inventory.dto.SkuRequestDto;
import com.techie.microservices.inventory.mapper.AttributeMapper;
import com.techie.microservices.inventory.mapper.SkuMapper;
import com.techie.microservices.inventory.model.Attribute;
import com.techie.microservices.inventory.model.AttributeValue;
import com.techie.microservices.inventory.model.Inventory;
import com.techie.microservices.inventory.model.InventoryReservation;
import com.techie.microservices.inventory.model.Sku;
import com.techie.microservices.inventory.model.SkuAttributeValue;
import com.techie.microservices.inventory.repository.AttributeRepository;
import com.techie.microservices.inventory.repository.AttributeValueRepository;
import com.techie.microservices.inventory.repository.InventoryRepository;
import com.techie.microservices.inventory.repository.InventoryReservationRepository;
import com.techie.microservices.inventory.repository.SkuAttributeValueRepository;
import com.techie.microservices.inventory.repository.SkuRepository;
import com.techie.microservices.inventory.vo.AttributeResponseVo;
import com.techie.microservices.inventory.vo.InventoryCheckResponseVo;
import com.techie.microservices.inventory.vo.SkuResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final AttributeRepository attributeRepository;
    private final AttributeValueRepository attributeValueRepository;
    private final SkuRepository skuRepository;
    private final SkuAttributeValueRepository skuAttributeValueRepository;
    private final InventoryRepository inventoryRepository;
    private final InventoryReservationRepository inventoryReservationRepository;
    private final AttributeMapper attributeMapper;
    private final SkuMapper skuMapper;

    @Transactional
    public AttributeResponseVo createAttribute(AttributeRequestDto attributeRequestDto) {
        validateAttributeRequest(attributeRequestDto);
        String productId = attributeRequestDto.productId().toString();
        if (attributeRepository.existsByProductIdAndCode(productId, attributeRequestDto.code().trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Attribute code already exists for product");
        }
        Attribute attribute = attributeMapper.toEntity(attributeRequestDto);
        attributeRepository.save(attribute);
        List<AttributeValue> attributeValues = new ArrayList<>();
        IntStream.range(0, attributeRequestDto.values().size()).forEach(index -> {
            var requestValue = attributeRequestDto.values().get(index);
            Integer sortOrder = requestValue.sortOrder() != null ? requestValue.sortOrder() : index;
            AttributeValue attributeValue = attributeMapper.toEntity(
                    attribute,
                    new AttributeValueRequestDto(requestValue.value(), sortOrder)
            );
            attributeValues.add(attributeValue);
        });
        List<AttributeValue> savedValues = attributeValueRepository.saveAll(attributeValues);
        List<com.techie.microservices.inventory.vo.AttributeValueResponseVo> responseValues = savedValues.stream()
                .sorted(Comparator.comparing(AttributeValue::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                .map(attributeMapper::toVo)
                .toList();
        log.info("Attribute created successfully");
        return attributeMapper.toVo(attribute, responseValues);
    }

    @Transactional(readOnly = true)
    public List<AttributeResponseVo> getAttributes(UUID productId) {
        List<Attribute> attributes = attributeRepository.findAllByProductId(productId.toString());
        List<String> attributeIds = attributes.stream()
                .map(Attribute::getId)
                .toList();
        Map<String, List<AttributeValue>> valuesByAttributeId = attributeIds.isEmpty()
                ? Map.of()
                : attributeValueRepository.findAllByAttributeIds(attributeIds).stream()
                .collect(Collectors.groupingBy(value -> value.getAttribute().getId()));
        return attributes.stream()
                .map(attribute -> attributeMapper.toVo(attribute, valuesByAttributeId.getOrDefault(attribute.getId(), List.of()).stream()
                        .sorted(Comparator.comparing(AttributeValue::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                        .map(attributeMapper::toVo)
                        .toList()))
                .toList();
    }

    @Transactional
    public SkuResponseVo createSku(SkuRequestDto skuRequestDto) {
        validateSkuRequest(skuRequestDto);

        List<String> attributeValueIds = skuRequestDto.attributeValueIds().stream()
                .map(UUID::toString)
                .toList();
        List<AttributeValue> attributeValues = attributeValueRepository.findAllByIdIn(attributeValueIds);
        if (attributeValues.size() != attributeValueIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more attribute values were not found");
        }
        validateSingleAttributeValuePerAttribute(attributeValues);
        validateSkuAttributeCombinationIsUnique(skuRequestDto.productId().toString(), attributeValueIds);

        for (AttributeValue attributeValue : attributeValues) {
            if (!attributeValue.getAttribute().getProductId().equals(skuRequestDto.productId().toString())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attribute value does not belong to product");
            }
        }

        Sku sku = skuRepository.save(skuMapper.toEntity(skuRequestDto));

        for (AttributeValue attributeValue : attributeValues) {
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

    @Transactional
    public void reserveStock(InventoryReserveRequestDto request) {
        validateReserveRequest(request);
        String orderId = request.orderId() == null ? null : request.orderId().toString();
        Map<UUID, Integer> requestedQuantities = aggregateRequestedQuantities(request.items());

        if (orderId != null) {
            List<InventoryReservation> existingReservations = inventoryReservationRepository.findAllByOrderId(orderId);
            if (!existingReservations.isEmpty()) {
                validateExistingReservation(existingReservations, requestedQuantities);
                return;
            }
        }

        requestedQuantities.forEach((skuId, quantity) -> {
            Inventory inventory = inventoryRepository.findBySkuIdForUpdate(skuId.toString())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory not found for SKU"));
            if (inventory.getQuantity() < quantity) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient stock for skuId " + skuId);
            }
            inventory.setQuantity(inventory.getQuantity() - quantity);
            inventoryRepository.save(inventory);
            if (orderId != null) {
                inventoryReservationRepository.save(InventoryReservation.builder()
                        .orderId(orderId)
                        .skuId(skuId.toString())
                        .quantity(quantity)
                        .build());
            }
            log.info("Reserved {} item(s) from skuId {}", quantity, skuId);
        });
    }

    @Transactional
    public void releaseStock(InventoryReleaseRequestDto request) {
        if (request == null || request.orderId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order id is required");
        }

        String orderId = request.orderId().toString();
        List<InventoryReservation> reservations = inventoryReservationRepository.findAllByOrderId(orderId);
        if (reservations.isEmpty()) {
            return;
        }

        reservations.forEach(reservation -> {
            Inventory inventory = inventoryRepository.findBySkuIdForUpdate(reservation.getSkuId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory not found for SKU"));
            inventory.setQuantity(inventory.getQuantity() + reservation.getQuantity());
            inventoryRepository.save(inventory);
            log.info("Released {} item(s) back to skuId {}", reservation.getQuantity(), reservation.getSkuId());
        });

        inventoryReservationRepository.deleteAll(reservations);
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

    private void validateAttributeRequest(AttributeRequestDto attributeRequestDto) {
        if (attributeRequestDto == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attribute request is required");
        }
        if (attributeRequestDto.productId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product id is required");
        }
        if (!hasText(attributeRequestDto.code())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attribute code is required");
        }
        if (!hasText(attributeRequestDto.name())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attribute name is required");
        }
        if (attributeRequestDto.values() == null || attributeRequestDto.values().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attribute values are required");
        }
        if (attributeRequestDto.values().stream().anyMatch(value -> value == null || !hasText(value.value()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attribute value is required");
        }
    }

    private void validateSkuRequest(SkuRequestDto skuRequestDto) {
        if (skuRequestDto == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SKU request is required");
        }
        if (skuRequestDto.productId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product id is required");
        }
        if (!hasText(skuRequestDto.skuCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SKU code is required");
        }
        if (skuRequestDto.attributeValueIds() == null || skuRequestDto.attributeValueIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one attribute value is required");
        }
        if (new HashSet<>(skuRequestDto.attributeValueIds()).size() != skuRequestDto.attributeValueIds().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only one value can be selected for each attribute");
        }
        if (skuRequestDto.quantity() == null || skuRequestDto.quantity() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be zero or greater");
        }
    }

    private Map<UUID, Integer> aggregateRequestedQuantities(List<InventoryReserveRequestDto.ItemRequestDto> items) {
        return items.stream()
                .collect(Collectors.groupingBy(
                        InventoryReserveRequestDto.ItemRequestDto::skuId,
                        Collectors.summingInt(InventoryReserveRequestDto.ItemRequestDto::quantity)
                ));
    }

    private void validateReserveRequest(InventoryReserveRequestDto request) {
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one inventory item is required");
        }
        for (InventoryReserveRequestDto.ItemRequestDto item : request.items()) {
            if (item == null || item.skuId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SKU id is required");
            }
            if (item.quantity() == null || item.quantity() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than zero");
            }
        }
    }

    private void validateExistingReservation(List<InventoryReservation> existingReservations, Map<UUID, Integer> requestedQuantities) {
        Map<String, Integer> existingQuantities = existingReservations.stream()
                .collect(Collectors.toMap(InventoryReservation::getSkuId, InventoryReservation::getQuantity));
        Map<String, Integer> requestedBySkuId = requestedQuantities.entrySet().stream()
                .collect(Collectors.toMap(entry -> entry.getKey().toString(), Map.Entry::getValue));

        if (!existingQuantities.equals(requestedBySkuId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Existing reservation does not match requested inventory");
        }
    }

    private void validateSingleAttributeValuePerAttribute(List<AttributeValue> attributeValues) {
        boolean hasDuplicateAttribute = attributeValues.stream()
                .collect(Collectors.groupingBy(attributeValue -> attributeValue.getAttribute().getId(), Collectors.counting()))
                .values()
                .stream()
                .anyMatch(count -> count > 1);
        if (hasDuplicateAttribute) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only one value can be selected for each attribute");
        }
    }

    private void validateSkuAttributeCombinationIsUnique(String productId, List<String> attributeValueIds) {
        Set<String> requestedAttributeValueIds = new HashSet<>(attributeValueIds);
        boolean hasExistingCombination = skuAttributeValueRepository.findAllByProductId(productId).stream()
                .collect(Collectors.groupingBy(skuAttributeValue -> skuAttributeValue.getSku().getId()))
                .values()
                .stream()
                .map(existingValues -> existingValues.stream()
                        .map(existingValue -> existingValue.getAttributeValue().getId())
                        .collect(Collectors.toSet()))
                .anyMatch(existingAttributeValueIds -> existingAttributeValueIds.equals(requestedAttributeValueIds));
        if (hasExistingCombination) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A SKU with the same attribute values already exists");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
