package com.techie.microservices.payment.service;

import com.techie.microservices.payment.dto.PaymentCreateRequestDto;
import com.techie.microservices.payment.dto.PaymentStatusUpdateRequestDto;
import com.techie.microservices.payment.mapper.PaymentHistoryMapper;
import com.techie.microservices.payment.mapper.PaymentMapper;
import com.techie.microservices.payment.model.Payment;
import com.techie.microservices.payment.model.PaymentHistory;
import com.techie.microservices.payment.model.PaymentHistoryType;
import com.techie.microservices.payment.repository.PaymentHistoryRepository;
import com.techie.microservices.payment.repository.PaymentRepository;
import com.techie.microservices.payment.vo.PaymentHistoryResponseVo;
import com.techie.microservices.payment.vo.PaymentResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final PaymentHistoryRepository paymentHistoryRepository;
    private final PaymentMapper paymentMapper;
    private final PaymentHistoryMapper paymentHistoryMapper;

    @Transactional
    public PaymentResponseVo createPayment(PaymentCreateRequestDto paymentCreateRequestDto) {
        Payment payment = paymentMapper.toEntity(paymentCreateRequestDto);
        paymentRepository.save(payment);
        paymentHistoryRepository.save(paymentHistoryMapper.toEntity(payment, resolveHistoryType(payment)));
        log.info("Payment created successfully");
        return paymentMapper.toVo(payment);
    }

    @Transactional
    public PaymentResponseVo updatePaymentStatus(UUID paymentId, PaymentStatusUpdateRequestDto paymentStatusUpdateRequestDto) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
        payment.setStatus(paymentMapper.resolveStatus(paymentStatusUpdateRequestDto.status()));
        paymentRepository.save(payment);
        paymentHistoryRepository.save(paymentHistoryMapper.toEntity(payment, resolveHistoryType(payment)));
        log.info("Payment status updated successfully");
        return paymentMapper.toVo(payment);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponseVo> getPayments(UUID customerId, UUID orderId) {
        return findPayments(customerId, orderId).stream()
                .map(paymentMapper::toVo)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentHistoryResponseVo> getPaymentHistory(UUID paymentId) {
        if (!paymentRepository.existsById(paymentId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found");
        }
        return paymentHistoryRepository.findAllByPaymentIdOrderByCreatedAtAsc(paymentId).stream()
                .map(paymentHistoryMapper::toVo)
                .toList();
    }

    private List<Payment> findPayments(UUID customerId, UUID orderId) {
        if (customerId != null && orderId != null) {
            return paymentRepository.findAllByCustomerIdAndOrderId(customerId, orderId);
        }
        if (customerId != null) {
            return paymentRepository.findAllByCustomerId(customerId);
        }
        if (orderId != null) {
            return paymentRepository.findAllByOrderId(orderId);
        }
        return paymentRepository.findAll();
    }

    private PaymentHistoryType resolveHistoryType(Payment payment) {
        return switch (payment.getMethod()) {
            case BALANCE, CARD, MANUAL -> PaymentHistoryType.PURCHASE;
        };
    }
}
