package com.techie.microservices.inventory.repository;

import com.techie.microservices.inventory.model.Sku;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SkuRepository extends JpaRepository<Sku, String> {
    List<Sku> findAllByProductId(String productId);
    Optional<Sku> findBySkuCode(String skuCode);
}
