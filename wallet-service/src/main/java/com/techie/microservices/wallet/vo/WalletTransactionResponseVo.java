package com.techie.microservices.wallet.vo;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WalletTransactionResponseVo(
        UUID id,
        UUID walletId,
        String ownerType,
        UUID ownerId,
        String type,
        BigDecimal amount,
        BigDecimal balanceAfter,
        String currency,
        String externalRef,
        String description,
        Instant createdAt
) {
}
