package com.techie.microservices.shop.controller;

import com.techie.microservices.shop.dto.ShopProfileUpdateRequestDto;
import com.techie.microservices.shop.dto.ShopStatusUpdateRequestDto;
import com.techie.microservices.shop.dto.ShopWalletUpdateRequestDto;
import com.techie.microservices.shop.service.ShopService;
import com.techie.microservices.shop.vo.ShopResponseVo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/shops")
@RequiredArgsConstructor
public class ShopController {

    private final ShopService shopService;

    @PostMapping("/me/sync")
    @ResponseStatus(HttpStatus.OK)
    public ShopResponseVo syncCurrentShop(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return shopService.syncCurrentShop(authorization);
    }

    @GetMapping("/me")
    @ResponseStatus(HttpStatus.OK)
    public ShopResponseVo getCurrentShop(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return shopService.getCurrentShop(authorization);
    }

    @PatchMapping("/me/profile")
    @ResponseStatus(HttpStatus.OK)
    public ShopResponseVo updateCurrentProfile(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestBody ShopProfileUpdateRequestDto shopProfileUpdateRequestDto
    ) {
        return shopService.updateCurrentProfile(authorization, shopProfileUpdateRequestDto);
    }

    @PatchMapping("/{shopId:[0-9a-fA-F-]{36}}/status")
    @ResponseStatus(HttpStatus.OK)
    public ShopResponseVo updateShopStatus(@PathVariable UUID shopId,
                                           @RequestBody ShopStatusUpdateRequestDto shopStatusUpdateRequestDto) {
        return shopService.updateShopStatus(shopId, shopStatusUpdateRequestDto);
    }

    @PatchMapping("/{shopId:[0-9a-fA-F-]{36}}/wallet")
    @ResponseStatus(HttpStatus.OK)
    public ShopResponseVo updateWallet(@PathVariable UUID shopId,
                                       @RequestBody ShopWalletUpdateRequestDto shopWalletUpdateRequestDto) {
        return shopService.updateWallet(shopId, shopWalletUpdateRequestDto);
    }

    @PatchMapping("/{shopId:[0-9a-fA-F-]{36}}/profile")
    @ResponseStatus(HttpStatus.OK)
    public ShopResponseVo updateProfile(@PathVariable UUID shopId,
                                        @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                        @RequestBody ShopProfileUpdateRequestDto shopProfileUpdateRequestDto) {
        return shopService.updateProfile(shopId, authorization, shopProfileUpdateRequestDto);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<ShopResponseVo> getShops() {
        return shopService.getShops();
    }

    @GetMapping("/{shopId:[0-9a-fA-F-]{36}}")
    @ResponseStatus(HttpStatus.OK)
    public ShopResponseVo getShop(@PathVariable UUID shopId) {
        return shopService.getShop(shopId);
    }
}
