package com.techie.microservices.payment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techie.microservices.payment.event.PaymentCreationRequestedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentSagaKafkaListener {
    private final ObjectMapper objectMapper;
    private final PaymentSagaOrchestratorService paymentSagaOrchestratorService;

    @KafkaListener(
            topics = "${payment.events.creation-topic:payment-creation-requests}",
            groupId = "${payment.events.saga-group:payment-service-saga}"
    )
    public void handlePaymentCreationRequested(String payload) throws Exception {
        PaymentCreationRequestedEvent event = objectMapper.readValue(payload, PaymentCreationRequestedEvent.class);
        log.info("Processing payment saga event {} for order {}", event.eventId(), event.orderId());
        paymentSagaOrchestratorService.processPaymentCreationRequested(event);
    }
}
