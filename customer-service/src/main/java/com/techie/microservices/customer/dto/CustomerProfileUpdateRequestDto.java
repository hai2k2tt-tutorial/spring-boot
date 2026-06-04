package com.techie.microservices.customer.dto;

public record CustomerProfileUpdateRequestDto(
        String firstName,
        String lastName,
        String phone
) {
}
