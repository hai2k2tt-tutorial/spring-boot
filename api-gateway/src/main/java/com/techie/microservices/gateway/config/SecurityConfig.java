package com.techie.microservices.gateway.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManagerResolver;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtIssuerAuthenticationManagerResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

@Configuration
public class SecurityConfig {

    private final String[] freeResourceUrls = {"/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**",
            "/swagger-resources/**", "/api-docs/**", "/aggregate/**", "/actuator/prometheus"};

    @Value("${app.security.customer-issuer-uri}")
    private String customerIssuerUri;

    @Value("${app.security.shop-issuer-uri}")
    private String shopIssuerUri;

    @Value("${app.security.admin-issuer-uri}")
    private String adminIssuerUri;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity) throws Exception {
        return httpSecurity.authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(freeResourceUrls)
                        .permitAll()
                        .requestMatchers("/api/**")
                        .permitAll()
                        .anyRequest().authenticated())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .oauth2ResourceServer(oauth2 -> oauth2.authenticationManagerResolver(authenticationManagerResolver()))
                .build();
    }

    private AuthenticationManagerResolver<HttpServletRequest> authenticationManagerResolver() {
        return JwtIssuerAuthenticationManagerResolver.fromTrustedIssuers(customerIssuerUri, shopIssuerUri, adminIssuerUri);
    }

    private AuthorizationManager<RequestAuthorizationContext> hasIssuerOrAdmin(String expectedIssuer) {
        return (Supplier<Authentication> authentication, RequestAuthorizationContext context) -> {
            JwtAuthenticationToken jwtAuthenticationToken = getJwtAuthenticationToken(authentication.get());

            if (jwtAuthenticationToken == null) {
                return new AuthorizationDecision(false);
            }

            boolean isExpectedIssuer = hasAnyIssuer(jwtAuthenticationToken, expectedIssuer);
            boolean isAdmin = hasAnyIssuer(jwtAuthenticationToken, adminIssuerUri)
                    && hasRealmRole(jwtAuthenticationToken, "admin");

            return new AuthorizationDecision(isExpectedIssuer || isAdmin);
        };
    }

    private AuthorizationManager<RequestAuthorizationContext> hasAdminIssuerAndRole() {
        return (Supplier<Authentication> authentication, RequestAuthorizationContext context) -> {
            JwtAuthenticationToken jwtAuthenticationToken = getJwtAuthenticationToken(authentication.get());

            return new AuthorizationDecision(jwtAuthenticationToken != null
                    && hasAnyIssuer(jwtAuthenticationToken, adminIssuerUri)
                    && hasRealmRole(jwtAuthenticationToken, "admin"));
        };
    }

    private JwtAuthenticationToken getJwtAuthenticationToken(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthenticationToken)
                || !authentication.isAuthenticated()
                || jwtAuthenticationToken.getToken().getIssuer() == null) {
            return null;
        }

        return jwtAuthenticationToken;
    }

    private boolean hasAnyIssuer(JwtAuthenticationToken jwtAuthenticationToken, String... expectedIssuers) {
        String tokenIssuer = jwtAuthenticationToken.getToken().getIssuer().toString();

        for (String expectedIssuer : expectedIssuers) {
            if (expectedIssuer.equals(tokenIssuer)) {
                return true;
            }
        }

        return false;
    }

    private boolean hasRealmRole(JwtAuthenticationToken jwtAuthenticationToken, String expectedRole) {
        Map<String, Object> realmAccess = jwtAuthenticationToken.getToken().getClaimAsMap("realm_access");

        if (realmAccess == null || !(realmAccess.get("roles") instanceof Collection<?> roles)) {
            return false;
        }

        return roles.contains(expectedRole);
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.applyPermitDefaultValues();
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
