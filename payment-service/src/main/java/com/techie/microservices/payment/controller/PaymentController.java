package com.techie.microservices.payment.controller;

import com.techie.microservices.payment.dto.PaymentCreateRequestDto;
import com.techie.microservices.payment.dto.PaymentProviderWebhookRequestDto;
import com.techie.microservices.payment.dto.PaymentStatusUpdateRequestDto;
import com.techie.microservices.payment.security.Permission;
import com.techie.microservices.payment.security.RequirePermission;
import com.techie.microservices.payment.service.PaymentSagaOrchestratorService;
import com.techie.microservices.payment.service.PaymentService;
import com.techie.microservices.payment.vo.PaymentHistoryResponseVo;
import com.techie.microservices.payment.vo.PaymentResponseVo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentSagaOrchestratorService paymentSagaOrchestratorService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequirePermission(Permission.PAYMENT_CUSTOMER)
    public PaymentResponseVo createPayment(@RequestBody PaymentCreateRequestDto paymentCreateRequestDto,
                                           @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                           @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey) {
        return paymentService.createPayment(paymentCreateRequestDto, authorization, idempotencyKey);
    }

    @PostMapping("/async")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @RequirePermission(Permission.PAYMENT_CUSTOMER)
    public PaymentResponseVo requestAsyncPayment(@RequestBody PaymentCreateRequestDto paymentCreateRequestDto,
                                                 @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
                                                 @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey) {
        return paymentSagaOrchestratorService.requestAsyncPayment(paymentCreateRequestDto, authorization, idempotencyKey);
    }

    @PatchMapping("/{paymentId}/status")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.PAYMENT_ADMIN)
    public PaymentResponseVo updatePaymentStatus(@PathVariable UUID paymentId,
                                                 @RequestBody PaymentStatusUpdateRequestDto paymentStatusUpdateRequestDto) {
        return paymentService.updatePaymentStatus(paymentId, paymentStatusUpdateRequestDto);
    }

    @PostMapping("/webhooks/mock-provider")
    @ResponseStatus(HttpStatus.OK)
    public PaymentResponseVo handleMockProviderWebhook(@RequestBody PaymentProviderWebhookRequestDto request,
                                                       @RequestHeader(name = "X-Mock-Provider-Secret", required = false) String webhookSecret) {
        return paymentService.handleProviderWebhook(request, webhookSecret);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.PAYMENT_READ)
    public List<PaymentResponseVo> getPayments(@RequestParam(required = false) UUID customerId,
                                               @RequestParam(required = false) UUID orderId) {
        return paymentService.getPayments(customerId, orderId);
    }

    @GetMapping("/shop/me")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.PAYMENT_SHOP)
    public List<PaymentResponseVo> getCurrentShopPayments(@RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return paymentService.getCurrentShopPayments(authorization);
    }

    @GetMapping("/{paymentId}/history")
    @ResponseStatus(HttpStatus.OK)
    @RequirePermission(Permission.PAYMENT_READ)
    public List<PaymentHistoryResponseVo> getPaymentHistory(@PathVariable UUID paymentId) {
        return paymentService.getPaymentHistory(paymentId);
    }
}
