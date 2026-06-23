package com.techie.microservices.payment.repository;

import com.techie.microservices.payment.model.PaymentSaga;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentSagaRepository extends JpaRepository<PaymentSaga, UUID> {
    Optional<PaymentSaga> findByOrderId(UUID orderId);
    Optional<PaymentSaga> findByCustomerIdAndIdempotencyKey(UUID customerId, String idempotencyKey);
}
