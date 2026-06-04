package com.techie.microservices.wallet.client;

import com.techie.microservices.wallet.dto.CustomerResponseDto;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.GetExchange;

public interface CustomerClient {
    @GetExchange("/api/customers/me")
    CustomerResponseDto getCurrentCustomer(@RequestHeader("Authorization") String authorization);
}
