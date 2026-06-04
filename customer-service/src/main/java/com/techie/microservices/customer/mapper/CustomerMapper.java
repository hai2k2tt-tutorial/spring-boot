package com.techie.microservices.customer.mapper;

import com.techie.microservices.customer.dto.CustomerProfileUpdateRequestDto;
import com.techie.microservices.customer.dto.CustomerWalletUpdateRequestDto;
import com.techie.microservices.customer.model.CustomerAuth;
import com.techie.microservices.customer.model.CustomerProfile;
import com.techie.microservices.customer.model.CustomerStatus;
import com.techie.microservices.customer.model.CustomerWallet;
import com.techie.microservices.customer.vo.CustomerResponseVo;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.UUID;

@Component
public class CustomerMapper {

    public CustomerAuth toAuthEntity(UUID authId, String email) {
        return CustomerAuth.builder()
                .id(authId)
                .email(email)
                .status(CustomerStatus.ACTIVE)
                .build();
    }

    public CustomerProfile toProfileEntity(CustomerAuth customerAuth, String firstName, String lastName) {
        return CustomerProfile.builder()
                .auth(customerAuth)
                .firstName(firstName)
                .lastName(lastName)
                .build();
    }

    public CustomerWallet toWalletEntity(CustomerProfile customerProfile) {
        return CustomerWallet.builder()
                .customer(customerProfile)
                .balance(BigDecimal.ZERO)
                .currency("USD")
                .build();
    }

    public CustomerResponseVo toVo(CustomerAuth customerAuth, CustomerProfile customerProfile, CustomerWallet customerWallet) {
        return new CustomerResponseVo(
                customerAuth.getId(),
                customerAuth.getEmail(),
                customerAuth.getStatus().name(),
                customerProfile.getId(),
                customerProfile.getFirstName(),
                customerProfile.getLastName(),
                customerProfile.getPhone(),
                customerWallet.getBalance(),
                customerWallet.getCurrency(),
                customerAuth.getCreatedAt(),
                customerAuth.getUpdatedAt(),
                customerProfile.getCreatedAt(),
                customerProfile.getUpdatedAt(),
                customerWallet.getUpdatedAt()
        );
    }

    public CustomerStatus resolveStatus(String status) {
        if (status == null || status.isBlank()) {
            return CustomerStatus.ACTIVE;
        }
        try {
            return CustomerStatus.valueOf(status.trim().toUpperCase());
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid customer status");
        }
    }

    public void updateWallet(CustomerWallet customerWallet, CustomerWalletUpdateRequestDto customerWalletUpdateRequestDto) {
        if (customerWalletUpdateRequestDto.balance() != null) {
            customerWallet.setBalance(customerWalletUpdateRequestDto.balance());
        }
        if (customerWalletUpdateRequestDto.currency() != null && !customerWalletUpdateRequestDto.currency().isBlank()) {
            customerWallet.setCurrency(customerWalletUpdateRequestDto.currency());
        }
    }

    public void updateProfile(CustomerProfile customerProfile, CustomerProfileUpdateRequestDto customerProfileUpdateRequestDto) {
        if (customerProfileUpdateRequestDto.firstName() != null && !customerProfileUpdateRequestDto.firstName().isBlank()) {
            customerProfile.setFirstName(customerProfileUpdateRequestDto.firstName().trim());
        }
        if (customerProfileUpdateRequestDto.lastName() != null && !customerProfileUpdateRequestDto.lastName().isBlank()) {
            customerProfile.setLastName(customerProfileUpdateRequestDto.lastName().trim());
        }
        customerProfile.setPhone(normalizeOptional(customerProfileUpdateRequestDto.phone()));
    }

    private String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
