# Database Tables and Collections

This document summarizes the database tables/collections for selected services based on migration SQL and model classes.

## Migration standard

- Database services should standardize on **Liquibase**.
- New services should use the **same parent Spring Boot baseline and dependency conventions** as the existing microservices modules.
- Do not introduce a separate Spring Boot starter parent or a different Spring Boot version for a single service.
- Prefer matching the common module dependency set where it fits the service: JPA, web, Liquibase, OpenAPI, actuator, Micrometer tracing, Loki logging, and the shared test stack.
- Spring Boot Docker image publishing should use the shared root `docker-build` Maven profile and the shared image tag property. Frontend Docker images should use explicit project images and version tags in `docker-compose.yml`.
- Use environment-provided Docker Hub credentials for image publishing. Keep `docker.username` stable in Maven config if needed, but pass `docker.password` from `DOCKER_PASSWORD` or `-Ddocker.password=...` instead of committing the token to source.
- Database migrations should be run **manually by command**, not automatically during Spring Boot application startup.
- Each service should keep:
  - a `liquibase.properties` file at module root
  - a master changelog under `src/main/resources/db/changelog/`
  - rollback definitions inside Liquibase changesets
  - local wrapper commands or scripts for `status`, `update`, `rollback`, and optional `tag`
- Spring Boot runtime config for DB services should disable auto-run migrations, for example:
  - `spring.liquibase.enabled=false`
- This migration standard should be applied to:
  - `product-service`
  - `inventory-service`
  - `order-service`
  - `shop-service`
  - `customer-service`
  - `payment-service`
  - `wallet-service`

## api-gateway

- **Database:** none
- **Notes:** No data store configured.

## product-service (Postgres)

- **Tables:** `t_category`, `t_product`
- **t_category columns:**
  - `id` (UUID, PK)
  - `name` (varchar)
  - `parent_id` (UUID, nullable FK to `t_category`)
  - `created_at` (timestamp with time zone)
  - `updated_at` (timestamp with time zone)
- **t_product columns:**
  - `id` (UUID, PK)
  - `shop_id` (UUID)
  - `name` (varchar)
  - `description` (text)
  - `price` (numeric / BigDecimal)
  - `image_url` (varchar)
  - `category_id` (UUID, FK to `t_category`)
  - `status` (`DRAFT` / `ACTIVE` / `ARCHIVED`)
  - `created_at` (timestamp with time zone)
  - `updated_at` (timestamp with time zone)
- **Application structure:** inbound API payloads use DTOs, outbound payloads use VOs, and entity/DTO/VO conversion is handled by dedicated mapper classes.
- **Migration flow:** application startup does not run DB migration automatically. `product-service` uses Liquibase and migrations are executed manually with Maven commands or the local wrapper script.
- **Rollback flow:** rollback is handled by Liquibase. Use `rollbackCount` for the latest changeset or tags for release-level rollback.

### product-service manual migration commands

Run from repository root:

```bash
mvn -pl product-service -DskipTests liquibase:status
```

```bash
mvn -pl product-service -DskipTests liquibase:update
```

```bash
mvn -pl product-service -DskipTests -Dliquibase.rollbackCount=1 liquibase:rollback
```

Optional DB overrides:

```bash
-Dliquibase.url=jdbc:postgresql://localhost:5432/product_service
-Dliquibase.username=postgres
-Dliquibase.password=postgres
```

Tag-based rollback example:

```bash
mvn -pl product-service -DskipTests -Dliquibase.tag=release-1 liquibase:tag
mvn -pl product-service -DskipTests -Dliquibase.rollbackTag=release-1 liquibase:rollback
```

Wrapper script:

```bash
sh product-service/scripts/db.sh status
sh product-service/scripts/db.sh update
sh product-service/scripts/db.sh rollback-last
sh product-service/scripts/db.sh tag release-1
sh product-service/scripts/db.sh rollback-tag release-1
```

## payment-service (Postgres)

- **Tables:** `t_payment`, `t_payment_history`
- **t_payment columns:**
  - `id` (UUID, PK)
  - `customer_id` (UUID)
  - `order_id` (UUID)
  - `amount` (numeric / BigDecimal)
  - `method` (`BALANCE` / `CARD` / `MANUAL`)
  - `status` (`PENDING` / `SUCCESS` / `FAILED`)
  - `created_at` (timestamp with time zone)
  - `updated_at` (timestamp with time zone)
- **t_payment_history columns:**
  - `id` (UUID, PK)
  - `customer_id` (UUID)
  - `payment_id` (UUID, FK to `t_payment`)
  - `type` (`TOPUP` / `PURCHASE` / `REFUND`)
  - `amount` (numeric / BigDecimal)
  - `created_at` (timestamp with time zone)
- **Application structure:** inbound API payloads use DTOs, outbound payloads use VOs, and entity/DTO/VO conversion is handled by dedicated mapper classes.
- **Migration flow:** application startup does not run DB migration automatically. `payment-service` uses Liquibase and migrations are executed manually with Maven commands or the local wrapper script.

### payment-service manual migration commands

Run from repository root:

```bash
mvn -pl payment-service -DskipTests liquibase:status
mvn -pl payment-service -DskipTests liquibase:update
mvn -pl payment-service -DskipTests -Dliquibase.rollbackCount=1 liquibase:rollback
```

Wrapper script:

```bash
sh payment-service/scripts/db.sh status
sh payment-service/scripts/db.sh update
sh payment-service/scripts/db.sh rollback-last
```

## wallet-service (Postgres)

- **Database:** `wallet_service`
- **Tables:** `t_wallet`, `t_wallet_transaction`
- **Responsibility:** owns operational customer and shop wallet balances used by wallet top-up, wallet checkout payment, and shop credit after purchase.
- **t_wallet columns:**
  - `id` (UUID, PK)
  - `owner_type` (`CUSTOMER` / `SHOP`)
  - `owner_id` (UUID; customer profile id or shop profile id)
  - `balance` (numeric / BigDecimal)
  - `currency` (varchar, default application value `USD`)
  - `created_at` (timestamp with time zone)
  - `updated_at` (timestamp with time zone)
- **t_wallet_transaction columns:**
  - `id` (UUID, PK)
  - `wallet_id` (UUID, FK to `t_wallet`)
  - `owner_type` (`CUSTOMER` / `SHOP`)
  - `owner_id` (UUID)
  - `type` (`CREDIT` / `DEBIT`)
  - `amount` (numeric / BigDecimal)
  - `balance_after` (numeric / BigDecimal)
  - `currency` (varchar)
  - `external_ref` (varchar, nullable; used for idempotent debit/credit)
  - `description` (varchar, nullable)
  - `created_at` (timestamp with time zone)
- **Indexes/constraints:**
  - unique owner wallet: `owner_type`, `owner_id`
  - transaction lookup: `owner_type`, `owner_id`, `created_at`
  - idempotency key: unique `owner_type`, `owner_id`, `type`, `external_ref`
  - check constraints for owner and transaction enum values
- **Application structure:** wallet-service resolves current customer/shop identity by calling customer-service or shop-service with the caller bearer token. Payment-service calls wallet-service to debit customer wallets and credit shop wallets for `BALANCE` payments.
- **Migration flow:** application startup does not run DB migration automatically. `wallet-service` uses Liquibase and migrations are executed manually with Maven commands or the local wrapper script.

### wallet-service manual migration commands

Run from repository root:

```bash
mvn -pl wallet-service -DskipTests liquibase:status
mvn -pl wallet-service -DskipTests liquibase:update
mvn -pl wallet-service -DskipTests -Dliquibase.rollbackCount=1 liquibase:rollback
```

Wrapper script:

```bash
sh wallet-service/scripts/db.sh status
sh wallet-service/scripts/db.sh update
sh wallet-service/scripts/db.sh rollback-last
```

## shop-service (Postgres)

- **Tables:** `t_shop_auth`, `t_shop_profile`, `t_shop_wallet`
- **Wallet note:** `t_shop_wallet` remains in shop-service schema for profile-sync compatibility. Operational shop balances for payments are owned by `wallet-service.t_wallet` with `owner_type = SHOP`.
- **t_shop_auth columns:**
  - `id` (UUID, PK; Keycloak `sub`)
  - `email` (varchar, unique)
  - `status` (`ACTIVE` / `LOCKED`)
  - `created_at` (timestamp with time zone)
  - `updated_at` (timestamp with time zone)
- **t_shop_profile columns:**
  - `id` (UUID, PK)
  - `auth_id` (UUID, FK to `t_shop_auth`, unique)
  - `shop_name` (varchar)
  - `owner_name` (varchar)
  - `phone` (varchar)
  - `created_at` (timestamp with time zone)
  - `updated_at` (timestamp with time zone)
- **t_shop_wallet columns:**
  - `shop_id` (UUID, PK/FK to `t_shop_profile`)
  - `balance` (numeric / BigDecimal)
  - `currency` (varchar)
  - `updated_at` (timestamp with time zone)
- **Application structure:** inbound API payloads use DTOs, outbound payloads use VOs, and entity/DTO/VO conversion is handled by dedicated mapper classes.
- **Migration flow:** application startup does not run DB migration automatically. `shop-service` uses Liquibase and migrations are executed manually with Maven commands or the local wrapper script.
- **Dependency/version rule:** `shop-service` uses the same shared parent and baseline dependency style as the other microservices modules.

### shop-service manual migration commands

Run from repository root:

```bash
mvn -pl shop-service -DskipTests liquibase:status
mvn -pl shop-service -DskipTests liquibase:update
mvn -pl shop-service -DskipTests -Dliquibase.rollbackCount=1 liquibase:rollback
```

Wrapper script:

```bash
sh shop-service/scripts/db.sh status
sh shop-service/scripts/db.sh update
sh shop-service/scripts/db.sh rollback-last
```

## customer-service (Postgres)

- **Tables:** `t_customer_auth`, `t_customer_profile`, `t_customer_wallet`
- **Wallet note:** `t_customer_wallet` remains in customer-service schema for profile-sync compatibility. Operational customer balances for wallet top-up and checkout payment are owned by `wallet-service.t_wallet` with `owner_type = CUSTOMER`.
- **t_customer_auth columns:**
  - `id` (UUID, PK; Keycloak `sub`)
  - `email` (varchar, unique)
  - `status` (`ACTIVE` / `LOCKED`)
  - `created_at` (timestamp with time zone)
  - `updated_at` (timestamp with time zone)
- **t_customer_profile columns:**
  - `id` (UUID, PK)
  - `auth_id` (UUID, FK to `t_customer_auth`, unique)
  - `first_name` (varchar)
  - `last_name` (varchar)
  - `phone` (varchar)
  - `created_at` (timestamp with time zone)
  - `updated_at` (timestamp with time zone)
- **t_customer_wallet columns:**
  - `customer_id` (UUID, PK/FK to `t_customer_profile`)
  - `balance` (numeric / BigDecimal)
  - `currency` (varchar)
  - `updated_at` (timestamp with time zone)
- **Application structure:** inbound API payloads use DTOs, outbound payloads use VOs, and entity/DTO/VO conversion is handled by dedicated mapper classes.
- **Migration flow:** application startup does not run DB migration automatically. `customer-service` uses Liquibase and migrations are executed manually with Maven commands or the local wrapper script.
- **Dependency/version rule:** `customer-service` uses the same shared parent and baseline dependency style as the other microservices modules.

### customer-service manual migration commands

Run from repository root:

```bash
mvn -pl customer-service -DskipTests liquibase:status
mvn -pl customer-service -DskipTests liquibase:update
mvn -pl customer-service -DskipTests -Dliquibase.rollbackCount=1 liquibase:rollback
```

Wrapper script:

```bash
sh customer-service/scripts/db.sh status
sh customer-service/scripts/db.sh update
sh customer-service/scripts/db.sh rollback-last
```

## order-service (MySQL)

- **Tables:** `t_order`, `t_order_item`
- **t_order columns:**
  - `id` (char(36), PK)
  - `order_number` (varchar, unique)
  - `customer_id` (char(36))
  - `status` (`PENDING` / `PAID` / `CANCELED`)
  - `total_amount` (numeric / BigDecimal)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
- **t_order_item columns:**
  - `id` (char(36), PK)
  - `order_id` (char(36), FK to `t_order`)
  - `sku_id` (char(36))
  - `product_id` (char(36))
  - `shop_id` (char(36))
  - `price` (numeric / BigDecimal)
  - `quantity` (int)
- **Application structure:** inbound API payloads use DTOs, outbound payloads use VOs, and entity/DTO/VO conversion is handled by dedicated mapper classes.
- **Migration flow:** application startup does not run DB migration automatically. `order-service` uses Liquibase and migrations are executed manually with Maven commands or the local wrapper script.

### order-service manual migration commands

Run from repository root:

```bash
mvn -pl order-service -DskipTests liquibase:status
mvn -pl order-service -DskipTests liquibase:update
mvn -pl order-service -DskipTests -Dliquibase.rollbackCount=1 liquibase:rollback
```

Wrapper script:

```bash
sh order-service/scripts/db.sh status
sh order-service/scripts/db.sh update
sh order-service/scripts/db.sh rollback-last
```

## inventory-service (MySQL)

- **Tables:** `t_attribute`, `t_attribute_value`, `t_sku`, `t_sku_attribute_value`, `t_inventory`
- **t_attribute columns:**
  - `id` (char(36), PK)
  - `product_id` (char(36))
  - `code` (varchar)
  - `name` (varchar)
  - `input_type` (`SELECT` / `TEXT`)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
- **t_attribute_value columns:**
  - `id` (char(36), PK)
  - `attribute_id` (char(36), FK to `t_attribute`)
  - `value` (varchar)
  - `sort_order` (int)
- **t_sku columns:**
  - `id` (char(36), PK)
  - `product_id` (char(36))
  - `sku_code` (varchar, unique)
  - `price_override` (numeric / BigDecimal, nullable)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
- **t_sku_attribute_value columns:**
  - `id` (char(36), PK)
  - `sku_id` (char(36), FK to `t_sku`)
  - `attribute_value_id` (char(36), FK to `t_attribute_value`)
- **t_inventory columns:**
  - `id` (char(36), PK)
  - `sku_id` (char(36), FK to `t_sku`, unique)
  - `quantity` (int)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
- **Application structure:** inbound API payloads use DTOs, outbound payloads use VOs, and entity/DTO/VO conversion is handled by dedicated mapper classes.
- **Migration flow:** application startup does not run DB migration automatically. `inventory-service` uses Liquibase and migrations are executed manually with Maven commands or the local wrapper script.

### inventory-service manual migration commands

Run from repository root:

```bash
mvn -pl inventory-service -DskipTests liquibase:status
mvn -pl inventory-service -DskipTests liquibase:update
mvn -pl inventory-service -DskipTests -Dliquibase.rollbackCount=1 liquibase:rollback
```

Wrapper script:

```bash
sh inventory-service/scripts/db.sh status
sh inventory-service/scripts/db.sh update
sh inventory-service/scripts/db.sh rollback-last
```

## Source files

- `order-service/src/main/resources/db/changelog/db.changelog-master.xml`
- `order-service/liquibase.properties`
- `inventory-service/src/main/resources/db/changelog/db.changelog-master.xml`
- `inventory-service/liquibase.properties`
- `product-service/src/main/resources/db/changelog/db.changelog-master.xml`
- `product-service/liquibase.properties`
- `payment-service/src/main/resources/db/changelog/db.changelog-master.xml`
- `payment-service/liquibase.properties`
- `wallet-service/src/main/resources/db/changelog/db.changelog-master.xml`
- `wallet-service/liquibase.properties`
- `shop-service/src/main/resources/db/changelog/db.changelog-master.xml`
- `shop-service/liquibase.properties`
- `customer-service/src/main/resources/db/changelog/db.changelog-master.xml`
- `customer-service/liquibase.properties`
- `order-service/src/main/java/com/techie/microservices/order/model/Order.java`
- `product-service/src/main/java/com/techie/microservices/product/model/Product.java`
- `product-service/src/main/java/com/techie/microservices/product/model/Category.java`
- `inventory-service/src/main/java/com/techie/microservices/inventory/model/Sku.java`
- `payment-service/src/main/java/com/techie/microservices/payment/model/Payment.java`
- `wallet-service/src/main/java/com/techie/microservices/wallet/model/Wallet.java`
- `wallet-service/src/main/java/com/techie/microservices/wallet/model/WalletTransaction.java`
- `shop-service/src/main/java/com/techie/microservices/shop/model/ShopProfile.java`
- `customer-service/src/main/java/com/techie/microservices/customer/model/CustomerProfile.java`
- `api-gateway/src/main/resources/application.properties`
