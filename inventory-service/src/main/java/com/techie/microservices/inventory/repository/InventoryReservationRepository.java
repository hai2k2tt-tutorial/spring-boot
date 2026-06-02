package com.techie.microservices.inventory.repository;

import com.techie.microservices.inventory.model.InventoryReservation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryReservationRepository extends JpaRepository<InventoryReservation, String> {
    List<InventoryReservation> findAllByOrderId(String orderId);
    boolean existsByOrderId(String orderId);
}
