package com.techie.microservices.inventory.repository;

import com.techie.microservices.inventory.model.Attribute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttributeRepository extends JpaRepository<Attribute, String> {
    List<Attribute> findAllByProductId(String productId);
    boolean existsByProductIdAndCode(String productId, String code);
}
