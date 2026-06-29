package com.techie.microservices.order.controller;

import com.techie.microservices.order.dto.CheckoutCreateRequestDto;
import com.techie.microservices.order.dto.OrderCreateRequestDto;
import com.techie.microservices.order.security.Permission;
import com.techie.microservices.order.security.RequirePermission;
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
    @RequirePermission(Permission.ORDER_CUSTOMER)
    public OrderResponseVo placeOrder(@RequestBody OrderCreateRequestDto orderCreateRequestDto,
                                      @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                      @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey) {
        return orderService.placeOrder(orderCreateRequestDto, authorization, idempotencyKey);
    }

    @PostMapping("/checkout")
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermission(Permission.ORDER_CUSTOMER)
    public CheckoutResponseVo checkout(@RequestBody CheckoutCreateRequestDto checkoutCreateRequestDto,
                                       @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                       @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey) {
        return orderCheckoutService.checkout(checkoutCreateRequestDto, authorization, idempotencyKey);
    }

    @GetMapping("/me")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.ORDER_CUSTOMER)
    public List<OrderResponseVo> getCurrentCustomerOrders(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return orderService.getCurrentCustomerOrders(authorization);
    }

    @GetMapping("/admin")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.ORDER_ADMIN)
    public List<OrderResponseVo> getAdminOrders(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return orderService.getAdminOrders(authorization);
    }

    @GetMapping("/shop/me")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.ORDER_SHOP)
    public List<OrderResponseVo> getCurrentShopOrders(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return orderService.getCurrentShopOrders(authorization);
    }

    @GetMapping("/shop/me/{orderId}")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.ORDER_SHOP)
    public OrderResponseVo getCurrentShopOrder(@PathVariable UUID orderId,
                                               @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return orderService.getCurrentShopOrder(orderId, authorization);
    }

    @GetMapping("/{orderId}")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.ORDER_CUSTOMER)
    public OrderResponseVo getOrder(@PathVariable UUID orderId,
                                    @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return orderService.getOrder(orderId, authorization);
    }

    @GetMapping("/{orderId}/internal-settlement")
    @ResponseStatus(HttpStatus.OK)
    public OrderResponseVo getOrderForInternalSettlement(@PathVariable UUID orderId) {
        return orderService.getOrderForInternalSettlement(orderId);
    }

    @PostMapping("/{orderId}/confirm-paid")
    @ResponseStatus(HttpStatus.OK)
    public OrderResponseVo confirmPaid(@PathVariable UUID orderId) {
        return orderService.confirmPaid(orderId);
    }

    @PostMapping("/{orderId}/cancel-payment")
    @ResponseStatus(HttpStatus.OK)
    public OrderResponseVo cancelPayment(@PathVariable UUID orderId) {
        return orderService.cancelPayment(orderId);
    }
}
