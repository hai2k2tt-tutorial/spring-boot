package com.techie.microservices.product.vo;

public record ProductImagePresignResponseVo(
        String objectName,
        String uploadUrl,
        String imageUrl,
        String contentType,
        long maxSize,
        int expiresInSeconds
) {
}
