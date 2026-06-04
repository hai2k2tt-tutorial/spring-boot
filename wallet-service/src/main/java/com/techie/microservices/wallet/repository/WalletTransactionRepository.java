package com.techie.microservices.wallet.repository;

import com.techie.microservices.wallet.model.WalletOwnerType;
import com.techie.microservices.wallet.model.WalletTransaction;
import com.techie.microservices.wallet.model.WalletTransactionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {
    List<WalletTransaction> findAllByOwnerTypeAndOwnerIdOrderByCreatedAtDesc(WalletOwnerType ownerType, UUID ownerId);

    Optional<WalletTransaction> findByOwnerTypeAndOwnerIdAndTypeAndExternalRef(
            WalletOwnerType ownerType,
            UUID ownerId,
            WalletTransactionType type,
            String externalRef
    );
}
