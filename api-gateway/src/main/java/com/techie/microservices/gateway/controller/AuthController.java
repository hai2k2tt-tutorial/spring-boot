package com.techie.microservices.gateway.controller;

import com.techie.microservices.gateway.security.JwtBlackListService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final JwtBlackListService jwtBlackListService;

    public AuthController(JwtBlackListService jwtBlackListService) {
        this.jwtBlackListService = jwtBlackListService;
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken jwtAuthenticationToken) {
            jwtBlackListService.blacklist(jwtAuthenticationToken.getToken());
        }
    }
}
