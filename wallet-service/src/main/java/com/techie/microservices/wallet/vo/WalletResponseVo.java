package com.techie.microservices.wallet.vo;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WalletResponseVo(
        UUID id,
        String ownerType,
        UUID ownerId,
        BigDecimal balance,
        String currency,
        Instant updatedAt
) {
}
