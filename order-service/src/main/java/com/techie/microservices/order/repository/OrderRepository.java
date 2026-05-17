package com.techie.microservices.order.repository;

import com.techie.microservices.order.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, String> {
    List<Order> findAllByCustomerId(String customerId);
}
