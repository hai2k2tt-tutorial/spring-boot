package com.techie.microservices.payment.repository;

import com.techie.microservices.payment.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    List<Payment> findAllByCustomerId(UUID customerId);
    List<Payment> findAllByOrderId(UUID orderId);
    List<Payment> findAllByCustomerIdAndOrderId(UUID customerId, UUID orderId);
}
