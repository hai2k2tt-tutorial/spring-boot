package com.techie.microservices.payment.mapper;

import com.techie.microservices.payment.dto.PaymentCreateRequestDto;
import com.techie.microservices.payment.model.Payment;
import com.techie.microservices.payment.model.PaymentMethod;
import com.techie.microservices.payment.model.PaymentStatus;
import com.techie.microservices.payment.vo.PaymentResponseVo;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.UUID;

@Component
public class PaymentMapper {

    public Payment toEntity(PaymentCreateRequestDto paymentCreateRequestDto, UUID customerId, BigDecimal amount) {
        return Payment.builder()
                .customerId(customerId)
                .orderId(paymentCreateRequestDto.orderId())
                .amount(amount)
                .method(resolveMethod(paymentCreateRequestDto.method()))
                .status(PaymentStatus.PENDING)
                .build();
    }

    public PaymentResponseVo toVo(Payment payment) {
        return new PaymentResponseVo(
                payment.getId(),
                payment.getCustomerId(),
                payment.getOrderId(),
                payment.getAmount(),
                payment.getMethod().name(),
                payment.getStatus().name(),
                payment.getCreatedAt(),
                payment.getUpdatedAt()
        );
    }

    public PaymentMethod resolveMethod(String method) {
        if (method == null || method.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment method is required");
        }
        try {
            return PaymentMethod.valueOf(method.trim().toUpperCase());
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid payment method");
        }
    }

    public PaymentStatus resolveStatus(String status) {
        if (status == null || status.isBlank()) {
            return PaymentStatus.PENDING;
        }
        try {
            return PaymentStatus.valueOf(status.trim().toUpperCase());
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid payment status");
        }
    }
}
