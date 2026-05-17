package com.techie.microservices.customer.service;

import com.techie.microservices.customer.dto.CustomerCreateRequestDto;
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

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerService {
    private final CustomerAuthRepository customerAuthRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final CustomerWalletRepository customerWalletRepository;
    private final CustomerMapper customerMapper;

    @Transactional
    public CustomerResponseVo createCustomer(CustomerCreateRequestDto customerCreateRequestDto) {
        if (customerAuthRepository.findByEmail(customerCreateRequestDto.email()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Customer email already exists");
        }

        CustomerAuth customerAuth = customerMapper.toAuthEntity(customerCreateRequestDto);
        customerAuthRepository.save(customerAuth);

        CustomerProfile customerProfile = customerMapper.toProfileEntity(customerCreateRequestDto, customerAuth);
        customerProfileRepository.save(customerProfile);

        CustomerWallet customerWallet = customerMapper.toWalletEntity(customerCreateRequestDto, customerProfile);
        customerWalletRepository.save(customerWallet);

        log.info("Customer created successfully");
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
}
