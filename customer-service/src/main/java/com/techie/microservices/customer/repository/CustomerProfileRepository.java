package com.techie.microservices.customer.repository;

import com.techie.microservices.customer.model.CustomerProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, UUID> {
    Optional<CustomerProfile> findByAuthId(UUID authId);
}
