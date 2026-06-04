package com.techie.microservices.shop.mapper;

import com.techie.microservices.shop.dto.ShopProfileUpdateRequestDto;
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
import java.util.UUID;

@Component
public class ShopMapper {

    public ShopAuth toAuthEntity(UUID authId, String email) {
        return ShopAuth.builder()
                .id(authId)
                .email(email)
                .status(ShopStatus.ACTIVE)
                .build();
    }

    public ShopProfile toProfileEntity(ShopAuth shopAuth, String shopName, String ownerName) {
        return ShopProfile.builder()
                .auth(shopAuth)
                .shopName(shopName)
                .ownerName(ownerName)
                .build();
    }

    public ShopWallet toWalletEntity(ShopProfile shopProfile) {
        return ShopWallet.builder()
                .shop(shopProfile)
                .balance(BigDecimal.ZERO)
                .currency("USD")
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

    public void updateProfile(ShopProfile shopProfile, ShopProfileUpdateRequestDto shopProfileUpdateRequestDto) {
        if (shopProfileUpdateRequestDto.shopName() != null && !shopProfileUpdateRequestDto.shopName().isBlank()) {
            shopProfile.setShopName(shopProfileUpdateRequestDto.shopName().trim());
        }
        if (shopProfileUpdateRequestDto.ownerName() != null && !shopProfileUpdateRequestDto.ownerName().isBlank()) {
            shopProfile.setOwnerName(shopProfileUpdateRequestDto.ownerName().trim());
        }
        shopProfile.setPhone(normalizeOptional(shopProfileUpdateRequestDto.phone()));
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
