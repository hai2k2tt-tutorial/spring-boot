package com.techie.microservices.customer.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techie.microservices.customer.dto.CustomerStatusUpdateRequestDto;
import com.techie.microservices.customer.dto.CustomerWalletUpdateRequestDto;
import com.techie.microservices.customer.mapper.CustomerMapper;
import com.techie.microservices.customer.model.CustomerAuth;
import com.techie.microservices.customer.model.CustomerProfile;
import com.techie.microservices.customer.model.CustomerWallet;
import com.techie.microservices.customer.repository.CustomerAuthRepository;
import com.techie.microservices.customer.repository.CustomerProfileRepository;
import com.techie.microservices.customer.repository.CustomerWalletRepository;
import com.techie.microservices.customer.vo.CustomerResponseVo;
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
public class CustomerService {
    private final CustomerAuthRepository customerAuthRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final CustomerWalletRepository customerWalletRepository;
    private final CustomerMapper customerMapper;
    private final ObjectMapper objectMapper;

    @Transactional
    public CustomerResponseVo syncCurrentCustomer(String authorization) {
        TokenClaims claims = parseTokenClaims(authorization);
        UUID authId = parseAuthId(claims.subject());

        return customerProfileRepository.findByAuthId(authId)
                .map(this::mapCustomer)
                .orElseGet(() -> createCustomerFromClaims(authId, claims));
    }

    private CustomerResponseVo createCustomerFromClaims(UUID authId, TokenClaims claims) {
        customerAuthRepository.findByEmail(claims.email()).ifPresent(existing -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Customer email already exists for another auth id");
        });

        CustomerAuth customerAuth = customerMapper.toAuthEntity(authId, claims.email());
        customerAuthRepository.save(customerAuth);

        CustomerProfile customerProfile = customerMapper.toProfileEntity(customerAuth, claims.firstName(), claims.lastName());
        customerProfileRepository.save(customerProfile);

        CustomerWallet customerWallet = customerMapper.toWalletEntity(customerProfile);
        customerWalletRepository.save(customerWallet);

        log.info("Customer synced successfully");
        return customerMapper.toVo(customerAuth, customerProfile, customerWallet);
    }

    @Transactional
    public CustomerResponseVo updateCustomerStatus(UUID customerId, CustomerStatusUpdateRequestDto customerStatusUpdateRequestDto) {
        CustomerProfile customerProfile = customerProfileRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        CustomerAuth customerAuth = customerProfile.getAuth();
        customerAuth.setStatus(customerMapper.resolveStatus(customerStatusUpdateRequestDto.status()));
        customerAuth.setUpdatedAt(Instant.now());
        customerAuthRepository.save(customerAuth);
        CustomerWallet customerWallet = customerWalletRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer wallet not found"));
        return customerMapper.toVo(customerAuth, customerProfile, customerWallet);
    }

    @Transactional
    public CustomerResponseVo updateWallet(UUID customerId, CustomerWalletUpdateRequestDto customerWalletUpdateRequestDto) {
        CustomerProfile customerProfile = customerProfileRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        CustomerAuth customerAuth = customerProfile.getAuth();
        CustomerWallet customerWallet = customerWalletRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer wallet not found"));
        customerMapper.updateWallet(customerWallet, customerWalletUpdateRequestDto);
        customerWallet.setUpdatedAt(Instant.now());
        customerWalletRepository.save(customerWallet);
        return customerMapper.toVo(customerAuth, customerProfile, customerWallet);
    }

    @Transactional(readOnly = true)
    public List<CustomerResponseVo> getCustomers() {
        return customerProfileRepository.findAll().stream()
                .map(this::mapCustomer)
                .toList();
    }

    @Transactional(readOnly = true)
    public CustomerResponseVo getCustomer(UUID customerId) {
        CustomerProfile customerProfile = customerProfileRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        return mapCustomer(customerProfile);
    }

    private CustomerResponseVo mapCustomer(CustomerProfile customerProfile) {
        CustomerAuth customerAuth = customerProfile.getAuth();
        CustomerWallet customerWallet = customerWalletRepository.findById(customerProfile.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer wallet not found"));
        return customerMapper.toVo(customerAuth, customerProfile, customerWallet);
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
            String firstName = stringClaim(claims, "given_name");
            String lastName = stringClaim(claims, "family_name");

            if (firstName == null || firstName.isBlank()) {
                firstName = preferredName != null && !preferredName.isBlank() ? preferredName : emailName(email);
            }
            if (lastName == null || lastName.isBlank()) {
                lastName = "-";
            }

            return new TokenClaims(subject, email, firstName, lastName);
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

    private String emailName(String email) {
        int atIndex = email.indexOf('@');
        return atIndex > 0 ? email.substring(0, atIndex) : email;
    }

    private record TokenClaims(String subject, String email, String firstName, String lastName) {
    }
}
