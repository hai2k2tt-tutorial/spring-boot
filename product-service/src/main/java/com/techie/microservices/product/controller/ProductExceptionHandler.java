package com.techie.microservices.product.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techie.microservices.product.vo.ApiErrorResponseVo;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
@RequiredArgsConstructor
public class ProductExceptionHandler {

    private final ObjectMapper objectMapper;

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponseVo> handleResponseStatusException(
            ResponseStatusException exception,
            HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        String message = exception.getReason() != null ? exception.getReason() : status.getReasonPhrase();
        return error(status, message, request.getRequestURI());
    }

    @ExceptionHandler(RestClientResponseException.class)
    public ResponseEntity<ApiErrorResponseVo> handleRestClientResponseException(
            RestClientResponseException exception,
            HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        String message = extractUpstreamMessage(exception.getResponseBodyAsString());
        return error(status, message != null ? message : status.getReasonPhrase(), request.getRequestURI());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponseVo> handleHttpMessageNotReadableException(HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, "Invalid request body", request.getRequestURI());
    }

    @ExceptionHandler({MissingRequestHeaderException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiErrorResponseVo> handleBadRequest(Exception exception, HttpServletRequest request) {
        return error(HttpStatus.BAD_REQUEST, exception.getMessage(), request.getRequestURI());
    }

    private ResponseEntity<ApiErrorResponseVo> error(HttpStatus status, String message, String path) {
        return ResponseEntity.status(status).body(new ApiErrorResponseVo(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                message,
                message,
                path
        ));
    }

    private String extractUpstreamMessage(String body) {
        if (body == null || body.isBlank()) {
            return null;
        }
        try {
            Map<String, Object> response = objectMapper.readValue(body, new TypeReference<>() {
            });
            for (String key : new String[]{"message", "detail", "reason", "error", "title"}) {
                Object value = response.get(key);
                if (value instanceof String stringValue && !stringValue.isBlank()) {
                    return stringValue;
                }
            }
        } catch (Exception ignored) {
            return body;
        }
        return null;
    }
}
