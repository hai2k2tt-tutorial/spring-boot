package com.techie.microservices.gateway.security;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class JwtBlackListService {
    private static final String KEY_PREFIX = "jwt:blacklist:";

    private final StringRedisTemplate redisTemplate;

    public JwtBlackListService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void blacklist(Jwt jwt) {
        Instant expiresAt = jwt.getExpiresAt();
        if (expiresAt == null || !expiresAt.isAfter(Instant.now())) {
            return;
        }

        redisTemplate.opsForValue().set(key(jwt), "revoked", Duration.between(Instant.now(), expiresAt));
    }

    public boolean isBlacklisted(Jwt jwt) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(key(jwt)));
    }

    private String key(Jwt jwt) {
        return KEY_PREFIX + issuer(jwt) + ":" + tokenId(jwt);
    }

    private String issuer(Jwt jwt) {
        return jwt.getIssuer() == null ? "unknown" : jwt.getIssuer().toString();
    }

    private String tokenId(Jwt jwt) {
        String jti = jwt.getId();

        return jti == null || jti.isBlank() ? sha256(jwt.getTokenValue()) : jti;
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
