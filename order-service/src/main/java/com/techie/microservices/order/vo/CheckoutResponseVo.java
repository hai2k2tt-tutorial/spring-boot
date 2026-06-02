package com.techie.microservices.order.vo;

import com.techie.microservices.order.dto.PaymentResponseDto;

public record CheckoutResponseVo(
        OrderResponseVo order,
        PaymentResponseDto payment
) {
}
