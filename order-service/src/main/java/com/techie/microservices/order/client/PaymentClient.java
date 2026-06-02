package com.techie.microservices.order.client;

import com.techie.microservices.order.dto.PaymentCreateRequestDto;
import com.techie.microservices.order.dto.PaymentResponseDto;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.service.annotation.GetExchange;
import org.springframework.web.service.annotation.PostExchange;

import java.util.List;
import java.util.UUID;

public interface PaymentClient {

    @PostExchange("/api/payments")
    PaymentResponseDto createPayment(@RequestBody PaymentCreateRequestDto paymentCreateRequestDto,
                                     @RequestHeader("Authorization") String authorization,
                                     @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey);

    @GetExchange("/api/payments")
    List<PaymentResponseDto> getPayments(@RequestParam UUID orderId,
                                          @RequestHeader("Authorization") String authorization);
}
