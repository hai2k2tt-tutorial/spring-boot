package com.techie.microservices.payment.service;

import com.techie.microservices.payment.client.OrderClient;
import com.techie.microservices.payment.client.WalletClient;
import com.techie.microservices.payment.dto.OrderResponseDto;
import com.techie.microservices.payment.dto.PaymentCreateRequestDto;
import com.techie.microservices.payment.dto.PaymentProviderWebhookRequestDto;
import com.techie.microservices.payment.dto.PaymentStatusUpdateRequestDto;
import com.techie.microservices.payment.dto.WalletMoneyRequestDto;
import com.techie.microservices.payment.mapper.PaymentHistoryMapper;
import com.techie.microservices.payment.mapper.PaymentMapper;
import com.techie.microservices.payment.model.Payment;
import com.techie.microservices.payment.model.PaymentHistory;
import com.techie.microservices.payment.model.PaymentHistoryType;
import com.techie.microservices.payment.model.PaymentMethod;
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
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final OrderClient orderClient;
    private final WalletClient walletClient;
    private final PaymentMapper paymentMapper;
    private final PaymentHistoryMapper paymentHistoryMapper;
    private final TokenIdentity tokenIdentity;

    @Value("${payment.mock.checkout-base-url:http://localhost:3004/payments/checkout}")
    private String mockCheckoutBaseUrl;

    @Value("${payment.webhook.mock-secret:}")
    private String mockWebhookSecret;

    @Transactional
    public PaymentResponseVo createPayment(PaymentCreateRequestDto paymentCreateRequestDto, String authorization, String idempotencyKey) {
        if (paymentCreateRequestDto == null || paymentCreateRequestDto.orderId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order id is required");
        }

        UUID customerId = tokenIdentity.currentUserId(authorization);
        Payment existingPayment = findExistingPayment(customerId, paymentCreateRequestDto.orderId(), idempotencyKey);
        if (existingPayment != null) {
            if (existingPayment.getMethod() == PaymentMethod.BALANCE && existingPayment.getStatus() == PaymentStatus.PENDING) {
                OrderResponseDto order = orderClient.getOrder(existingPayment.getOrderId().toString(), authorization);
                settleBalancePayment(existingPayment, order, authorization);
                return paymentMapper.toVo(existingPayment);
            }
            return paymentMapper.toVo(existingPayment);
        }

        OrderResponseDto order = orderClient.getOrder(paymentCreateRequestDto.orderId().toString(), authorization);
        if (!customerId.equals(order.customerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Order does not belong to current customer");
        }

        Payment payment = paymentMapper.toEntity(paymentCreateRequestDto, customerId, order.totalAmount(), normalizeIdempotencyKey(idempotencyKey));
        paymentRepository.save(payment);
        if (payment.getMethod() == PaymentMethod.BALANCE) {
            settleBalancePayment(payment, order, authorization);
        } else {
            applyMockProviderSession(payment);
        }
        paymentRepository.save(payment);
        paymentHistoryRepository.save(paymentHistoryMapper.toEntity(payment, resolveHistoryType(payment)));
        log.info("Payment created successfully");
        return paymentMapper.toVo(payment);
    }

    private void settleBalancePayment(Payment payment, OrderResponseDto order, String authorization) {
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            return;
        }
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending wallet payments can be settled");
        }

        String paymentRef = payment.getId().toString();
        walletClient.debitCurrentCustomerWallet(
                new WalletMoneyRequestDto(payment.getAmount(), "USD", paymentRef, "Order " + order.orderNumber()),
                authorization
        );

        Map<UUID, java.math.BigDecimal> amountByShop = order.items().stream()
                .collect(Collectors.groupingBy(
                        OrderResponseDto.OrderItemResponseDto::shopId,
                        Collectors.reducing(
                                java.math.BigDecimal.ZERO,
                                item -> item.price().multiply(java.math.BigDecimal.valueOf(item.quantity())),
                                java.math.BigDecimal::add
                        )
                ));
        amountByShop.forEach((shopId, amount) -> walletClient.creditShopWallet(
                shopId,
                new WalletMoneyRequestDto(amount, "USD", paymentRef + ":" + shopId, "Order " + order.orderNumber())
        ));

        orderClient.confirmPaid(payment.getOrderId().toString());
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setSessionStatus("COMPLETED");
        payment.setPaymentUrl(null);
        payment.setClientSecret(null);
        payment.setProvider("WALLET");
        payment.setProviderSessionId(null);
    }

    @Transactional
    public PaymentResponseVo updatePaymentStatus(UUID paymentId, PaymentStatusUpdateRequestDto paymentStatusUpdateRequestDto) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
        PaymentStatus previousStatus = payment.getStatus();
        PaymentStatus newStatus = paymentMapper.resolveStatus(paymentStatusUpdateRequestDto.status());
        payment.setStatus(newStatus);
        payment.setSessionStatus(newStatus == PaymentStatus.SUCCESS ? "COMPLETED" : newStatus == PaymentStatus.FAILED ? "FAILED" : payment.getSessionStatus());
        paymentRepository.save(payment);
        paymentHistoryRepository.save(paymentHistoryMapper.toEntity(payment, resolveHistoryType(payment)));
        if (previousStatus != PaymentStatus.SUCCESS && newStatus == PaymentStatus.SUCCESS) {
            orderClient.confirmPaid(payment.getOrderId().toString());
        } else if (newStatus == PaymentStatus.FAILED) {
            orderClient.cancelPayment(payment.getOrderId().toString());
        }
        log.info("Payment status updated successfully");
        return paymentMapper.toVo(payment);
    }

    @Transactional
    public PaymentResponseVo handleProviderWebhook(PaymentProviderWebhookRequestDto request, String webhookSecret) {
        validateWebhookSecret(webhookSecret);
        validateWebhookRequest(request);

        Payment payment = findWebhookPayment(request);
        validateWebhookPayment(payment, request);

        PaymentStatus newStatus = paymentMapper.resolveStatus(request.status());
        if (newStatus == PaymentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook status must be SUCCESS or FAILED");
        }
        if (payment.getStatus() == newStatus) {
            return paymentMapper.toVo(payment);
        }
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment has already been finalized");
        }

        payment.setStatus(newStatus);
        payment.setSessionStatus(newStatus == PaymentStatus.SUCCESS ? "COMPLETED" : "FAILED");
        paymentRepository.save(payment);
        paymentHistoryRepository.save(paymentHistoryMapper.toEntity(payment, resolveHistoryType(payment)));

        if (newStatus == PaymentStatus.SUCCESS) {
            orderClient.confirmPaid(payment.getOrderId().toString());
        } else {
            orderClient.cancelPayment(payment.getOrderId().toString());
        }

        log.info("Payment {} finalized by provider webhook with status {}", payment.getId(), newStatus);
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

    private Payment findWebhookPayment(PaymentProviderWebhookRequestDto request) {
        if (request.paymentId() != null) {
            return paymentRepository.findById(request.paymentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
        }
        return paymentRepository.findByProviderSessionId(request.providerSessionId().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
    }

    private void validateWebhookSecret(String webhookSecret) {
        if (mockWebhookSecret == null || mockWebhookSecret.isBlank()) {
            return;
        }
        if (!mockWebhookSecret.equals(webhookSecret)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid webhook secret");
        }
    }

    private void validateWebhookRequest(PaymentProviderWebhookRequestDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook request is required");
        }
        if (request.paymentId() == null && (request.providerSessionId() == null || request.providerSessionId().isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment id or provider session id is required");
        }
        if (request.status() == null || request.status().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook status is required");
        }
    }

    private void validateWebhookPayment(Payment payment, PaymentProviderWebhookRequestDto request) {
        if (request.providerSessionId() != null
                && !request.providerSessionId().isBlank()
                && !Objects.equals(payment.getProviderSessionId(), request.providerSessionId().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provider session does not match payment");
        }
        if (request.clientSecret() != null
                && !request.clientSecret().isBlank()
                && !Objects.equals(payment.getClientSecret(), request.clientSecret().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Client secret does not match payment");
        }
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
