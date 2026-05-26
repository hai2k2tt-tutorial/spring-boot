package com.techie.microservices.product.repository;

import com.techie.microservices.product.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findByShopId(UUID shopId);
}
