package com.techie.microservices.order.dto;

import java.util.List;

public record CheckoutCreateRequestDto(
        List<OrderCreateRequestDto.OrderItemRequestDto> items,
        String paymentMethod
) {
    public OrderCreateRequestDto toOrderCreateRequest() {
        return new OrderCreateRequestDto(null, items);
    }
}
