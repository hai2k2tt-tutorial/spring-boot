package com.techie.microservices.payment.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techie.microservices.payment.client.OrderClient;
import com.techie.microservices.payment.client.WalletClient;
import com.techie.microservices.payment.dto.OrderResponseDto;
import com.techie.microservices.payment.dto.PaymentCreateRequestDto;
import com.techie.microservices.payment.dto.WalletMoneyRequestDto;
import com.techie.microservices.payment.event.PaymentCreationRequestedEvent;
import com.techie.microservices.payment.event.PaymentStateEvent;
import com.techie.microservices.payment.mapper.PaymentHistoryMapper;
import com.techie.microservices.payment.mapper.PaymentMapper;
import com.techie.microservices.payment.model.Payment;
import com.techie.microservices.payment.model.PaymentHistoryType;
import com.techie.microservices.payment.model.PaymentMethod;
import com.techie.microservices.payment.model.PaymentOutbox;
import com.techie.microservices.payment.model.PaymentOutboxStatus;
import com.techie.microservices.payment.model.PaymentSaga;
import com.techie.microservices.payment.model.PaymentSagaState;
import com.techie.microservices.payment.model.PaymentStatus;
import com.techie.microservices.payment.repository.PaymentHistoryRepository;
import com.techie.microservices.payment.repository.PaymentOutboxRepository;
import com.techie.microservices.payment.repository.PaymentRepository;
import com.techie.microservices.payment.repository.PaymentSagaRepository;
import com.techie.microservices.payment.util.TokenIdentity;
import com.techie.microservices.payment.vo.PaymentResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentSagaOrchestratorService {
    public static final String PAYMENT_CREATION_REQUESTED = "PAYMENT_CREATION_REQUESTED";
    public static final String PAYMENT_SESSION_READY = "PAYMENT_SESSION_READY";
    public static final String PAYMENT_SESSION_FAILED = "PAYMENT_SESSION_FAILED";
    public static final String PAYMENT_SETTLED = "PAYMENT_SETTLED";
    public static final String PAYMENT_FAILED = "PAYMENT_FAILED";

    private final PaymentRepository paymentRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final PaymentSagaRepository paymentSagaRepository;
    private final PaymentOutboxRepository paymentOutboxRepository;
    private final OrderClient orderClient;
    private final WalletClient walletClient;
    private final PaymentMapper paymentMapper;
    private final PaymentHistoryMapper paymentHistoryMapper;
    private final TokenIdentity tokenIdentity;
    private final ObjectMapper objectMapper;

    @Value("${payment.mock.checkout-base-url:http://localhost:3004/payments/checkout}")
    private String mockCheckoutBaseUrl;

    @Transactional
    public PaymentResponseVo requestAsyncPayment(PaymentCreateRequestDto request, String authorization, String idempotencyKey) {
        validateRequest(request);
        UUID customerId = tokenIdentity.currentUserId(authorization);
        String normalizedKey = normalizeIdempotencyKey(idempotencyKey);

        Payment existingPayment = findExistingPayment(customerId, request.orderId(), normalizedKey);
        if (existingPayment != null) {
            ensureSaga(existingPayment, normalizedKey);
            return paymentMapper.toVo(existingPayment);
        }

        OrderResponseDto order = orderClient.getOrder(request.orderId().toString(), authorization);
        if (!customerId.equals(order.customerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Order does not belong to current customer");
        }
        validateOrderPayable(order);

        PaymentMethod method = paymentMapper.resolveMethod(request.method());
        Payment payment = Payment.builder()
                .customerId(customerId)
                .orderId(order.id())
                .amount(order.totalAmount())
                .method(method)
                .status(PaymentStatus.PENDING)
                .sessionStatus("CREATING")
                .provider(method == PaymentMethod.BALANCE ? "WALLET" : "MOCK")
                .idempotencyKey(normalizedKey)
                .build();
        paymentRepository.save(payment);

        PaymentSaga saga = paymentSagaRepository.save(PaymentSaga.builder()
                .orderId(order.id())
                .paymentId(payment.getId())
                .customerId(customerId)
                .idempotencyKey(normalizedKey)
                .state(PaymentSagaState.STARTED)
                .retryCount(0)
                .build());

        PaymentCreationRequestedEvent event = new PaymentCreationRequestedEvent(
                UUID.randomUUID(),
                saga.getId(),
                payment.getId(),
                order.id(),
                customerId,
                method.name(),
                normalizedKey,
                Instant.now()
        );
        saveOutbox(PAYMENT_CREATION_REQUESTED, "payment-saga", saga.getId(), event);
        paymentRepository.flush();
        return paymentMapper.toVo(payment);
    }

    @Transactional
    public void processPaymentCreationRequested(PaymentCreationRequestedEvent event) {
        PaymentSaga saga = paymentSagaRepository.findById(event.sagaId())
                .orElseGet(() -> paymentSagaRepository.findByOrderId(event.orderId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment saga not found")));
        if (isTerminal(saga.getState())) {
            return;
        }

        try {
            saga.setState(PaymentSagaState.VALIDATING_ORDER);
            saga.setLastEventId(event.eventId());
            paymentSagaRepository.save(saga);

            OrderResponseDto order = orderClient.getOrderForInternalSettlement(event.orderId().toString());
            if (!event.customerId().equals(order.customerId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Order does not belong to payment customer");
            }
            validateOrderPayable(order);

            saga.setState(PaymentSagaState.CREATING_PAYMENT);
            Payment payment = paymentRepository.findById(event.paymentId())
                    .orElseGet(() -> createPaymentForEvent(event, order));
            if (payment.getStatus() != PaymentStatus.PENDING) {
                saga.setPaymentId(payment.getId());
                saga.setState(payment.getStatus() == PaymentStatus.SUCCESS ? PaymentSagaState.COMPLETED : PaymentSagaState.FAILED);
                paymentSagaRepository.save(saga);
                return;
            }

            saga.setPaymentId(payment.getId());
            if (payment.getMethod() == PaymentMethod.BALANCE) {
                settleBalancePayment(saga, payment, order);
            } else {
                createProviderSession(saga, payment);
            }
            paymentSagaRepository.save(saga);
        } catch (RuntimeException exception) {
            failSaga(saga, exception);
        }
    }

    private Payment createPaymentForEvent(PaymentCreationRequestedEvent event, OrderResponseDto order) {
        PaymentMethod method = paymentMapper.resolveMethod(event.paymentMethod());
        return paymentRepository.save(Payment.builder()
                .customerId(event.customerId())
                .orderId(order.id())
                .amount(order.totalAmount())
                .method(method)
                .status(PaymentStatus.PENDING)
                .sessionStatus("CREATING")
                .provider(method == PaymentMethod.BALANCE ? "WALLET" : "MOCK")
                .idempotencyKey(event.idempotencyKey())
                .build());
    }

    private void createProviderSession(PaymentSaga saga, Payment payment) {
        if ("READY".equalsIgnoreCase(payment.getSessionStatus())) {
            saga.setState(PaymentSagaState.COMPLETED);
            return;
        }
        saga.setState(PaymentSagaState.CREATING_PROVIDER_SESSION);
        String clientSecret = "mock_cs_" + payment.getId() + "_" + UUID.randomUUID();
        payment.setClientSecret(clientSecret);
        payment.setPaymentUrl(UriComponentsBuilder.fromUriString(mockCheckoutBaseUrl)
                .queryParam("orderId", payment.getOrderId())
                .queryParam("paymentId", payment.getId())
                .queryParam("clientSecret", clientSecret)
                .build()
                .toUriString());
        payment.setProvider("MOCK");
        payment.setProviderSessionId("mock_ps_" + payment.getId());
        payment.setSessionStatus("READY");
        paymentRepository.save(payment);
        paymentHistoryRepository.save(paymentHistoryMapper.toEntity(payment, PaymentHistoryType.PURCHASE));
        saga.setState(PaymentSagaState.COMPLETED);
        savePaymentStateOutbox(PAYMENT_SESSION_READY, saga, payment);
    }

    private void settleBalancePayment(PaymentSaga saga, Payment payment, OrderResponseDto order) {
        saga.setState(PaymentSagaState.DEBITING_CUSTOMER_WALLET);
        String paymentRef = payment.getId().toString();
        walletClient.debitCustomerWallet(
                payment.getCustomerId(),
                new WalletMoneyRequestDto(payment.getAmount(), "USD", paymentRef, "Order " + order.orderNumber())
        );

        saga.setState(PaymentSagaState.CREDITING_SHOP_WALLETS);
        creditShopWallets(payment, order);

        saga.setState(PaymentSagaState.CONFIRMING_ORDER_PAID);
        orderClient.confirmPaid(payment.getOrderId().toString());

        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setSessionStatus("COMPLETED");
        payment.setPaymentUrl(null);
        payment.setClientSecret(null);
        payment.setProvider("WALLET");
        payment.setProviderSessionId(null);
        paymentRepository.save(payment);
        paymentHistoryRepository.save(paymentHistoryMapper.toEntity(payment, PaymentHistoryType.PURCHASE));

        saga.setState(PaymentSagaState.COMPLETED);
        savePaymentStateOutbox(PAYMENT_SETTLED, saga, payment);
    }

    private void failSaga(PaymentSaga saga, RuntimeException exception) {
        saga.setState(PaymentSagaState.FAILED);
        saga.setRetryCount(saga.getRetryCount() + 1);
        saga.setFailureReason(limit(exception.getMessage()));
        paymentSagaRepository.save(saga);

        if (saga.getPaymentId() == null) {
            return;
        }
        Payment payment = paymentRepository.findById(saga.getPaymentId()).orElse(null);
        if (payment == null || payment.getStatus() != PaymentStatus.PENDING) {
            return;
        }
        payment.setStatus(PaymentStatus.FAILED);
        payment.setSessionStatus("FAILED");
        paymentRepository.save(payment);
        paymentHistoryRepository.save(paymentHistoryMapper.toEntity(payment, PaymentHistoryType.PURCHASE));
        savePaymentStateOutbox(payment.getMethod() == PaymentMethod.BALANCE ? PAYMENT_FAILED : PAYMENT_SESSION_FAILED, saga, payment);
    }

    private PaymentSaga ensureSaga(Payment payment, String idempotencyKey) {
        PaymentSaga saga = paymentSagaRepository.findByOrderId(payment.getOrderId()).orElse(null);
        if (saga != null) {
            return saga;
        }
        saga = paymentSagaRepository.save(PaymentSaga.builder()
                .orderId(payment.getOrderId())
                .paymentId(payment.getId())
                .customerId(payment.getCustomerId())
                .idempotencyKey(idempotencyKey)
                .state(PaymentSagaState.STARTED)
                .retryCount(0)
                .build());
        saveOutbox(PAYMENT_CREATION_REQUESTED, "payment-saga", saga.getId(), new PaymentCreationRequestedEvent(
                UUID.randomUUID(),
                saga.getId(),
                payment.getId(),
                payment.getOrderId(),
                payment.getCustomerId(),
                payment.getMethod().name(),
                idempotencyKey,
                Instant.now()
        ));
        return saga;
    }

    private Payment findExistingPayment(UUID customerId, UUID orderId, String idempotencyKey) {
        if (idempotencyKey != null) {
            Payment payment = paymentRepository.findByCustomerIdAndIdempotencyKey(customerId, idempotencyKey).orElse(null);
            if (payment != null) {
                return payment;
            }
        }
        return paymentRepository.findFirstByCustomerIdAndOrderIdAndStatusOrderByCreatedAtDesc(customerId, orderId, PaymentStatus.PENDING).orElse(null);
    }

    private void validateRequest(PaymentCreateRequestDto request) {
        if (request == null || request.orderId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order id is required");
        }
        paymentMapper.resolveMethod(request.method());
    }

    private void validateOrderPayable(OrderResponseDto order) {
        if ("PAID".equalsIgnoreCase(order.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Paid order cannot create another payment");
        }
        if ("CANCELED".equalsIgnoreCase(order.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Canceled order cannot create a payment");
        }
    }

    private void creditShopWallets(Payment payment, OrderResponseDto order) {
        Map<UUID, BigDecimal> amountByShop = order.items().stream()
                .collect(Collectors.groupingBy(
                        OrderResponseDto.OrderItemResponseDto::shopId,
                        Collectors.reducing(
                                BigDecimal.ZERO,
                                item -> item.price().multiply(BigDecimal.valueOf(item.quantity())),
                                BigDecimal::add
                        )
                ));
        amountByShop.forEach((shopId, amount) -> walletClient.creditShopWallet(
                shopId,
                new WalletMoneyRequestDto(amount, "USD", payment.getId() + ":" + shopId, "Order " + order.orderNumber())
        ));
    }

    private void savePaymentStateOutbox(String eventType, PaymentSaga saga, Payment payment) {
        saveOutbox(eventType, "payment", payment.getId(), new PaymentStateEvent(
                UUID.randomUUID(),
                saga.getId(),
                payment.getId(),
                payment.getOrderId(),
                payment.getCustomerId(),
                eventType,
                payment.getStatus().name(),
                payment.getSessionStatus(),
                Instant.now()
        ));
    }

    private void saveOutbox(String eventType, String aggregateType, UUID aggregateId, Object payload) {
        try {
            paymentOutboxRepository.save(PaymentOutbox.builder()
                    .eventType(eventType)
                    .aggregateType(aggregateType)
                    .aggregateId(aggregateId)
                    .payload(objectMapper.writeValueAsString(payload))
                    .status(PaymentOutboxStatus.PENDING)
                    .attempts(0)
                    .build());
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to serialize payment event");
        }
    }

    private boolean isTerminal(PaymentSagaState state) {
        return state == PaymentSagaState.COMPLETED
                || state == PaymentSagaState.FAILED
                || state == PaymentSagaState.COMPENSATED;
    }

    private String normalizeIdempotencyKey(String idempotencyKey) {
        return idempotencyKey == null || idempotencyKey.isBlank() ? null : idempotencyKey.trim();
    }

    private String limit(String message) {
        if (message == null) {
            return null;
        }
        return message.length() <= 1024 ? message : message.substring(0, 1024);
    }
}
