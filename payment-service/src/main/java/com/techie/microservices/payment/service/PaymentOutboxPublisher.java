package com.techie.microservices.payment.service;

import com.techie.microservices.payment.model.PaymentOutbox;
import com.techie.microservices.payment.model.PaymentOutboxStatus;
import com.techie.microservices.payment.repository.PaymentOutboxRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentOutboxPublisher {
    private final PaymentOutboxRepository paymentOutboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;

    @Value("${payment.events.creation-topic:payment-creation-requests}")
    private String paymentCreationTopic;

    @Value("${payment.events.state-topic:payment-state-events}")
    private String paymentStateTopic;

    @Value("${payment.outbox.max-attempts:10}")
    private int maxAttempts;

    @Value("${payment.outbox.send-timeout:5s}")
    private Duration sendTimeout;

    @Scheduled(fixedDelayString = "${payment.outbox.publish-delay:2s}")
    @Transactional
    public void publishPendingEvents() {
        paymentOutboxRepository.findTop20ByStatusOrderByCreatedAtAsc(PaymentOutboxStatus.PENDING)
                .forEach(this::publish);
    }

    private void publish(PaymentOutbox outbox) {
        try {
            kafkaTemplate.send(resolveTopic(outbox), outbox.getAggregateId().toString(), outbox.getPayload())
                    .get(sendTimeout.toMillis(), TimeUnit.MILLISECONDS);
            outbox.setStatus(PaymentOutboxStatus.PUBLISHED);
            outbox.setPublishedAt(Instant.now());
            outbox.setLastError(null);
            paymentOutboxRepository.save(outbox);
        } catch (Exception exception) {
            outbox.setAttempts(outbox.getAttempts() + 1);
            outbox.setLastError(limit(exception.getMessage()));
            if (outbox.getAttempts() >= maxAttempts) {
                outbox.setStatus(PaymentOutboxStatus.FAILED);
            }
            paymentOutboxRepository.save(outbox);
            log.warn("Failed to publish payment outbox event {} type {}", outbox.getId(), outbox.getEventType(), exception);
        }
    }

    private String resolveTopic(PaymentOutbox outbox) {
        if (PaymentSagaOrchestratorService.PAYMENT_CREATION_REQUESTED.equals(outbox.getEventType())) {
            return paymentCreationTopic;
        }
        return paymentStateTopic;
    }

    private String limit(String message) {
        if (message == null) {
            return null;
        }
        return message.length() <= 1024 ? message : message.substring(0, 1024);
    }
}
