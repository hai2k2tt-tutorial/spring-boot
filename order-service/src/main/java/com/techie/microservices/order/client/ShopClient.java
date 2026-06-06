package com.techie.microservices.order.client;

import com.techie.microservices.order.dto.ShopResponseDto;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.GetExchange;

public interface ShopClient {
    @GetExchange("/api/shops/me")
    ShopResponseDto getCurrentShop(@RequestHeader("Authorization") String authorization);
}
