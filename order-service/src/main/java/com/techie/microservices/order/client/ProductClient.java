package com.techie.microservices.order.client;

import com.techie.microservices.order.dto.ProductResponseDto;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.GetExchange;

public interface ProductClient {

    @GetExchange("/api/product/{productId}")
    ProductResponseDto getProduct(@PathVariable String productId, @RequestHeader("Authorization") String authorization);
}
