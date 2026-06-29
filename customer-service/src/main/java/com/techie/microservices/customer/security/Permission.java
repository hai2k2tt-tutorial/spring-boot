package com.techie.microservices.customer.security;

public enum Permission {
    CUSTOMER_ADMIN("customer.admin"),
    CUSTOMER_CUSTOMER("customer.customer"),
    CUSTOMER_READ("customer.read");

    private final String key;

    Permission(String key) {
        this.key = key;
    }

    public String key() {
        return key;
    }
}
