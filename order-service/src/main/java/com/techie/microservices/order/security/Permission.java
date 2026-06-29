package com.techie.microservices.order.security;

public enum Permission {
    ORDER_ADMIN("order.admin"),
    ORDER_CUSTOMER("order.customer"),
    ORDER_SHOP("order.shop");

    private final String key;

    Permission(String key) {
        this.key = key;
    }

    public String key() {
        return key;
    }
}
