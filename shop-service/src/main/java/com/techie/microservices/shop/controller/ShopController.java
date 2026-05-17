package com.techie.microservices.shop.controller;

import com.techie.microservices.shop.dto.ShopCreateRequestDto;
import com.techie.microservices.shop.dto.ShopStatusUpdateRequestDto;
import com.techie.microservices.shop.dto.ShopWalletUpdateRequestDto;
import com.techie.microservices.shop.service.ShopService;
import com.techie.microservices.shop.vo.ShopResponseVo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/shops")
@RequiredArgsConstructor
public class ShopController {

    private final ShopService shopService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShopResponseVo createShop(@RequestBody ShopCreateRequestDto shopCreateRequestDto) {
        return shopService.createShop(shopCreateRequestDto);
    }

    @PatchMapping("/{shopId}/status")
    @ResponseStatus(HttpStatus.OK)
    public ShopResponseVo updateShopStatus(@PathVariable UUID shopId,
                                           @RequestBody ShopStatusUpdateRequestDto shopStatusUpdateRequestDto) {
        return shopService.updateShopStatus(shopId, shopStatusUpdateRequestDto);
    }

    @PatchMapping("/{shopId}/wallet")
    @ResponseStatus(HttpStatus.OK)
    public ShopResponseVo updateWallet(@PathVariable UUID shopId,
                                       @RequestBody ShopWalletUpdateRequestDto shopWalletUpdateRequestDto) {
        return shopService.updateWallet(shopId, shopWalletUpdateRequestDto);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<ShopResponseVo> getShops() {
        return shopService.getShops();
    }

    @GetMapping("/{shopId}")
    @ResponseStatus(HttpStatus.OK)
    public ShopResponseVo getShop(@PathVariable UUID shopId) {
        return shopService.getShop(shopId);
    }
}
