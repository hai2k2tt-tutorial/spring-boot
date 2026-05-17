package com.techie.microservices.shop.repository;

import com.techie.microservices.shop.model.ShopWallet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ShopWalletRepository extends JpaRepository<ShopWallet, UUID> {
}
