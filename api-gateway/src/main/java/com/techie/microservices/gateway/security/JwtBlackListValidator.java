package com.techie.microservices.gateway.security;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class JwtBlackListValidator implements OAuth2TokenValidator<Jwt> {

    private final JwtBlackListService jwtBlackListService;

    public JwtBlackListValidator(JwtBlackListService jwtBlackListService) {
        this.jwtBlackListService = jwtBlackListService;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        if (!jwtBlackListService.isBlacklisted(jwt)) {
            return OAuth2TokenValidatorResult.success();
        }

        OAuth2Error error = new OAuth2Error("invalid_token", "JWT revoked", null);
        return OAuth2TokenValidatorResult.failure(error);
    }
}
