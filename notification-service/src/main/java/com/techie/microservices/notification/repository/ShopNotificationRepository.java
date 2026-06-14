package com.techie.microservices.notification.repository;

import com.techie.microservices.notification.model.ShopNotification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShopNotificationRepository extends JpaRepository<ShopNotification, String> {
    List<ShopNotification> findByShopIdOrderByCreatedAtDesc(String shopId, Pageable pageable);
}