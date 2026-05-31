package com.techie.microservices.order.util;

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

    public CurrentCustomer currentCustomer(String authorization) {
        Map<String, Object> claims = parseClaims(authorization);
        String email = requiredClaim(claims, "email");
        String preferredName = stringClaim(claims, "preferred_username");
        String firstName = stringClaim(claims, "given_name");
        String lastName = stringClaim(claims, "family_name");

        if (firstName == null || firstName.isBlank()) {
            firstName = preferredName != null && !preferredName.isBlank() ? preferredName : emailName(email);
        }
        if (lastName == null || lastName.isBlank()) {
            lastName = "-";
        }

        return new CurrentCustomer(parseUuid(requiredClaim(claims, "sub", "user_id")), email, firstName, lastName);
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
            String value = stringClaim(claims, name);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing token claim: " + String.join(" or ", names));
    }

    private String stringClaim(Map<String, Object> claims, String name) {
        Object value = claims.get(name);
        return value instanceof String stringValue ? stringValue.trim() : null;
    }

    private UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token user id must be a UUID");
        }
    }

    private String emailName(String email) {
        int atIndex = email.indexOf('@');
        return atIndex > 0 ? email.substring(0, atIndex) : email;
    }

    public record CurrentCustomer(UUID id, String email, String firstName, String lastName) {
    }
}
