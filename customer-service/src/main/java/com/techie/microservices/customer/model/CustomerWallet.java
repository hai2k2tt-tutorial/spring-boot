package com.techie.microservices.customer.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "t_customer_wallet")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CustomerWallet {
    @Id
    private UUID customerId;

    @OneToOne(optional = false)
    @MapsId
    @JoinColumn(name = "customer_id", nullable = false)
    private CustomerProfile customer;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal balance;

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        if (balance == null) {
            balance = BigDecimal.ZERO;
        }
        if (currency == null || currency.isBlank()) {
            currency = "USD";
        }
        updatedAt = Instant.now();
    }
}
