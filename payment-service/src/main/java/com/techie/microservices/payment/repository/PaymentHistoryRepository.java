package com.techie.microservices.payment.repository;

import com.techie.microservices.payment.model.PaymentHistory;
import com.techie.microservices.payment.model.PaymentHistoryType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PaymentHistoryRepository extends JpaRepository<PaymentHistory, UUID> {
    List<PaymentHistory> findAllByPaymentIdOrderByCreatedAtAsc(UUID paymentId);

    boolean existsByPayment_IdAndType(UUID paymentId, PaymentHistoryType type);
}
