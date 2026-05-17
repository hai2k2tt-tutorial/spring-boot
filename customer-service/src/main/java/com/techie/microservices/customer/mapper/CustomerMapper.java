package com.techie.microservices.customer.mapper;

import com.techie.microservices.customer.dto.CustomerCreateRequestDto;
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

@Component
public class CustomerMapper {

    public CustomerAuth toAuthEntity(CustomerCreateRequestDto customerCreateRequestDto) {
        return CustomerAuth.builder()
                .email(customerCreateRequestDto.email())
                .passwordHash(customerCreateRequestDto.passwordHash())
                .status(resolveStatus(customerCreateRequestDto.status()))
                .build();
    }

    public CustomerProfile toProfileEntity(CustomerCreateRequestDto customerCreateRequestDto, CustomerAuth customerAuth) {
        return CustomerProfile.builder()
                .auth(customerAuth)
                .firstName(customerCreateRequestDto.firstName())
                .lastName(customerCreateRequestDto.lastName())
                .phone(customerCreateRequestDto.phone())
                .build();
    }

    public CustomerWallet toWalletEntity(CustomerCreateRequestDto customerCreateRequestDto, CustomerProfile customerProfile) {
        return CustomerWallet.builder()
                .customer(customerProfile)
                .balance(customerCreateRequestDto.initialBalance() != null ? customerCreateRequestDto.initialBalance() : BigDecimal.ZERO)
                .currency(customerCreateRequestDto.currency())
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
}
