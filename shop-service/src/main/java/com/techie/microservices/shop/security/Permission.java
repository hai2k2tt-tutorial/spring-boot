package com.techie.microservices.shop.security;

public enum Permission {
    SHOP_ADMIN("shop.admin"),
    SHOP_SHOP("shop.shop"),
    SHOP_READ("shop.read");

    private final String key;

    Permission(String key) {
        this.key = key;
    }

    public String key() {
        return key;
    }
}
