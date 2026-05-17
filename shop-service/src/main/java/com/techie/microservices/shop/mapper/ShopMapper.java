package com.techie.microservices.shop.mapper;

import com.techie.microservices.shop.dto.ShopCreateRequestDto;
import com.techie.microservices.shop.dto.ShopWalletUpdateRequestDto;
import com.techie.microservices.shop.model.ShopAuth;
import com.techie.microservices.shop.model.ShopProfile;
import com.techie.microservices.shop.model.ShopStatus;
import com.techie.microservices.shop.model.ShopWallet;
import com.techie.microservices.shop.vo.ShopResponseVo;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

@Component
public class ShopMapper {

    public ShopAuth toAuthEntity(ShopCreateRequestDto shopCreateRequestDto) {
        return ShopAuth.builder()
                .email(shopCreateRequestDto.email())
                .passwordHash(shopCreateRequestDto.passwordHash())
                .status(resolveStatus(shopCreateRequestDto.status()))
                .build();
    }

    public ShopProfile toProfileEntity(ShopCreateRequestDto shopCreateRequestDto, ShopAuth shopAuth) {
        return ShopProfile.builder()
                .auth(shopAuth)
                .shopName(shopCreateRequestDto.shopName())
                .ownerName(shopCreateRequestDto.ownerName())
                .phone(shopCreateRequestDto.phone())
                .build();
    }

    public ShopWallet toWalletEntity(ShopCreateRequestDto shopCreateRequestDto, ShopProfile shopProfile) {
        return ShopWallet.builder()
                .shop(shopProfile)
                .balance(shopCreateRequestDto.initialBalance() != null ? shopCreateRequestDto.initialBalance() : BigDecimal.ZERO)
                .currency(shopCreateRequestDto.currency())
                .build();
    }

    public ShopResponseVo toVo(ShopAuth shopAuth, ShopProfile shopProfile, ShopWallet shopWallet) {
        return new ShopResponseVo(
                shopAuth.getId(),
                shopAuth.getEmail(),
                shopAuth.getStatus().name(),
                shopProfile.getId(),
                shopProfile.getShopName(),
                shopProfile.getOwnerName(),
                shopProfile.getPhone(),
                shopWallet.getBalance(),
                shopWallet.getCurrency(),
                shopAuth.getCreatedAt(),
                shopAuth.getUpdatedAt(),
                shopProfile.getCreatedAt(),
                shopProfile.getUpdatedAt(),
                shopWallet.getUpdatedAt()
        );
    }

    public ShopStatus resolveStatus(String status) {
        if (status == null || status.isBlank()) {
            return ShopStatus.ACTIVE;
        }
        try {
            return ShopStatus.valueOf(status.trim().toUpperCase());
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid shop status");
        }
    }

    public void updateWallet(ShopWallet shopWallet, ShopWalletUpdateRequestDto shopWalletUpdateRequestDto) {
        if (shopWalletUpdateRequestDto.balance() != null) {
            shopWallet.setBalance(shopWalletUpdateRequestDto.balance());
        }
        if (shopWalletUpdateRequestDto.currency() != null && !shopWalletUpdateRequestDto.currency().isBlank()) {
            shopWallet.setCurrency(shopWalletUpdateRequestDto.currency());
        }
    }
}
