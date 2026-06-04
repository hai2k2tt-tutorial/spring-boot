package com.techie.microservices.wallet.repository;

import com.techie.microservices.wallet.model.Wallet;
import com.techie.microservices.wallet.model.WalletOwnerType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface WalletRepository extends JpaRepository<Wallet, UUID> {
    Optional<Wallet> findByOwnerTypeAndOwnerId(WalletOwnerType ownerType, UUID ownerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select wallet from Wallet wallet where wallet.ownerType = :ownerType and wallet.ownerId = :ownerId")
    Optional<Wallet> findByOwnerForUpdate(@Param("ownerType") WalletOwnerType ownerType, @Param("ownerId") UUID ownerId);
}
