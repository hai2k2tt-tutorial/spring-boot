package com.techie.microservices.customer.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techie.microservices.customer.dto.CustomerProfileUpdateRequestDto;
import com.techie.microservices.customer.dto.CustomerStatusUpdateRequestDto;
import com.techie.microservices.customer.mapper.CustomerMapper;
import com.techie.microservices.customer.model.CustomerAuth;
import com.techie.microservices.customer.model.CustomerProfile;
import com.techie.microservices.customer.repository.CustomerAuthRepository;
import com.techie.microservices.customer.repository.CustomerProfileRepository;
import com.techie.microservices.customer.vo.CustomerResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerService {
    private final CustomerAuthRepository customerAuthRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final CustomerMapper customerMapper;
    private final ObjectMapper objectMapper;

    @Transactional
    public CustomerResponseVo syncCurrentCustomer(String authorization) {
        TokenClaims claims = parseTokenClaims(authorization);
        UUID authId = parseAuthId(claims.subject());

        return customerProfileRepository.findByAuthId(authId)
                .or(() -> findCustomerByEmail(claims.email()))
                .map(this::mapCustomer)
                .orElseGet(() -> createCustomerFromClaims(authId, claims));
    }

    @Transactional(readOnly = true)
    public CustomerResponseVo getCurrentCustomer(String authorization) {
        TokenClaims claims = parseTokenClaims(authorization);
        CustomerProfile customerProfile = findCurrentCustomerProfile(claims)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        return mapCustomer(customerProfile);
    }

    private CustomerResponseVo createCustomerFromClaims(UUID authId, TokenClaims claims) {
        customerAuthRepository.findByEmail(claims.email()).ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Customer email already exists for another auth id");
        });

        CustomerAuth customerAuth = customerAuthRepository.save(customerMapper.toAuthEntity(authId, claims.email()));

        CustomerProfile customerProfile = customerMapper.toProfileEntity(customerAuth, claims.firstName(), claims.lastName());
        customerProfile = customerProfileRepository.save(customerProfile);

        log.info("Customer synced successfully");
        return customerMapper.toVo(customerAuth, customerProfile);
    }

    @Transactional
    public CustomerResponseVo updateCustomerStatus(UUID customerId, CustomerStatusUpdateRequestDto customerStatusUpdateRequestDto) {
        CustomerProfile customerProfile = customerProfileRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        CustomerAuth customerAuth = customerProfile.getAuth();
        customerAuth.setStatus(customerMapper.resolveStatus(customerStatusUpdateRequestDto.status()));
        customerAuth.setUpdatedAt(Instant.now());
        customerAuthRepository.save(customerAuth);
        return customerMapper.toVo(customerAuth, customerProfile);
    }

    @Transactional
    public CustomerResponseVo updateProfile(
            UUID customerId,
            String authorization,
            CustomerProfileUpdateRequestDto customerProfileUpdateRequestDto
    ) {
        UUID authId = parseAuthId(parseTokenClaims(authorization).subject());
        CustomerProfile customerProfile = customerProfileRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        CustomerAuth customerAuth = customerProfile.getAuth();
        if (!customerAuth.getId().equals(authId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot update another customer profile");
        }
        customerMapper.updateProfile(customerProfile, customerProfileUpdateRequestDto);
        customerProfile.setUpdatedAt(Instant.now());
        customerProfileRepository.save(customerProfile);
        return customerMapper.toVo(customerAuth, customerProfile);
    }

    @Transactional
    public CustomerResponseVo updateCurrentProfile(
            String authorization,
            CustomerProfileUpdateRequestDto customerProfileUpdateRequestDto
    ) {
        TokenClaims claims = parseTokenClaims(authorization);
        CustomerProfile customerProfile = findCurrentCustomerProfile(claims)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        CustomerAuth customerAuth = customerProfile.getAuth();
        customerMapper.updateProfile(customerProfile, customerProfileUpdateRequestDto);
        customerProfile.setUpdatedAt(Instant.now());
        customerProfileRepository.save(customerProfile);
        return customerMapper.toVo(customerAuth, customerProfile);
    }

    private java.util.Optional<CustomerProfile> findCurrentCustomerProfile(TokenClaims claims) {
        UUID authId = parseAuthId(claims.subject());
        return customerProfileRepository.findByAuthId(authId)
                .or(() -> findCustomerByEmail(claims.email()));
    }

    private java.util.Optional<CustomerProfile> findCustomerByEmail(String email) {
        return customerAuthRepository.findByEmail(email)
                .flatMap(customerAuth -> customerProfileRepository.findByAuthId(customerAuth.getId()));
    }

    @Transactional(readOnly = true)
    public List<CustomerResponseVo> getCustomers() {
        return customerProfileRepository.findAll().stream()
                .map(this::mapCustomer)
                .toList();
    }

    @Transactional(readOnly = true)
    public CustomerResponseVo getCustomer(UUID customerId, String authorization) {
        requireAdminOrCurrentCustomer(customerId, authorization);
        CustomerProfile customerProfile = customerProfileRepository.findById(customerId)
                .or(() -> customerProfileRepository.findByAuthId(customerId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        return mapCustomer(customerProfile);
    }

    private void requireAdminOrCurrentCustomer(UUID customerId, String authorization) {
        TokenClaims claims = parseTokenClaims(authorization);
        if (claims.roles().contains("admin")) {
            return;
        }

        CustomerProfile currentCustomer = findCurrentCustomerProfile(claims)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        if (!currentCustomer.getId().equals(customerId) && !currentCustomer.getAuth().getId().equals(customerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot access another customer");
        }
    }

    private CustomerResponseVo mapCustomer(CustomerProfile customerProfile) {
        CustomerAuth customerAuth = customerProfile.getAuth();
        return customerMapper.toVo(customerAuth, customerProfile);
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
            String subject = requiredClaim(claims, "sub", "user_id");
            String email = requiredClaim(claims, "email");
            String preferredName = stringClaim(claims, "preferred_username");
            String firstName = stringClaim(claims, "given_name");
            String lastName = stringClaim(claims, "family_name");
            List<String> roles = tokenRoles(claims);

            if (firstName == null || firstName.isBlank()) {
                firstName = preferredName != null && !preferredName.isBlank() ? preferredName : emailName(email);
            }
            if (lastName == null || lastName.isBlank()) {
                lastName = "-";
            }

            return new TokenClaims(subject, email, firstName, lastName, roles);
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

    private String emailName(String email) {
        int atIndex = email.indexOf('@');
        return atIndex > 0 ? email.substring(0, atIndex) : email;
    }

    private List<String> tokenRoles(Map<String, Object> claims) {
        List<String> roles = new ArrayList<>();
        Object realmAccess = claims.get("realm_access");
        if (realmAccess instanceof Map<?, ?> realmAccessClaims) {
            Object tokenRoles = realmAccessClaims.get("roles");
            if (tokenRoles instanceof List<?> roleList) {
                roleList.stream()
                        .filter(String.class::isInstance)
                        .map(String.class::cast)
                        .forEach(roles::add);
            }
        }
        return roles;
    }

    private record TokenClaims(String subject, String email, String firstName, String lastName, List<String> roles) {
    }
}
