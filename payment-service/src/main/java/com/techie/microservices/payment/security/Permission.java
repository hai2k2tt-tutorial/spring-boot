package com.techie.microservices.payment.security;

public enum Permission {
    PAYMENT_ADMIN("payment.admin"),
    PAYMENT_CUSTOMER("payment.customer"),
    PAYMENT_SHOP("payment.shop"),
    PAYMENT_READ("payment.read");

    private final String key;

    Permission(String key) {
        this.key = key;
    }

    public String key() {
        return key;
    }
}
