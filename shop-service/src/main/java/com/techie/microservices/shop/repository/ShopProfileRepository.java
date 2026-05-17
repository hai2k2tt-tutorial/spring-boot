package com.techie.microservices.shop.repository;

import com.techie.microservices.shop.model.ShopProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ShopProfileRepository extends JpaRepository<ShopProfile, UUID> {
    Optional<ShopProfile> findByAuthId(UUID authId);
}
