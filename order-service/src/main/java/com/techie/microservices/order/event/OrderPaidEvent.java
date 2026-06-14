package com.techie.microservices.order.event;

public record OrderPaidEvent(
        String orderId,
        String orderNumber,
        String customerId,
        String paymentId,
        String paidAt,
        String email,
        String firstName,
        String lastName
) {
}
