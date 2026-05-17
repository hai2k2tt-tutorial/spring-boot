package com.techie.microservices.customer.repository;

import com.techie.microservices.customer.model.CustomerWallet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CustomerWalletRepository extends JpaRepository<CustomerWallet, UUID> {
}
