package com.techie.microservices.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techie.microservices.payment.client.OrderClient;
import com.techie.microservices.payment.client.WalletClient;
import com.techie.microservices.payment.dto.OrderResponseDto;
import com.techie.microservices.payment.dto.PaymentProviderWebhookRequestDto;
import com.techie.microservices.payment.event.PaymentCreationRequestedEvent;
import com.techie.microservices.payment.mapper.PaymentHistoryMapper;
import com.techie.microservices.payment.mapper.PaymentMapper;
import com.techie.microservices.payment.model.Payment;
import com.techie.microservices.payment.model.PaymentHistoryType;
import com.techie.microservices.payment.model.PaymentMethod;
import com.techie.microservices.payment.model.PaymentSaga;
import com.techie.microservices.payment.model.PaymentSagaState;
import com.techie.microservices.payment.model.PaymentStatus;
import com.techie.microservices.payment.repository.PaymentHistoryRepository;
import com.techie.microservices.payment.repository.PaymentOutboxRepository;
import com.techie.microservices.payment.repository.PaymentRepository;
import com.techie.microservices.payment.repository.PaymentSagaRepository;
import com.techie.microservices.payment.util.TokenIdentity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentHistoryRecordingTest {

    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private PaymentHistoryRepository paymentHistoryRepository;
    @Mock
    private PaymentSagaRepository paymentSagaRepository;
    @Mock
    private PaymentOutboxRepository paymentOutboxRepository;
    @Mock
    private OrderClient orderClient;
    @Mock
    private WalletClient walletClient;
    @Mock
    private TokenIdentity tokenIdentity;

    private final PaymentMapper paymentMapper = new PaymentMapper();
    private final PaymentHistoryMapper paymentHistoryMapper = new PaymentHistoryMapper();

    @Test
    void cardSessionReadyDoesNotRecordPurchaseHistory() {
        PaymentSagaOrchestratorService paymentSagaOrchestratorService = new PaymentSagaOrchestratorService(
                paymentRepository,
                paymentHistoryRepository,
                paymentSagaRepository,
                paymentOutboxRepository,
                orderClient,
                walletClient,
                paymentMapper,
                paymentHistoryMapper,
                tokenIdentity,
                new ObjectMapper().findAndRegisterModules()
        );
        UUID customerId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        UUID sagaId = UUID.randomUUID();

        Payment payment = pendingCardPayment(paymentId, customerId, orderId);
        PaymentSaga saga = PaymentSaga.builder()
                .id(sagaId)
                .orderId(orderId)
                .paymentId(paymentId)
                .customerId(customerId)
                .state(PaymentSagaState.STARTED)
                .retryCount(0)
                .build();
        PaymentCreationRequestedEvent event = new PaymentCreationRequestedEvent(
                UUID.randomUUID(),
                sagaId,
                paymentId,
                orderId,
                customerId,
                PaymentMethod.CARD.name(),
                null,
                Instant.now()
        );

        ReflectionTestUtils.setField(paymentSagaOrchestratorService, "mockCheckoutBaseUrl", "https://customer-fe-next.haint.fyi/payments/checkout");
        when(paymentSagaRepository.findById(sagaId)).thenReturn(Optional.of(saga));
        when(orderClient.getOrderForInternalSettlement(orderId.toString())).thenReturn(order(orderId, customerId));
        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        paymentSagaOrchestratorService.processPaymentCreationRequested(event);

        verify(paymentHistoryRepository, never()).save(any());
        verify(paymentHistoryRepository, never()).existsByPayment_IdAndType(any(), any());
        verify(paymentOutboxRepository).save(ArgumentMatchers.argThat(outbox ->
                PaymentSagaOrchestratorService.PAYMENT_SESSION_READY.equals(outbox.getEventType())
        ));
    }

    @Test
    void providerSuccessRecordsOnePurchaseHistory() {
        UUID customerId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        Payment payment = pendingCardPayment(paymentId, customerId, orderId);
        payment.setSessionStatus("READY");
        payment.setClientSecret("mock_cs");

        PaymentService paymentService = new PaymentService(
                paymentRepository,
                paymentHistoryRepository,
                orderClient,
                walletClient,
                paymentMapper,
                paymentHistoryMapper,
                tokenIdentity
        );

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderClient.getOrderForInternalSettlement(orderId.toString())).thenReturn(order(orderId, customerId));
        when(paymentHistoryRepository.existsByPayment_IdAndType(paymentId, PaymentHistoryType.PURCHASE)).thenReturn(false);

        paymentService.handleProviderWebhook(
                new PaymentProviderWebhookRequestDto(paymentId, null, "mock_cs", PaymentStatus.SUCCESS.name(), UUID.randomUUID().toString()),
                null
        );

        verify(paymentHistoryRepository).existsByPayment_IdAndType(paymentId, PaymentHistoryType.PURCHASE);
        verify(paymentHistoryRepository).save(ArgumentMatchers.argThat(history ->
                history.getPayment().getId().equals(paymentId)
                        && history.getType() == PaymentHistoryType.PURCHASE
                        && history.getAmount().compareTo(BigDecimal.valueOf(70.99)) == 0
        ));
        verify(orderClient).confirmPaid(orderId.toString());
    }

    private static Payment pendingCardPayment(UUID paymentId, UUID customerId, UUID orderId) {
        return Payment.builder()
                .id(paymentId)
                .customerId(customerId)
                .orderId(orderId)
                .amount(BigDecimal.valueOf(70.99))
                .method(PaymentMethod.CARD)
                .status(PaymentStatus.PENDING)
                .sessionStatus("CREATING")
                .provider("MOCK")
                .build();
    }

    private static OrderResponseDto order(UUID orderId, UUID customerId) {
        UUID shopId = UUID.randomUUID();
        return new OrderResponseDto(
                orderId,
                UUID.randomUUID().toString(),
                customerId,
                "PENDING_PAYMENT",
                BigDecimal.valueOf(70.99),
                List.of(new OrderResponseDto.OrderItemResponseDto(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        shopId,
                        BigDecimal.valueOf(70.99),
                        1
                ))
        );
    }
}
