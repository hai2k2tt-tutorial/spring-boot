package com.techie.microservices.order.service;

import com.techie.microservices.order.dto.CheckoutCreateRequestDto;
import com.techie.microservices.order.vo.CheckoutResponseVo;
import com.techie.microservices.order.vo.OrderResponseVo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class OrderCheckoutService {
    private final OrderService orderService;

    public CheckoutResponseVo checkout(CheckoutCreateRequestDto checkoutCreateRequestDto, String authorization, String idempotencyKey) {
        validateRequest(checkoutCreateRequestDto);
        OrderResponseVo order = orderService.placeOrder(checkoutCreateRequestDto.toOrderCreateRequest(), authorization, idempotencyKey);
        return new CheckoutResponseVo(order);
    }

    private void validateRequest(CheckoutCreateRequestDto checkoutCreateRequestDto) {
        if (checkoutCreateRequestDto == null || checkoutCreateRequestDto.items() == null || checkoutCreateRequestDto.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one checkout item is required");
        }
    }
}
