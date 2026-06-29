package com.techie.microservices.wallet.mapper;

import com.techie.microservices.wallet.model.Wallet;
import com.techie.microservices.wallet.model.WalletTransaction;
import com.techie.microservices.wallet.vo.WalletResponseVo;
import com.techie.microservices.wallet.vo.WalletTransactionResponseVo;
import org.springframework.stereotype.Component;

@Component
public class WalletMapper {

    public WalletResponseVo toVo(Wallet wallet) {
        return new WalletResponseVo(
                wallet.getId(),
                wallet.getOwnerType().name(),
                wallet.getOwnerId(),
                wallet.getBalance(),
                wallet.getCurrency(),
                wallet.getUpdatedAt()
        );
    }

    public WalletTransactionResponseVo toVo(WalletTransaction transaction) {
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
}
