package com.techie.microservices.order.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Repository
public class CustomerProfileLookupRepository {
    private final JdbcTemplate jdbcTemplate;

    public CustomerProfileLookupRepository(
            @Qualifier("customerLookupJdbcTemplate") JdbcTemplate jdbcTemplate
    ) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public UUID resolveCustomerId(UUID authId) {
        try {
            return jdbcTemplate.queryForObject(
                    "select id from t_customer_profile where auth_id = ?",
                    UUID.class,
                    authId
            );
        } catch (EmptyResultDataAccessException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer profile not found");
        }
    }
}
