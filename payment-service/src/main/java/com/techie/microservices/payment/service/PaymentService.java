package com.techie.microservices.payment.service;

import com.techie.microservices.payment.client.OrderClient;
import com.techie.microservices.payment.dto.OrderResponseDto;
import com.techie.microservices.payment.dto.PaymentCreateRequestDto;
import com.techie.microservices.payment.dto.PaymentStatusUpdateRequestDto;
import com.techie.microservices.payment.mapper.PaymentHistoryMapper;
import com.techie.microservices.payment.mapper.PaymentMapper;
import com.techie.microservices.payment.model.Payment;
import com.techie.microservices.payment.model.PaymentHistory;
import com.techie.microservices.payment.model.PaymentHistoryType;
import com.techie.microservices.payment.model.PaymentStatus;
import com.techie.microservices.payment.repository.PaymentHistoryRepository;
import com.techie.microservices.payment.repository.PaymentRepository;
import com.techie.microservices.payment.util.TokenIdentity;
import com.techie.microservices.payment.vo.PaymentHistoryResponseVo;
import com.techie.microservices.payment.vo.PaymentResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final OrderClient orderClient;
    private final PaymentMapper paymentMapper;
    private final PaymentHistoryMapper paymentHistoryMapper;
    private final TokenIdentity tokenIdentity;

    @Value("${payment.mock.checkout-base-url:http://localhost:3004/payments/checkout}")
    private String mockCheckoutBaseUrl;

    @Transactional
    public PaymentResponseVo createPayment(PaymentCreateRequestDto paymentCreateRequestDto, String authorization, String idempotencyKey) {
        if (paymentCreateRequestDto.orderId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order id is required");
        }

        UUID customerId = tokenIdentity.currentUserId(authorization);
        Payment existingPayment = findExistingPayment(customerId, paymentCreateRequestDto.orderId(), idempotencyKey);
        if (existingPayment != null) {
            return paymentMapper.toVo(existingPayment);
        }

        OrderResponseDto order = orderClient.getOrder(paymentCreateRequestDto.orderId().toString(), authorization);
        if (!customerId.equals(order.customerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Order does not belong to current customer");
        }

        Payment payment = paymentMapper.toEntity(paymentCreateRequestDto, customerId, order.totalAmount(), normalizeIdempotencyKey(idempotencyKey));
        paymentRepository.save(payment);
        applyMockProviderSession(payment);
        paymentRepository.save(payment);
        paymentHistoryRepository.save(paymentHistoryMapper.toEntity(payment, resolveHistoryType(payment)));
        log.info("Payment created successfully");
        return paymentMapper.toVo(payment);
    }

    @Transactional
    public PaymentResponseVo updatePaymentStatus(UUID paymentId, PaymentStatusUpdateRequestDto paymentStatusUpdateRequestDto) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
        payment.setStatus(paymentMapper.resolveStatus(paymentStatusUpdateRequestDto.status()));
        paymentRepository.save(payment);
        paymentHistoryRepository.save(paymentHistoryMapper.toEntity(payment, resolveHistoryType(payment)));
        log.info("Payment status updated successfully");
        return paymentMapper.toVo(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponseVo> getPayments(UUID customerId, UUID orderId) {
        return findPayments(customerId, orderId).stream()
                .map(paymentMapper::toVo)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentHistoryResponseVo> getPaymentHistory(UUID paymentId) {
        if (!paymentRepository.existsById(paymentId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found");
        }
        return paymentHistoryRepository.findAllByPaymentIdOrderByCreatedAtAsc(paymentId).stream()
                .map(paymentHistoryMapper::toVo)
                .toList();
    }

    private List<Payment> findPayments(UUID customerId, UUID orderId) {
        if (customerId != null && orderId != null) {
            return paymentRepository.findAllByCustomerIdAndOrderId(customerId, orderId);
        }
        if (customerId != null) {
            return paymentRepository.findAllByCustomerId(customerId);
        }
        if (orderId != null) {
            return paymentRepository.findAllByOrderId(orderId);
        }
        return paymentRepository.findAll();
    }

    private Payment findExistingPayment(UUID customerId, UUID orderId, String idempotencyKey) {
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);
        if (normalizedKey != null) {
            Payment payment = paymentRepository.findByCustomerIdAndIdempotencyKey(customerId, normalizedKey).orElse(null);
            if (payment != null) {
                return payment;
            }
        }
        return paymentRepository.findFirstByCustomerIdAndOrderIdAndStatusOrderByCreatedAtDesc(customerId, orderId, PaymentStatus.PENDING).orElse(null);
    }

    private void applyMockProviderSession(Payment payment) {
        String clientSecret = createMockClientSecret(payment);
        payment.setClientSecret(clientSecret);
        payment.setPaymentUrl(createMockPaymentUrl(payment, clientSecret));
        payment.setProviderSessionId("mock_ps_" + payment.getId());
        payment.setSessionStatus("READY");
    }

    private String normalizeIdempotencyKey(String idempotencyKey) {
        return idempotencyKey == null || idempotencyKey.isBlank() ? null : idempotencyKey.trim();
    }

    private PaymentHistoryType resolveHistoryType(Payment payment) {
        return switch (payment.getMethod()) {
            case BALANCE, CARD, MANUAL -> PaymentHistoryType.PURCHASE;
        };
    }

    private String createMockClientSecret(Payment payment) {
        return "mock_cs_" + payment.getId() + "_" + UUID.randomUUID();
    }

    private String createMockPaymentUrl(Payment payment, String clientSecret) {
        return UriComponentsBuilder.fromUriString(mockCheckoutBaseUrl)
                .queryParam("orderId", payment.getOrderId())
                .queryParam("paymentId", payment.getId())
                .queryParam("clientSecret", clientSecret)
                .build()
                .toUriString();
    }
}
