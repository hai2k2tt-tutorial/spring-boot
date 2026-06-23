package com.techie.microservices.wallet.controller;

import com.techie.microservices.wallet.dto.WalletMoneyRequestDto;
import com.techie.microservices.wallet.service.WalletService;
import com.techie.microservices.wallet.vo.WalletResponseVo;
import com.techie.microservices.wallet.vo.WalletTransactionResponseVo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {
    private final WalletService walletService;

    @GetMapping("/customer/me")
    @ResponseStatus(HttpStatus.OK)
    public WalletResponseVo getCurrentCustomerWallet(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return walletService.getCurrentCustomerWallet(authorization);
    }

    @GetMapping("/customer/me/transactions")
    @ResponseStatus(HttpStatus.OK)
    public List<WalletTransactionResponseVo> getCurrentCustomerTransactions(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return walletService.getCurrentCustomerTransactions(authorization);
    }

    @PostMapping("/customer/me/deposits")
    @ResponseStatus(HttpStatus.OK)
    public WalletResponseVo depositCurrentCustomerWallet(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                                         @RequestBody WalletMoneyRequestDto request) {
        return walletService.depositCurrentCustomerWallet(authorization, request);
    }

    @PostMapping("/customer/me/debits")
    @ResponseStatus(HttpStatus.OK)
    public WalletResponseVo debitCurrentCustomerWallet(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                                       @RequestBody WalletMoneyRequestDto request) {
        return walletService.debitCurrentCustomerWallet(authorization, request);
    }

    @PostMapping("/customers/{customerId:[0-9a-fA-F-]{36}}/debits")
    @ResponseStatus(HttpStatus.OK)
    public WalletResponseVo debitCustomerWallet(@PathVariable UUID customerId,
                                                @RequestBody WalletMoneyRequestDto request) {
        return walletService.debitCustomerWallet(customerId, request);
    }

    @GetMapping("/shop/me")
    @ResponseStatus(HttpStatus.OK)
    public WalletResponseVo getCurrentShopWallet(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return walletService.getCurrentShopWallet(authorization);
    }

    @GetMapping("/shop/me/transactions")
    @ResponseStatus(HttpStatus.OK)
    public List<WalletTransactionResponseVo> getCurrentShopTransactions(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return walletService.getCurrentShopTransactions(authorization);
    }

    @PostMapping("/shops/{shopId:[0-9a-fA-F-]{36}}/credits")
    @ResponseStatus(HttpStatus.OK)
    public WalletResponseVo creditShopWallet(@PathVariable UUID shopId, @RequestBody WalletMoneyRequestDto request) {
        return walletService.creditShopWallet(shopId, request);
    }
}
