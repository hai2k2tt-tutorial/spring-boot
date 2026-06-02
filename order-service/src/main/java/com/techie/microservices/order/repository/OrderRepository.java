package com.techie.microservices.order.repository;

import com.techie.microservices.order.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, String> {
    List<Order> findAllByCustomerId(String customerId);
    Optional<Order> findByCustomerIdAndIdempotencyKey(String customerId, String idempotencyKey);
}
