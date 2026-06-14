package com.techie.microservices.notification.service;

import com.techie.microservices.notification.dto.ShopNotificationCreateCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OrderPaidShopNotificationService {
    private final ShopNotificationService shopNotificationService;

    public void createFromOrderPaidEvent(Map<String, String> event) {
        String shopIds = event.get("shopIds");
        if (shopIds == null || shopIds.isBlank()) {
            return;
        }

        String orderId = event.get("orderId");
        String orderNumber = event.get("orderNumber");
        String customerId = event.get("customerId");
        String paidAt = event.get("paidAt");

        Arrays.stream(shopIds.split(","))
                .map(String::trim)
                .filter(shopId -> !shopId.isBlank())
                .distinct()
                .forEach(shopId -> shopNotificationService.create(new ShopNotificationCreateCommand(
                        shopId,
                        "ORDER_PAID",
                        "New paid order",
                        "Order " + orderNumber + " has been paid.",
                        "/shop/orders/" + orderId,
                        Map.of(
                                "orderId", orderId,
                                "orderNumber", orderNumber,
                                "customerId", customerId,
                                "paidAt", paidAt
                        )
                )));
    }
}