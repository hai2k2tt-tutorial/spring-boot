package com.techie.microservices.payment.mapper;

import com.techie.microservices.payment.model.Payment;
import com.techie.microservices.payment.model.PaymentHistory;
import com.techie.microservices.payment.model.PaymentHistoryType;
import com.techie.microservices.payment.vo.PaymentHistoryResponseVo;
import org.springframework.stereotype.Component;

@Component
public class PaymentHistoryMapper {

    public PaymentHistory toEntity(Payment payment, PaymentHistoryType type) {
        return PaymentHistory.builder()
                .customerId(payment.getCustomerId())
                .payment(payment)
                .type(type)
                .amount(payment.getAmount())
                .build();
    }

    public PaymentHistoryResponseVo toVo(PaymentHistory paymentHistory) {
        return new PaymentHistoryResponseVo(
                paymentHistory.getId(),
                paymentHistory.getCustomerId(),
                paymentHistory.getPayment().getId(),
                paymentHistory.getType().name(),
                paymentHistory.getAmount(),
                paymentHistory.getCreatedAt()
        );
    }
}
