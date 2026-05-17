package com.techie.microservices.inventory.repository;

import com.techie.microservices.inventory.model.SkuAttributeValue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SkuAttributeValueRepository extends JpaRepository<SkuAttributeValue, String> {
    List<SkuAttributeValue> findAllBySkuId(String skuId);
}
