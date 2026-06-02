package com.techie.microservices.order.mapper;

import com.techie.microservices.order.dto.OrderCreateRequestDto;
import com.techie.microservices.order.dto.ResolvedOrderItemDto;
import com.techie.microservices.order.model.Order;
import com.techie.microservices.order.model.OrderItem;
import com.techie.microservices.order.model.OrderStatus;
import com.techie.microservices.order.vo.OrderItemResponseVo;
import com.techie.microservices.order.vo.OrderResponseVo;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Component
public class OrderMapper {

    public Order toEntity(OrderCreateRequestDto orderCreateRequestDto, String orderNumber, UUID customerId,
                          String orderId,
                          String idempotencyKey,
                          List<ResolvedOrderItemDto> resolvedItems) {
        return Order.builder()
                .id(orderId)
                .orderNumber(orderNumber)
                .customerId(customerId.toString())
                .idempotencyKey(idempotencyKey)
                .status(resolveStatus(orderCreateRequestDto.status()))
                .totalAmount(calculateTotal(resolvedItems))
                .build();
    }

    public OrderItem toEntity(Order order, ResolvedOrderItemDto itemRequestDto) {
        return OrderItem.builder()
                .order(order)
                .skuId(itemRequestDto.skuId().toString())
                .productId(itemRequestDto.productId().toString())
                .shopId(itemRequestDto.shopId().toString())
                .price(itemRequestDto.price())
                .quantity(itemRequestDto.quantity())
                .build();
    }

    public OrderResponseVo toVo(Order order, List<OrderItem> items) {
        return new OrderResponseVo(
                UUID.fromString(order.getId()),
                order.getOrderNumber(),
                UUID.fromString(order.getCustomerId()),
                order.getStatus().name(),
                order.getTotalAmount(),
                items.stream().map(this::toItemVo).toList(),
                order.getCreatedAt(),
                order.getUpdatedAt()
        );
    }

    private OrderItemResponseVo toItemVo(OrderItem orderItem) {
        return new OrderItemResponseVo(
                UUID.fromString(orderItem.getId()),
                UUID.fromString(orderItem.getSkuId()),
                UUID.fromString(orderItem.getProductId()),
                UUID.fromString(orderItem.getShopId()),
                orderItem.getPrice(),
                orderItem.getQuantity()
        );
    }

    public OrderStatus resolveStatus(String status) {
        if (status == null || status.isBlank()) {
            return OrderStatus.PENDING_PAYMENT;
        }
        try {
            return OrderStatus.valueOf(status.trim().toUpperCase());
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid order status");
        }
    }

    private BigDecimal calculateTotal(List<ResolvedOrderItemDto> items) {
        return items.stream()
                .map(item -> item.price().multiply(BigDecimal.valueOf(item.quantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
