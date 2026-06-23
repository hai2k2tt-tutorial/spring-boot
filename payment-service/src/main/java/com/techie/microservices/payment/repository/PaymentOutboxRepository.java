package com.techie.microservices.payment.repository;

import com.techie.microservices.payment.model.PaymentOutbox;
import com.techie.microservices.payment.model.PaymentOutboxStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PaymentOutboxRepository extends JpaRepository<PaymentOutbox, UUID> {
    List<PaymentOutbox> findTop20ByStatusOrderByCreatedAtAsc(PaymentOutboxStatus status);
}
