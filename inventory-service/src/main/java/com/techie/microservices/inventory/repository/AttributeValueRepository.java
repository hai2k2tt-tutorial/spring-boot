package com.techie.microservices.inventory.repository;

import com.techie.microservices.inventory.model.AttributeValue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttributeValueRepository extends JpaRepository<AttributeValue, String> {
    List<AttributeValue> findAllByAttributeIdOrderBySortOrderAsc(String attributeId);
    List<AttributeValue> findAllByIdIn(List<String> ids);
}
