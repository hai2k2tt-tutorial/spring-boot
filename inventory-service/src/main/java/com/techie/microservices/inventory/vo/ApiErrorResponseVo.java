package com.techie.microservices.inventory.vo;

import java.time.Instant;

public record ApiErrorResponseVo(
        Instant timestamp,
        int status,
        String error,
        String message,
        String detail,
        String path
) {
}
