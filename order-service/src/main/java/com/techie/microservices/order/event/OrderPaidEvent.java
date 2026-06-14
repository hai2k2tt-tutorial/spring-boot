package com.techie.microservices.order.event;

import java.util.List;

public record OrderPaidEvent(
        String orderId,
        String orderNumber,
        String customerId,
        String paymentId,
        String paidAt,
        String email,
        String firstName,
        String lastName,
        List<String> shopIds
) {
}
