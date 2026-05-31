package com.techie.microservices.order.client;

import com.techie.microservices.order.dto.InventoryCheckResponseDto;
import com.techie.microservices.order.dto.SkuResponseDto;
import groovy.util.logging.Slf4j;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.GetExchange;

@Slf4j
public interface InventoryClient {

    Logger log = LoggerFactory.getLogger(InventoryClient.class);

    @GetExchange("/api/inventory/stock-check")
    @CircuitBreaker(name = "inventory", fallbackMethod = "fallbackMethod")
    @Retry(name = "inventory")
    InventoryCheckResponseDto isInStock(@RequestParam String skuCode,
                                        @RequestParam Integer quantity,
                                        @RequestHeader("Authorization") String authorization);

    @GetExchange("/api/inventory/skus/{skuCode}")
    SkuResponseDto getSku(@PathVariable String skuCode, @RequestHeader("Authorization") String authorization);

    default InventoryCheckResponseDto fallbackMethod(String code, Integer quantity, String authorization, Throwable throwable) {
        log.info("Cannot get inventory for skucode {}, failure reason: {}", code, throwable.getMessage());
        return new InventoryCheckResponseDto(code, quantity, false);
    }
}
