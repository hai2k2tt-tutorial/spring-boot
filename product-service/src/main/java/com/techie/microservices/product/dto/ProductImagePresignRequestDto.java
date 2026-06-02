package com.techie.microservices.product.dto;

public record ProductImagePresignRequestDto(
        String fileName,
        String contentType,
        long size
) {
}
