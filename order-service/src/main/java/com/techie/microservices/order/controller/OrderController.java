package com.techie.microservices.order.controller;

import com.techie.microservices.order.dto.OrderCreateRequestDto;
import com.techie.microservices.order.service.OrderService;
import com.techie.microservices.order.vo.OrderResponseVo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponseVo placeOrder(@RequestBody OrderCreateRequestDto orderCreateRequestDto) {
        return orderService.placeOrder(orderCreateRequestDto);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<OrderResponseVo> getOrders(@RequestParam(required = false) UUID customerId) {
        return orderService.getOrders(customerId);
    }
}
