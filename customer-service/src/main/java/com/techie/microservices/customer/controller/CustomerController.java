package com.techie.microservices.customer.controller;

import com.techie.microservices.customer.dto.CustomerProfileUpdateRequestDto;
import com.techie.microservices.customer.dto.CustomerStatusUpdateRequestDto;
import com.techie.microservices.customer.security.Permission;
import com.techie.microservices.customer.security.RequirePermission;
import com.techie.microservices.customer.service.CustomerService;
import com.techie.microservices.customer.vo.CustomerResponseVo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping("/me/sync")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.CUSTOMER_CUSTOMER)
    public CustomerResponseVo syncCurrentCustomer(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return customerService.syncCurrentCustomer(authorization);
    }

    @GetMapping("/me")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.CUSTOMER_CUSTOMER)
    public CustomerResponseVo getCurrentCustomer(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return customerService.getCurrentCustomer(authorization);
    }

    @PatchMapping("/me/profile")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.CUSTOMER_CUSTOMER)
    public CustomerResponseVo updateCurrentProfile(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestBody CustomerProfileUpdateRequestDto customerProfileUpdateRequestDto
    ) {
        return customerService.updateCurrentProfile(authorization, customerProfileUpdateRequestDto);
    }

    @PatchMapping("/{customerId:[0-9a-fA-F-]{36}}/status")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.CUSTOMER_ADMIN)
    public CustomerResponseVo updateCustomerStatus(@PathVariable UUID customerId,
                                                   @RequestBody CustomerStatusUpdateRequestDto customerStatusUpdateRequestDto) {
        return customerService.updateCustomerStatus(customerId, customerStatusUpdateRequestDto);
    }

    @PatchMapping("/{customerId:[0-9a-fA-F-]{36}}/profile")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.CUSTOMER_CUSTOMER)
    public CustomerResponseVo updateProfile(@PathVariable UUID customerId,
                                            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                            @RequestBody CustomerProfileUpdateRequestDto customerProfileUpdateRequestDto) {
        return customerService.updateProfile(customerId, authorization, customerProfileUpdateRequestDto);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.CUSTOMER_ADMIN)
    public List<CustomerResponseVo> getCustomers() {
        return customerService.getCustomers();
    }

    @GetMapping("/{customerId:[0-9a-fA-F-]{36}}")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.CUSTOMER_READ)
    public CustomerResponseVo getCustomer(@PathVariable UUID customerId,
                                          @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return customerService.getCustomer(customerId, authorization);
    }
}
