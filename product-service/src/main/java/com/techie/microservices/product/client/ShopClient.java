package com.techie.microservices.product.client;

import com.techie.microservices.product.dto.ShopResponseDto;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.GetExchange;

public interface ShopClient {
    @GetExchange("/api/shops/me")
    ShopResponseDto getCurrentShop(@RequestHeader("Authorization") String authorization);
}
