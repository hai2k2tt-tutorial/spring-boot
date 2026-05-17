package com.techie.microservices.customer.controller;

import com.techie.microservices.customer.dto.CustomerCreateRequestDto;
import com.techie.microservices.customer.dto.CustomerStatusUpdateRequestDto;
import com.techie.microservices.customer.dto.CustomerWalletUpdateRequestDto;
import com.techie.microservices.customer.service.CustomerService;
import com.techie.microservices.customer.vo.CustomerResponseVo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerResponseVo createCustomer(@RequestBody CustomerCreateRequestDto customerCreateRequestDto) {
        return customerService.createCustomer(customerCreateRequestDto);
    }

    @PatchMapping("/{customerId}/status")
    @ResponseStatus(HttpStatus.OK)
    public CustomerResponseVo updateCustomerStatus(@PathVariable UUID customerId,
                                                   @RequestBody CustomerStatusUpdateRequestDto customerStatusUpdateRequestDto) {
        return customerService.updateCustomerStatus(customerId, customerStatusUpdateRequestDto);
    }

    @PatchMapping("/{customerId}/wallet")
    @ResponseStatus(HttpStatus.OK)
    public CustomerResponseVo updateWallet(@PathVariable UUID customerId,
                                           @RequestBody CustomerWalletUpdateRequestDto customerWalletUpdateRequestDto) {
        return customerService.updateWallet(customerId, customerWalletUpdateRequestDto);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<CustomerResponseVo> getCustomers() {
        return customerService.getCustomers();
    }

    @GetMapping("/{customerId}")
    @ResponseStatus(HttpStatus.OK)
    public CustomerResponseVo getCustomer(@PathVariable UUID customerId) {
        return customerService.getCustomer(customerId);
    }
}
