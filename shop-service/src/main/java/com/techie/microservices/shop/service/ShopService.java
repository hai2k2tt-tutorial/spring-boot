package com.techie.microservices.shop.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techie.microservices.shop.dto.ShopStatusUpdateRequestDto;
import com.techie.microservices.shop.dto.ShopWalletUpdateRequestDto;
import com.techie.microservices.shop.mapper.ShopMapper;
import com.techie.microservices.shop.model.ShopAuth;
import com.techie.microservices.shop.model.ShopProfile;
import com.techie.microservices.shop.model.ShopWallet;
import com.techie.microservices.shop.repository.ShopAuthRepository;
import com.techie.microservices.shop.repository.ShopProfileRepository;
import com.techie.microservices.shop.repository.ShopWalletRepository;
import com.techie.microservices.shop.vo.ShopResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopService {
    private final ShopAuthRepository shopAuthRepository;
    private final ShopProfileRepository shopProfileRepository;
    private final ShopWalletRepository shopWalletRepository;
    private final ShopMapper shopMapper;
    private final ObjectMapper objectMapper;

    @Transactional
    public ShopResponseVo syncCurrentShop(String authorization) {
        TokenClaims claims = parseTokenClaims(authorization);
        UUID authId = parseAuthId(claims.subject());

        return shopProfileRepository.findByAuthId(authId)
                .map(this::mapShop)
                .orElseGet(() -> createShopFromClaims(authId, claims));
    }

    private ShopResponseVo createShopFromClaims(UUID authId, TokenClaims claims) {
        shopAuthRepository.findByEmail(claims.email()).ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Shop email already exists for another auth id");
        });

        ShopAuth shopAuth = shopMapper.toAuthEntity(authId, claims.email());
        shopAuthRepository.save(shopAuth);

        ShopProfile shopProfile = shopMapper.toProfileEntity(shopAuth, claims.shopName(), claims.ownerName());
        shopProfileRepository.save(shopProfile);

        ShopWallet shopWallet = shopMapper.toWalletEntity(shopProfile);
        shopWalletRepository.save(shopWallet);

        log.info("Shop synced successfully");
        return shopMapper.toVo(shopAuth, shopProfile, shopWallet);
    }

    @Transactional
    public ShopResponseVo updateShopStatus(UUID shopId, ShopStatusUpdateRequestDto shopStatusUpdateRequestDto) {
        ShopProfile shopProfile = shopProfileRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));
        ShopAuth shopAuth = shopProfile.getAuth();
        shopAuth.setStatus(shopMapper.resolveStatus(shopStatusUpdateRequestDto.status()));
        shopAuth.setUpdatedAt(Instant.now());
        shopAuthRepository.save(shopAuth);
        ShopWallet shopWallet = shopWalletRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop wallet not found"));
        return shopMapper.toVo(shopAuth, shopProfile, shopWallet);
    }

    @Transactional
    public ShopResponseVo updateWallet(UUID shopId, ShopWalletUpdateRequestDto shopWalletUpdateRequestDto) {
        ShopProfile shopProfile = shopProfileRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));
        ShopAuth shopAuth = shopProfile.getAuth();
        ShopWallet shopWallet = shopWalletRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop wallet not found"));
        shopMapper.updateWallet(shopWallet, shopWalletUpdateRequestDto);
        shopWallet.setUpdatedAt(Instant.now());
        shopWalletRepository.save(shopWallet);
        return shopMapper.toVo(shopAuth, shopProfile, shopWallet);
    }

    @Transactional(readOnly = true)
    public List<ShopResponseVo> getShops() {
        return shopProfileRepository.findAll().stream()
                .map(this::mapShop)
                .toList();
    }

    @Transactional(readOnly = true)
    public ShopResponseVo getShop(UUID shopId) {
        ShopProfile shopProfile = shopProfileRepository.findById(shopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop not found"));
        return mapShop(shopProfile);
    }

    private ShopResponseVo mapShop(ShopProfile shopProfile) {
        ShopAuth shopAuth = shopProfile.getAuth();
        ShopWallet shopWallet = shopWalletRepository.findById(shopProfile.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Shop wallet not found"));
        return shopMapper.toVo(shopAuth, shopProfile, shopWallet);
    }

    private TokenClaims parseTokenClaims(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing bearer token");
        }

        String token = authorization.substring(7);
        String[] tokenParts = token.split("\\.");
        if (tokenParts.length < 2) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bearer token");
        }

        try {
            byte[] payload = Base64.getUrlDecoder().decode(tokenParts[1]);
            Map<String, Object> claims = objectMapper.readValue(
                    new String(payload, StandardCharsets.UTF_8),
                    new TypeReference<>() {
                    }
            );
            String subject = requiredClaim(claims, "sub");
            String email = requiredClaim(claims, "email");
            String preferredName = stringClaim(claims, "preferred_username");
            String fullName = stringClaim(claims, "name");
            String givenName = stringClaim(claims, "given_name");
            String familyName = stringClaim(claims, "family_name");
            String fallbackName = preferredName != null && !preferredName.isBlank() ? preferredName : emailName(email);
            String ownerName = fullName != null && !fullName.isBlank()
                    ? fullName
                    : joinName(givenName, familyName, fallbackName);

            return new TokenClaims(subject, email, fallbackName, ownerName);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bearer token");
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read token claims");
        }
    }

    private UUID parseAuthId(String subject) {
        try {
            return UUID.fromString(subject);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token subject must be a UUID");
        }
    }

    private String requiredClaim(Map<String, Object> claims, String name) {
        String value = stringClaim(claims, name);
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing token claim: " + name);
        }
        return value;
    }

    private String stringClaim(Map<String, Object> claims, String name) {
        Object value = claims.get(name);
        return value instanceof String stringValue ? stringValue.trim() : null;
    }

    private String joinName(String givenName, String familyName, String fallbackName) {
        String joined = ((givenName != null ? givenName : "") + " " + (familyName != null ? familyName : "")).trim();
        return joined.isBlank() ? fallbackName : joined;
    }

    private String emailName(String email) {
        int atIndex = email.indexOf('@');
        return atIndex > 0 ? email.substring(0, atIndex) : email;
    }

    private record TokenClaims(String subject, String email, String shopName, String ownerName) {
    }
}
