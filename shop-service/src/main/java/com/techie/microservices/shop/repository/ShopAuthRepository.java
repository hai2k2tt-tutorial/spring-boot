package com.techie.microservices.shop.repository;

import com.techie.microservices.shop.model.ShopAuth;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ShopAuthRepository extends JpaRepository<ShopAuth, UUID> {
    Optional<ShopAuth> findByEmail(String email);
}
