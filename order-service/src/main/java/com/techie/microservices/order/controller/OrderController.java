package com.techie.microservices.order.controller;

import com.techie.microservices.order.dto.CheckoutCreateRequestDto;
import com.techie.microservices.order.dto.OrderCreateRequestDto;
import com.techie.microservices.order.service.OrderCheckoutService;
import com.techie.microservices.order.service.OrderService;
import com.techie.microservices.order.vo.CheckoutResponseVo;
import com.techie.microservices.order.vo.OrderResponseVo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/order")
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;
    private final OrderCheckoutService orderCheckoutService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponseVo placeOrder(@RequestBody OrderCreateRequestDto orderCreateRequestDto,
                                      @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                      @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey) {
        return orderService.placeOrder(orderCreateRequestDto, authorization, idempotencyKey);
    }

    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    public CheckoutResponseVo checkout(@RequestBody CheckoutCreateRequestDto checkoutCreateRequestDto,
                                       @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                       @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey) {
        return orderCheckoutService.checkout(checkoutCreateRequestDto, authorization, idempotencyKey);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<OrderResponseVo> getOrders(@RequestParam(required = false) UUID customerId) {
        return orderService.getOrders(customerId);
    }

    @GetMapping("/{orderId}")
    @ResponseStatus(HttpStatus.OK)
    public OrderResponseVo getOrder(@PathVariable UUID orderId,
                                    @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return orderService.getOrder(orderId, authorization);
    }
}
