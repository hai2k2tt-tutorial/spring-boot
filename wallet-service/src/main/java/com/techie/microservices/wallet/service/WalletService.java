package com.techie.microservices.wallet.service;

import com.techie.microservices.wallet.client.CustomerClient;
import com.techie.microservices.wallet.client.ShopClient;
import com.techie.microservices.wallet.dto.WalletMoneyRequestDto;
import com.techie.microservices.wallet.model.Wallet;
import com.techie.microservices.wallet.model.WalletOwnerType;
import com.techie.microservices.wallet.model.WalletTransaction;
import com.techie.microservices.wallet.model.WalletTransactionType;
import com.techie.microservices.wallet.repository.WalletRepository;
import com.techie.microservices.wallet.repository.WalletTransactionRepository;
import com.techie.microservices.wallet.vo.WalletResponseVo;
import com.techie.microservices.wallet.vo.WalletTransactionResponseVo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WalletService {
    private final CustomerClient customerClient;
    private final ShopClient shopClient;
    private final WalletRepository walletRepository;
    private final WalletTransactionRepository transactionRepository;

    @Transactional
    public WalletResponseVo getCurrentCustomerWallet(String authorization) {
        UUID customerId = customerClient.getCurrentCustomer(authorization).customerId();
        return toWalletVo(getOrCreateWallet(WalletOwnerType.CUSTOMER, customerId));
    }

    @Transactional(readOnly = true)
    public List<WalletTransactionResponseVo> getCurrentCustomerTransactions(String authorization) {
        UUID customerId = customerClient.getCurrentCustomer(authorization).customerId();
        return getTransactions(WalletOwnerType.CUSTOMER, customerId);
    }

    @Transactional
    public WalletResponseVo depositCurrentCustomerWallet(String authorization, WalletMoneyRequestDto request) {
        UUID customerId = customerClient.getCurrentCustomer(authorization).customerId();
        return applyMoney(WalletOwnerType.CUSTOMER, customerId, WalletTransactionType.CREDIT, request, false);
    }

    @Transactional
    public WalletResponseVo debitCurrentCustomerWallet(String authorization, WalletMoneyRequestDto request) {
        UUID customerId = customerClient.getCurrentCustomer(authorization).customerId();
        return applyMoney(WalletOwnerType.CUSTOMER, customerId, WalletTransactionType.DEBIT, request, true);
    }

    @Transactional
    public WalletResponseVo debitCustomerWallet(UUID customerId, WalletMoneyRequestDto request) {
        return applyMoney(WalletOwnerType.CUSTOMER, customerId, WalletTransactionType.DEBIT, request, true);
    }

    @Transactional
    public WalletResponseVo getCurrentShopWallet(String authorization) {
        UUID shopId = shopClient.getCurrentShop(authorization).shopId();
        return toWalletVo(getOrCreateWallet(WalletOwnerType.SHOP, shopId));
    }

    @Transactional(readOnly = true)
    public List<WalletTransactionResponseVo> getCurrentShopTransactions(String authorization) {
        UUID shopId = shopClient.getCurrentShop(authorization).shopId();
        return getTransactions(WalletOwnerType.SHOP, shopId);
    }

    @Transactional
    public WalletResponseVo creditShopWallet(UUID shopId, WalletMoneyRequestDto request) {
        return applyMoney(WalletOwnerType.SHOP, shopId, WalletTransactionType.CREDIT, request, true);
    }

    private List<WalletTransactionResponseVo> getTransactions(WalletOwnerType ownerType, UUID ownerId) {
        return transactionRepository.findAllByOwnerTypeAndOwnerIdOrderByCreatedAtDesc(ownerType, ownerId).stream()
                .map(this::toTransactionVo)
                .toList();
    }

    private WalletResponseVo applyMoney(
            WalletOwnerType ownerType,
            UUID ownerId,
            WalletTransactionType type,
            WalletMoneyRequestDto request,
            boolean idempotent
    ) {
        validateRequest(request);
        String externalRef = normalize(request.externalRef());
        if (idempotent && externalRef != null) {
            WalletTransaction existing = transactionRepository
                    .findByOwnerTypeAndOwnerIdAndTypeAndExternalRef(ownerType, ownerId, type, externalRef)
                    .orElse(null);
            if (existing != null) {
                return toWalletVo(getOrCreateWallet(ownerType, ownerId));
            }
        }

        getOrCreateWallet(ownerType, ownerId);
        Wallet wallet = walletRepository.findByOwnerForUpdate(ownerType, ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        if (request.currency() != null && !request.currency().isBlank() && !wallet.getCurrency().equalsIgnoreCase(request.currency().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet currency does not match request currency");
        }

        BigDecimal nextBalance = type == WalletTransactionType.CREDIT
                ? wallet.getBalance().add(request.amount())
                : wallet.getBalance().subtract(request.amount());
        if (nextBalance.signum() < 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Insufficient wallet balance");
        }

        wallet.setBalance(nextBalance);
        wallet.setUpdatedAt(Instant.now());
        walletRepository.save(wallet);
        transactionRepository.save(WalletTransaction.builder()
                .walletId(wallet.getId())
                .ownerType(ownerType)
                .ownerId(ownerId)
                .type(type)
                .amount(request.amount())
                .balanceAfter(nextBalance)
                .currency(wallet.getCurrency())
                .externalRef(externalRef)
                .description(normalize(request.description()))
                .build());
        return toWalletVo(wallet);
    }

    private Wallet getOrCreateWallet(WalletOwnerType ownerType, UUID ownerId) {
        return walletRepository.findByOwnerTypeAndOwnerId(ownerType, ownerId)
                .orElseGet(() -> walletRepository.save(Wallet.builder()
                        .ownerType(ownerType)
                        .ownerId(ownerId)
                        .balance(BigDecimal.ZERO)
                        .currency("USD")
                        .build()));
    }

    private void validateRequest(WalletMoneyRequestDto request) {
        if (request == null || request.amount() == null || request.amount().signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be greater than zero");
        }
    }

    private WalletResponseVo toWalletVo(Wallet wallet) {
        return new WalletResponseVo(
                wallet.getId(),
                wallet.getOwnerType().name(),
                wallet.getOwnerId(),
                wallet.getBalance(),
                wallet.getCurrency(),
                wallet.getUpdatedAt()
        );
    }

    private WalletTransactionResponseVo toTransactionVo(WalletTransaction transaction) {
        return new WalletTransactionResponseVo(
                transaction.getId(),
                transaction.getWalletId(),
                transaction.getOwnerType().name(),
                transaction.getOwnerId(),
                transaction.getType().name(),
                transaction.getAmount(),
                transaction.getBalanceAfter(),
                transaction.getCurrency(),
                transaction.getExternalRef(),
                transaction.getDescription(),
                transaction.getCreatedAt()
        );
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
