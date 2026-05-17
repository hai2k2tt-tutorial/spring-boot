package com.techie.microservices.customer.repository;

import com.techie.microservices.customer.model.CustomerAuth;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CustomerAuthRepository extends JpaRepository<CustomerAuth, UUID> {
    Optional<CustomerAuth> findByEmail(String email);
}
