package com.techie.microservices.payment.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Component
public class TokenIdentity {
    private final ObjectMapper objectMapper;

    public TokenIdentity(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public UUID currentUserId(String authorization) {
        Map<String, Object> claims = parseClaims(authorization);
        return parseUuid(requiredClaim(claims, "sub", "user_id"));
    }

    private Map<String, Object> parseClaims(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing bearer token");
        }

        String[] tokenParts = authorization.substring(7).split("\\.");
        if (tokenParts.length < 2) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bearer token");
        }

        try {
            byte[] payload = Base64.getUrlDecoder().decode(tokenParts[1]);
            return objectMapper.readValue(new String(payload, StandardCharsets.UTF_8), new TypeReference<>() {});
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bearer token");
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read token claims");
        }
    }

    private String requiredClaim(Map<String, Object> claims, String... names) {
        for (String name : names) {
            Object value = claims.get(name);
            if (value instanceof String stringValue && !stringValue.isBlank()) {
                return stringValue.trim();
            }
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing token claim: " + String.join(" or ", names));
    }

    private UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token user id must be a UUID");
        }
    }
}
