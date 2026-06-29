package com.techie.microservices.wallet.security;

public enum Permission {
    WALLET_CUSTOMER("wallet.customer"),
    WALLET_SHOP("wallet.shop");

    private final String key;

    Permission(String key) {
        this.key = key;
    }

    public String key() {
        return key;
    }
}
