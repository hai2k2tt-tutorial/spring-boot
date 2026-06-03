package com.techie.microservices.order.vo;

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
