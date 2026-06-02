package com.techie.microservices.order.service;

import com.techie.microservices.order.client.InventoryClient;
import com.techie.microservices.order.client.ProductClient;
import com.techie.microservices.order.dto.OrderCreateRequestDto;
import com.techie.microservices.order.dto.ProductResponseDto;
import com.techie.microservices.order.dto.ResolvedOrderItemDto;
import com.techie.microservices.order.dto.SkuResponseDto;
import com.techie.microservices.order.event.OrderPlacedEvent;
import com.techie.microservices.order.mapper.OrderMapper;
import com.techie.microservices.order.model.Order;
import com.techie.microservices.order.model.OrderItem;
import com.techie.microservices.order.repository.OrderRepository;
import com.techie.microservices.order.repository.OrderItemRepository;
import com.techie.microservices.order.util.TokenIdentity;
import com.techie.microservices.order.vo.OrderResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final InventoryClient inventoryClient;
    private final ProductClient productClient;
    private final KafkaTemplate<String, OrderPlacedEvent> kafkaTemplate;
    private final OrderMapper orderMapper;
    private final TokenIdentity tokenIdentity;

    @Transactional
    public OrderResponseVo placeOrder(OrderCreateRequestDto orderCreateRequestDto, String authorization, String idempotencyKey) {
        validateRequest(orderCreateRequestDto);
        TokenIdentity.CurrentCustomer currentCustomer = tokenIdentity.currentCustomer(authorization);
        Order existingOrder = findExistingOrder(currentCustomer.id(), idempotencyKey);
        if (existingOrder != null) {
            return orderMapper.toVo(existingOrder, orderItemRepository.findAllByOrderId(existingOrder.getId()));
        }

        List<ResolvedOrderItemDto> resolvedItems = orderCreateRequestDto.items().stream()
                .map(item -> resolveOrderItem(item, authorization))
                .toList();

        for (OrderCreateRequestDto.OrderItemRequestDto item : orderCreateRequestDto.items()) {
            var stockResponse = inventoryClient.isInStock(item.skuCode(), item.quantity(), authorization);
            if (!stockResponse.inStock()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Product with skuCode " + item.skuCode() + " is not in stock");
            }
        }

        String orderNumber = UUID.randomUUID().toString();
        Order order = orderMapper.toEntity(orderCreateRequestDto, orderNumber, currentCustomer.id(), normalizeIdempotencyKey(idempotencyKey), resolvedItems);
        orderRepository.save(order);

        List<OrderItem> orderItems = resolvedItems.stream()
                .map(item -> orderMapper.toEntity(order, item))
                .map(orderItemRepository::save)
                .toList();

        OrderPlacedEvent orderPlacedEvent = new OrderPlacedEvent();
        orderPlacedEvent.setOrderNumber(order.getOrderNumber());
        orderPlacedEvent.setEmail(currentCustomer.email());
        orderPlacedEvent.setFirstName(currentCustomer.firstName());
        orderPlacedEvent.setLastName(currentCustomer.lastName());
        log.info("Start - Sending OrderPlacedEvent {} to Kafka topic order-placed", orderPlacedEvent);
        kafkaTemplate.send("order-placed", orderPlacedEvent);
        log.info("End - Sending OrderPlacedEvent {} to Kafka topic order-placed", orderPlacedEvent);
        return orderMapper.toVo(order, orderItems);
    }

    private Order findExistingOrder(UUID customerId, String idempotencyKey) {
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);
        if (normalizedKey == null) {
            return null;
        }
        return orderRepository.findByCustomerIdAndIdempotencyKey(customerId.toString(), normalizedKey).orElse(null);
    }

    private String normalizeIdempotencyKey(String idempotencyKey) {
        return idempotencyKey == null || idempotencyKey.isBlank() ? null : idempotencyKey.trim();
    }

    @Transactional(readOnly = true)
    public List<OrderResponseVo> getOrders(UUID customerId) {
        List<Order> orders = customerId == null
                ? orderRepository.findAll()
                : orderRepository.findAllByCustomerId(customerId.toString());
        return orders.stream()
                .map(order -> orderMapper.toVo(order, orderItemRepository.findAllByOrderId(order.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponseVo getOrder(UUID orderId, String authorization) {
        UUID customerId = tokenIdentity.currentCustomer(authorization).id();
        Order order = orderRepository.findById(orderId.toString())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        if (!customerId.toString().equals(order.getCustomerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Order does not belong to current customer");
        }
        return orderMapper.toVo(order, orderItemRepository.findAllByOrderId(order.getId()));
    }

    private ResolvedOrderItemDto resolveOrderItem(OrderCreateRequestDto.OrderItemRequestDto item, String authorization) {
        SkuResponseDto sku = inventoryClient.getSku(item.skuCode(), authorization);
        ProductResponseDto product = productClient.getProduct(sku.productId().toString(), authorization);
        BigDecimal price = sku.priceOverride() != null ? sku.priceOverride() : product.price();
        return new ResolvedOrderItemDto(sku.id(), sku.skuCode(), product.id(), product.shopId(), price, item.quantity());
    }

    private void validateRequest(OrderCreateRequestDto orderCreateRequestDto) {
        if (orderCreateRequestDto.items() == null || orderCreateRequestDto.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one order item is required");
        }
        for (OrderCreateRequestDto.OrderItemRequestDto item : orderCreateRequestDto.items()) {
            if (item.skuCode() == null || item.skuCode().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SKU code is required");
            }
            if (item.quantity() == null || item.quantity() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than zero");
            }
        }
    }
}
