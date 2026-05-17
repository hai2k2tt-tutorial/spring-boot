package com.techie.microservices.shop.service;

import com.techie.microservices.shop.dto.ShopCreateRequestDto;
import com.techie.microservices.shop.dto.ShopStatusUpdateRequestDto;
import com.techie.microservices.shop.dto.ShopWalletUpdateRequestDto;
import com.techie.microservices.shop.mapper.ShopMapper;
import com.techie.microservices.shop.model.ShopAuth;
import com.techie.microservices.shop.model.ShopProfile;
import com.techie.microservices.shop.model.ShopWallet;
import com.techie.microservices.shop.repository.ShopAuthRepository;
import com.techie.microservices.shop.repository.ShopProfileRepository;
import com.techie.microservices.shop.repository.ShopWalletRepository;
import com.techie.microservices.shop.vo.ShopResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopService {
    private final ShopAuthRepository shopAuthRepository;
    private final ShopProfileRepository shopProfileRepository;
    private final ShopWalletRepository shopWalletRepository;
    private final ShopMapper shopMapper;

    @Transactional
    public ShopResponseVo createShop(ShopCreateRequestDto shopCreateRequestDto) {
        if (shopAuthRepository.findByEmail(shopCreateRequestDto.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Shop email already exists");
        }

        ShopAuth shopAuth = shopMapper.toAuthEntity(shopCreateRequestDto);
        shopAuthRepository.save(shopAuth);

        ShopProfile shopProfile = shopMapper.toProfileEntity(shopCreateRequestDto, shopAuth);
        shopProfileRepository.save(shopProfile);

        ShopWallet shopWallet = shopMapper.toWalletEntity(shopCreateRequestDto, shopProfile);
        shopWalletRepository.save(shopWallet);

        log.info("Shop created successfully");
        return shopMapper.toVo(shopAuth, shopProfile, shopWallet);
    }

    @Transactional
    public ShopResponseVo updateShopStatus(UUID shopId, ShopStatusUpdateRequestDto shopStatusUpdateRequestDto) {
        ShopProfile shopProfile = shopProfileRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));
        ShopAuth shopAuth = shopProfile.getAuth();
        shopAuth.setStatus(shopMapper.resolveStatus(shopStatusUpdateRequestDto.status()));
        shopAuth.setUpdatedAt(Instant.now());
        shopAuthRepository.save(shopAuth);
        ShopWallet shopWallet = shopWalletRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop wallet not found"));
        return shopMapper.toVo(shopAuth, shopProfile, shopWallet);
    }

    @Transactional
    public ShopResponseVo updateWallet(UUID shopId, ShopWalletUpdateRequestDto shopWalletUpdateRequestDto) {
        ShopProfile shopProfile = shopProfileRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));
        ShopAuth shopAuth = shopProfile.getAuth();
        ShopWallet shopWallet = shopWalletRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop wallet not found"));
        shopMapper.updateWallet(shopWallet, shopWalletUpdateRequestDto);
        shopWallet.setUpdatedAt(Instant.now());
        shopWalletRepository.save(shopWallet);
        return shopMapper.toVo(shopAuth, shopProfile, shopWallet);
    }

    @Transactional(readOnly = true)
    public List<ShopResponseVo> getShops() {
        return shopProfileRepository.findAll().stream()
                .map(this::mapShop)
                .toList();
    }

    @Transactional(readOnly = true)
    public ShopResponseVo getShop(UUID shopId) {
        ShopProfile shopProfile = shopProfileRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));
        return mapShop(shopProfile);
    }

    private ShopResponseVo mapShop(ShopProfile shopProfile) {
        ShopAuth shopAuth = shopProfile.getAuth();
        ShopWallet shopWallet = shopWalletRepository.findById(shopProfile.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop wallet not found"));
        return shopMapper.toVo(shopAuth, shopProfile, shopWallet);
    }
}
