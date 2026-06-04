package com.techie.microservices.payment.client;

import com.techie.microservices.payment.dto.WalletMoneyRequestDto;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.PostExchange;

import java.util.UUID;

public interface WalletClient {
    @PostExchange("/api/wallet/customer/me/debits")
    void debitCurrentCustomerWallet(@RequestBody WalletMoneyRequestDto request,
                                    @RequestHeader("Authorization") String authorization);

    @PostExchange("/api/wallet/shops/{shopId}/credits")
    void creditShopWallet(@PathVariable UUID shopId, @RequestBody WalletMoneyRequestDto request);
}
