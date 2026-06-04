package com.techie.microservices.shop.dto;

public record ShopProfileUpdateRequestDto(
        String shopName,
        String ownerName,
        String phone
) {
}
