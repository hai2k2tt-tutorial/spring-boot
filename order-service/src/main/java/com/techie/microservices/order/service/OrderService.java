package com.techie.microservices.order.service;

import com.techie.microservices.order.client.InventoryClient;
import com.techie.microservices.order.client.ProductClient;
import com.techie.microservices.order.dto.InventoryReleaseRequestDto;
import com.techie.microservices.order.dto.InventoryReserveRequestDto;
import com.techie.microservices.order.dto.OrderCreateRequestDto;
import com.techie.microservices.order.dto.ProductResponseDto;
import com.techie.microservices.order.dto.ResolvedOrderItemDto;
import com.techie.microservices.order.dto.SkuResponseDto;
import com.techie.microservices.order.event.OrderPlacedEvent;
import com.techie.microservices.order.mapper.OrderMapper;
import com.techie.microservices.order.model.Order;
import com.techie.microservices.order.model.OrderItem;
import com.techie.microservices.order.model.OrderStatus;
import com.techie.microservices.order.repository.OrderRepository;
import com.techie.microservices.order.repository.OrderItemRepository;
import com.techie.microservices.order.util.TokenIdentity;
import com.techie.microservices.order.vo.OrderResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
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
    private final PlatformTransactionManager transactionManager;

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
        UUID orderId = resolveOrderId(currentCustomer.id(), normalizeIdempotencyKey(idempotencyKey));
        inventoryClient.reserveStock(new InventoryReserveRequestDto(orderId, resolvedItems.stream()
                .map(item -> new InventoryReserveRequestDto.ItemRequestDto(item.skuId(), item.quantity()))
                .toList()));

        try {
            return new TransactionTemplate(transactionManager).execute(status ->
                    saveOrderRecord(orderCreateRequestDto, currentCustomer, normalizeIdempotencyKey(idempotencyKey), resolvedItems, orderId));
        } catch (RuntimeException exception) {
            if (orderRepository.findById(orderId.toString()).isPresent()) {
                Order existingAfterFailure = orderRepository.findById(orderId.toString()).orElseThrow();
                return orderMapper.toVo(existingAfterFailure, orderItemRepository.findAllByOrderId(existingAfterFailure.getId()));
            }
            if (!(exception instanceof DataIntegrityViolationException)) {
                try {
                    inventoryClient.releaseStock(new InventoryReleaseRequestDto(orderId));
                } catch (RuntimeException releaseException) {
                    log.warn("Failed to release inventory for failed order {}", orderId, releaseException);
                }
            }
            throw exception;
        }
    }

    private OrderResponseVo saveOrderRecord(OrderCreateRequestDto orderCreateRequestDto,
                                            TokenIdentity.CurrentCustomer currentCustomer,
                                            String idempotencyKey,
                                            List<ResolvedOrderItemDto> resolvedItems,
                                            UUID orderId) {
        String orderNumber = UUID.randomUUID().toString();
        Order order = orderMapper.toEntity(orderCreateRequestDto, orderNumber, currentCustomer.id(), orderId.toString(), idempotencyKey, resolvedItems);
        Order savedOrder = orderRepository.save(order);

        List<OrderItem> orderItems = resolvedItems.stream()
                .map(item -> orderMapper.toEntity(savedOrder, item))
                .map(orderItemRepository::save)
                .toList();

        OrderPlacedEvent orderPlacedEvent = new OrderPlacedEvent();
        orderPlacedEvent.setOrderNumber(savedOrder.getOrderNumber());
        orderPlacedEvent.setEmail(currentCustomer.email());
        orderPlacedEvent.setFirstName(currentCustomer.firstName());
        orderPlacedEvent.setLastName(currentCustomer.lastName());
        log.info("Start - Sending OrderPlacedEvent {} to Kafka topic order-placed", orderPlacedEvent);
        kafkaTemplate.send("order-placed", orderPlacedEvent);
        log.info("End - Sending OrderPlacedEvent {} to Kafka topic order-placed", orderPlacedEvent);
        return orderMapper.toVo(savedOrder, orderItems);
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

    @Transactional
    public OrderResponseVo confirmPaid(UUID orderId) {
        Order order = orderRepository.findByIdForUpdate(orderId.toString())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        List<OrderItem> orderItems = orderItemRepository.findAllByOrderId(order.getId());

        if (order.getStatus() == OrderStatus.PAID) {
            return orderMapper.toVo(order, orderItems);
        }
        if (order.getStatus() == OrderStatus.CANCELED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Canceled order cannot be confirmed as paid");
        }

        order.setStatus(OrderStatus.PAID);
        orderRepository.save(order);
        log.info("Order {} confirmed as paid", orderId);
        return orderMapper.toVo(order, orderItems);
    }

    @Transactional
    public OrderResponseVo cancelPayment(UUID orderId) {
        Order order = orderRepository.findByIdForUpdate(orderId.toString())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
        List<OrderItem> orderItems = orderItemRepository.findAllByOrderId(order.getId());

        if (order.getStatus() == OrderStatus.CANCELED) {
            return orderMapper.toVo(order, orderItems);
        }
        if (order.getStatus() == OrderStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Paid order cannot be canceled");
        }

        inventoryClient.releaseStock(new InventoryReleaseRequestDto(orderId));
        order.setStatus(OrderStatus.CANCELED);
        orderRepository.save(order);
        log.info("Order {} canceled and inventory released", orderId);
        return orderMapper.toVo(order, orderItems);
    }

    private ResolvedOrderItemDto resolveOrderItem(OrderCreateRequestDto.OrderItemRequestDto item, String authorization) {
        SkuResponseDto sku = inventoryClient.getSku(item.skuCode(), authorization);
        ProductResponseDto product = productClient.getProduct(sku.productId().toString(), authorization);
        BigDecimal price = sku.priceOverride() != null ? sku.priceOverride() : product.price();
        return new ResolvedOrderItemDto(sku.id(), sku.skuCode(), product.id(), product.shopId(), price, item.quantity());
    }

    private void validateRequest(OrderCreateRequestDto orderCreateRequestDto) {
        if (orderCreateRequestDto == null || orderCreateRequestDto.items() == null || orderCreateRequestDto.items().isEmpty()) {
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

    private UUID resolveOrderId(UUID customerId, String idempotencyKey) {
        if (idempotencyKey == null) {
            return UUID.randomUUID();
        }
        return UUID.nameUUIDFromBytes((customerId + ":" + idempotencyKey).getBytes(StandardCharsets.UTF_8));
    }
}
