package com.techie.microservices.customer.dto;

import java.math.BigDecimal;

public record CustomerCreateRequestDto(
        String email,
        String passwordHash,
        String status,
        String firstName,
        String lastName,
        String phone,
        BigDecimal initialBalance,
        String currency
) {
}
