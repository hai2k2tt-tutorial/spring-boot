package com.techie.microservices.inventory.repository;

import com.techie.microservices.inventory.model.SkuAttributeValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SkuAttributeValueRepository extends JpaRepository<SkuAttributeValue, String> {
    List<SkuAttributeValue> findAllBySkuId(String skuId);

    @Query("""
            select skuAttributeValue
            from SkuAttributeValue skuAttributeValue
            join fetch skuAttributeValue.sku sku
            join fetch skuAttributeValue.attributeValue attributeValue
            where sku.productId = :productId
            """)
    List<SkuAttributeValue> findAllByProductId(@Param("productId") String productId);
}
