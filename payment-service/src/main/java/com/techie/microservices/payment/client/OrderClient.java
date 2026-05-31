package com.techie.microservices.payment.client;

import com.techie.microservices.payment.dto.OrderResponseDto;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.GetExchange;

public interface OrderClient {

    @GetExchange("/api/order/{orderId}")
    OrderResponseDto getOrder(@PathVariable String orderId, @RequestHeader("Authorization") String authorization);
}
