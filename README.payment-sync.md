# Payment Feature: Split Order Creation and Payment Flow

This document describes the current split checkout flow in this repository.

The customer creates an order first. The order reserves inventory and stays
`PENDING_PAYMENT`. No payment row, provider session, wallet debit, or shop
wallet credit is created during order creation.

Payment starts later from the customer payment page. When the customer clicks
Pay, the frontend calls payment-service to create or reuse the payment. Wallet
settlement and provider finalization remain backend-owned.

## High-Level Flow

```text
Customer clicks Buy now
        ↓
FE -> POST /api/order/checkout
        ↓
order-service reserves inventory and saves order PENDING_PAYMENT
        ↓
FE navigates to /payments/checkout?orderId=...&method=...
        ↓
Customer clicks Pay
        ↓
FE -> POST /api/payments
        ↓
payment-service creates/reuses payment and completes the selected payment path
```

Core rule:

```text
Do not create the payment inside the order creation request.
```

## Order Checkout

Endpoint:

```http
POST /api/order/checkout
Authorization: Bearer ...
Idempotency-Key: checkout-uuid
Content-Type: application/json
```

Request:

```json
{
  "items": [
    {
      "skuCode": "SKU-001",
      "quantity": 1
    }
  ],
  "paymentMethod": "CARD"
}
```

`paymentMethod` is accepted so the frontend can keep one checkout form shape,
but order-service does not create a payment from it.

Response:

```json
{
  "order": {
    "id": "order-id",
    "orderNumber": "order-number",
    "customerId": "customer-id",
    "status": "PENDING_PAYMENT",
    "totalAmount": 100.0,
    "items": []
  }
}
```

Current entry points:

```text
order-service/src/main/java/com/techie/microservices/order/controller/OrderController.java
order-service/src/main/java/com/techie/microservices/order/service/OrderCheckoutService.java
order-service/src/main/java/com/techie/microservices/order/service/OrderService.java
```

Order-service responsibilities:

- Validate that at least one checkout item exists.
- Resolve current customer from the bearer token.
- Reuse an existing order for the same `customerId + idempotencyKey`.
- Resolve SKU/product data and calculate item price.
- Reserve inventory through inventory-service.
- Save `t_order` and `t_order_item`.
- Default order status to `PENDING_PAYMENT`.
- Return the committed order immediately.

Order-service must not call payment-service in this flow.

## Payment Page

After checkout returns, the customer frontend navigates to:

```text
/payments/checkout?orderId=order-id&method=CARD
```

Supported `method` values:

```text
CARD
MANUAL
BALANCE
```

The payment page:

1. Loads the order with `GET /api/order/{orderId}`.
2. Shows the order total and selected payment method.
3. Waits for the customer to click Pay.
4. Calls `POST /api/payments` with the `orderId` and method.
5. Refreshes order, payment, and wallet queries after payment changes.

## Payment Creation

Endpoint:

```http
POST /api/payments
Authorization: Bearer ...
Idempotency-Key: optional-payment-key
Content-Type: application/json
```

Request:

```json
{
  "orderId": "order-id",
  "method": "CARD"
}
```

Current entry points:

```text
payment-service/src/main/java/com/techie/microservices/payment/controller/PaymentController.java
payment-service/src/main/java/com/techie/microservices/payment/service/PaymentService.java
```

Payment-service responsibilities:

- Require `orderId`.
- Resolve the current customer from the bearer token.
- Load the order through order-service and verify ownership.
- Reject creating a payment for `PAID` or `CANCELED` orders.
- Reuse an existing payment by `customerId + idempotencyKey` when supplied.
- Otherwise reuse the newest pending payment for the same customer and order.
- Persist payment history after creation/finalization.

For `CARD` and `MANUAL`:

- Create or reuse a `PENDING` payment.
- Set provider to `MOCK`.
- Set `sessionStatus=READY`.
- Store `providerSessionId`, `clientSecret`, and `paymentUrl`.
- The local payment page can then simulate provider success/failure through the mock webhook endpoint.

For `BALANCE`:

- Create or reuse a pending wallet payment.
- Debit the current customer wallet through wallet-service.
- Credit shop wallets by grouped order item totals.
- Call `POST /api/order/{orderId}/confirm-paid`.
- Mark the payment `SUCCESS` with `sessionStatus=COMPLETED`.

## Finalization

Mock provider endpoint:

```http
POST /api/payments/webhooks/mock-provider
X-Mock-Provider-Secret: optional-configured-secret
Content-Type: application/json
```

Trusted/manual status endpoint:

```http
PATCH /api/payments/{paymentId}/status
Content-Type: application/json
```

On `SUCCESS`, payment-service:

- Loads order settlement details.
- Credits shop wallets.
- Calls `POST /api/order/{orderId}/confirm-paid`.
- Marks payment `SUCCESS` and `sessionStatus=COMPLETED`.

On `FAILED`, payment-service:

- Calls `POST /api/order/{orderId}/cancel-payment`.
- Releases reserved inventory through order-service.
- Marks payment `FAILED` and `sessionStatus=FAILED`.

## Wallet Settlement

Wallet endpoints used by payment-service:

```http
POST /api/wallet/customer/me/debits
POST /api/wallet/shops/{shopId}/credits
```

Settlement idempotency references:

```text
customer debit externalRef = paymentId
shop credit externalRef = paymentId:shopId
```

This keeps customer balance and shop balances safe across retries.

## End-to-End Status Transitions

### CARD or MANUAL

```text
POST /api/order/checkout
  -> order PENDING_PAYMENT
payment page Pay button
POST /api/payments
  -> payment PENDING, session READY
mock/provider success
  -> payment SUCCESS, session COMPLETED
  -> shop wallets credited
  -> order PAID
```

### BALANCE

```text
POST /api/order/checkout
  -> order PENDING_PAYMENT
payment page Pay button
POST /api/payments with method=BALANCE
  -> customer wallet debited
  -> shop wallets credited
  -> payment SUCCESS, session COMPLETED
  -> order PAID
```

## Known Limits

- Inventory is reserved when the order is created and remains reserved until payment success, payment failure, cancellation, or cleanup.
- If wallet settlement fails, the order can remain `PENDING_PAYMENT`; add retry/cancel tooling or an expiration job for production.
- The payment page currently uses the local mock provider flow for `CARD` and `MANUAL`.
- A production provider should redirect or confirm through a provider webhook, not trust browser-only completion.
