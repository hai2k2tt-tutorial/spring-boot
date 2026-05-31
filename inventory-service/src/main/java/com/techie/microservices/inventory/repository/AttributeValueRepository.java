package com.techie.microservices.inventory.repository;

import com.techie.microservices.inventory.model.AttributeValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AttributeValueRepository extends JpaRepository<AttributeValue, String> {
    List<AttributeValue> findAllByAttributeIdOrderBySortOrderAsc(String attributeId);
    @Query("""
            select attributeValue
            from AttributeValue attributeValue
            join fetch attributeValue.attribute attribute
            where attribute.id in :attributeIds
            order by attribute.id asc, attributeValue.sortOrder asc
            """)
    List<AttributeValue> findAllByAttributeIds(@Param("attributeIds") List<String> attributeIds);
    List<AttributeValue> findAllByIdIn(List<String> ids);
}
