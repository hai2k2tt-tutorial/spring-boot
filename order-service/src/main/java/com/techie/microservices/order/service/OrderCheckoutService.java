package com.techie.microservices.order.service;

import com.techie.microservices.order.client.PaymentClient;
import com.techie.microservices.order.dto.CheckoutCreateRequestDto;
import com.techie.microservices.order.dto.PaymentCreateRequestDto;
import com.techie.microservices.order.dto.PaymentResponseDto;
import com.techie.microservices.order.vo.CheckoutResponseVo;
import com.techie.microservices.order.vo.OrderResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderCheckoutService {
    private static final String DEFAULT_PAYMENT_METHOD = "CARD";

    private final OrderService orderService;
    private final PaymentClient paymentClient;

    public CheckoutResponseVo checkout(CheckoutCreateRequestDto checkoutCreateRequestDto, String authorization, String idempotencyKey) {
        validateRequest(checkoutCreateRequestDto);
        OrderResponseVo order = orderService.placeOrder(checkoutCreateRequestDto.toOrderCreateRequest(), authorization, idempotencyKey);
        PaymentResponseDto payment = createOrRecoverPayment(order, checkoutCreateRequestDto.paymentMethod(), authorization, idempotencyKey);
        return new CheckoutResponseVo(order, payment);
    }

    private PaymentResponseDto createOrRecoverPayment(OrderResponseVo order, String paymentMethod, String authorization, String idempotencyKey) {
        try {
            return paymentClient.createPayment(
                    new PaymentCreateRequestDto(order.id(), resolvePaymentMethod(paymentMethod)),
                    authorization,
                    idempotencyKey
            );
        } catch (RuntimeException exception) {
            log.warn("Payment creation failed for order {}, attempting payment recovery", order.id(), exception);
            List<PaymentResponseDto> payments = paymentClient.getPayments(order.id(), authorization);
            return payments.stream()
                    .filter(payment -> "PENDING".equalsIgnoreCase(payment.status()))
                    .findFirst()
                    .orElseThrow(() -> exception);
        }
    }

    private String resolvePaymentMethod(String paymentMethod) {
        return paymentMethod == null || paymentMethod.isBlank() ? DEFAULT_PAYMENT_METHOD : paymentMethod;
    }

    private void validateRequest(CheckoutCreateRequestDto checkoutCreateRequestDto) {
        if (checkoutCreateRequestDto == null || checkoutCreateRequestDto.items() == null || checkoutCreateRequestDto.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one checkout item is required");
        }
    }
}
