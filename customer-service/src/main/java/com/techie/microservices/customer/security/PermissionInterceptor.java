package com.techie.microservices.customer.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class PermissionInterceptor implements HandlerInterceptor {
    private final PermissionRegistry permissionRegistry;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }

        RequirePermission permission = resolvePermission(handlerMethod);
        if (permission == null) {
            return true;
        }

        PermissionRegistry.PermissionRule rule = permissionRegistry.require(permission.value());
        List<String> tokenAuthorities = tokenAuthorities(request.getHeader(HttpHeaders.AUTHORIZATION));
        boolean authorized = rule.authorities().stream().anyMatch(tokenAuthorities::contains);
        if (!authorized) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Missing permission: " + permission.value().key());
        }
        return true;
    }

    private RequirePermission resolvePermission(HandlerMethod handlerMethod) {
        RequirePermission methodPermission = handlerMethod.getMethodAnnotation(RequirePermission.class);
        if (methodPermission != null) {
            return methodPermission;
        }
        return handlerMethod.getBeanType().getAnnotation(RequirePermission.class);
    }

    private List<String> tokenAuthorities(String authorization) {
        Map<String, Object> claims = parseClaims(authorization);
        List<String> authorities = new ArrayList<>();
        Object realmAccess = claims.get("realm_access");
        if (realmAccess instanceof Map<?, ?> realmAccessClaims) {
            Object roles = realmAccessClaims.get("roles");
            if (roles instanceof List<?> roleList) {
                roleList.stream()
                        .filter(String.class::isInstance)
                        .map(String.class::cast)
                        .forEach(authorities::add);
            }
        }
        return authorities;
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
            return objectMapper.readValue(new String(payload, StandardCharsets.UTF_8), new TypeReference<>() {
            });
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid bearer token");
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to read token claims");
        }
    }
}
