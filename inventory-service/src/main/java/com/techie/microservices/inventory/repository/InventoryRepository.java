package com.techie.microservices.inventory.repository;

import com.techie.microservices.inventory.model.Inventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, String> {
    Optional<Inventory> findBySkuSkuCode(String skuCode);
    Optional<Inventory> findBySkuId(String skuId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select inventory from Inventory inventory where inventory.sku.id = :skuId")
    Optional<Inventory> findBySkuIdForUpdate(@Param("skuId") String skuId);
}
