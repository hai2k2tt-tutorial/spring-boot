package com.techie.microservices.payment.client;

import com.techie.microservices.payment.dto.OrderResponseDto;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.PostExchange;

import java.util.List;

public interface OrderClient {

    @GetExchange("/api/order/{orderId}")
    OrderResponseDto getOrder(@PathVariable String orderId, @RequestHeader("Authorization") String authorization);

    @GetExchange("/api/order/{orderId}/internal-settlement")
    OrderResponseDto getOrderForInternalSettlement(@PathVariable String orderId);

    @GetExchange("/api/order/shop/me")
    List<OrderResponseDto> getCurrentShopOrders(@RequestHeader("Authorization") String authorization);

    @PostExchange("/api/order/{orderId}/confirm-paid")
    OrderResponseDto confirmPaid(@PathVariable String orderId);

    @PostExchange("/api/order/{orderId}/cancel-payment")
    OrderResponseDto cancelPayment(@PathVariable String orderId);
}
