# Payment Feature: Backend-Owned Checkout and Payment Confirmation Flow

This document describes the backend-owned synchronous checkout flow and the follow-up payment confirmation flow driven by provider webhooks.

The frontend should not be responsible for creating the payment after creating the order. Instead, the frontend calls one checkout endpoint, and the backend owns the sequence:

```text
create order -> commit order -> reserve inventory -> create payment session -> return order + payment to FE -> provider webhook -> confirm payment -> confirm order paid or cancel -> release inventory on failure
```

## Goal

Keep order creation reliable even when payment provider calls are slow or fail, while avoiding trust in the frontend to call the payment API.

Core rule:

```text
Order creation must commit before payment session creation is attempted.
```

Do not call the payment service inside the order database transaction.

## Recommended User Flow

```text
Customer clicks Create order and pay
        ↓
Customer FE calls POST /api/checkout
        ↓
Checkout backend validates request/authentication
        ↓
Checkout backend calls Order service to create order
        ↓
Order service validates request
        ↓
Order service calls Inventory service to resolve SKU, SKU price, and reserve stock
        ↓
Order service calls Product service to resolve product detail
        ↓
Order service creates order with status PENDING_PAYMENT
        ↓
Order transaction commits
        ↓
Order service returns order detail to checkout backend
        ↓
Checkout backend calls Payment service to create payment session
        ↓
Payment service verifies order ownership
        ↓
Payment service creates or reuses payment with status PENDING
        ↓
Payment service creates external payment provider session
        ↓
Payment service returns paymentUrl/clientSecret to checkout backend
        ↓
Checkout backend returns order + payment to FE
        ↓
Customer FE redirects to payment page
        ↓
Payment provider completes payment
        ↓
Payment provider sends webhook to BE
        ↓
Payment service validates webhook and finalizes payment
        ↓
Payment service calls Order service to confirm order paid
        ↓
Order service confirms order status = PAID
        ↓
If payment fails or is canceled:
        ↓
Payment service calls Order service to cancel the order
        ↓
Order service releases reserved inventory
```

## Why Backend Checkout Is Better Than FE Orchestration

The older simple flow was:

```text
FE -> POST /api/order
FE -> POST /api/payments
```

That works, but it trusts the frontend to make the second call. If the FE closes, has a bug, loses network, or intentionally skips the payment call, the order remains without a payment session.

The recommended flow is:

```text
FE -> POST /api/checkout
Backend -> POST /api/order
Backend -> POST /api/payments
```

This keeps FE simple and makes checkout creation a backend responsibility.

## Transaction Boundary

Do this:

```text
Checkout backend calls Order service
        ↓
Order service opens DB transaction
        ↓
Order service saves order and order items
        ↓
Order service commits transaction
        ↓
Order service returns order
        ↓
Checkout backend calls Payment service
```

Avoid this:

```text
OrderService.placeOrder() @Transactional
        ↓
save order
        ↓
call Payment service before transaction commits
        ↓
return order + payment
```

Calling payment inside the order transaction can create inconsistent state. For example, the payment provider session may be created successfully, but the order transaction may later roll back.

## Backend Responsibilities

### Checkout Backend / API Gateway / BFF

Recommended endpoint:

```text
POST /api/checkout
```

Responsibilities:

- Validate the checkout request.
- Resolve the current customer from the `Authorization` token.
- Generate or accept a checkout idempotency key.
- Call `POST /api/order`.
- Wait for the order service to return a committed order.
- Call `POST /api/payments` with the committed `orderId`.
- Return both order detail and payment session detail to the frontend.
- If payment creation times out, recover by querying payment state by `orderId`.

The checkout backend can be implemented as:

```text
API gateway route
BFF service
Next.js server route running in a stable Node.js container
Dedicated checkout-service
```

Do not use a serverless or edge-only runtime for long-running payment orchestration unless its timeout/retry behavior is explicitly handled.

### Order Service

Endpoint:

```text
POST /api/order
```

Current entry point:

```text
order-service/src/main/java/com/techie/microservices/order/controller/OrderController.java
```

Current service logic:

```text
order-service/src/main/java/com/techie/microservices/order/service/OrderService.java
```

Responsibilities:

- Validate order request.
- Resolve current customer from `Authorization` token.
- Call Inventory service to resolve SKU and SKU price from `skuCode`.
- Call Product service to resolve product detail.
- Call Inventory service to reserve inventory for each SKU and quantity.
- Save `t_order`.
- Save `t_order_item` rows.
- Return order response after the transaction commits.

Current order status:

```text
PENDING
```

Recommended status:

```text
PENDING_PAYMENT
```

### Payment Service

Endpoint:

```text
POST /api/payments
```

Responsibilities:

- Validate `orderId`.
- Load order from order service.
- Verify the order belongs to the current customer.
- Idempotently create or reuse an active payment for the order.
- Create payment with status `PENDING` if one does not already exist.
- Create external payment provider session.
- Persist payment session fields.
- Return `paymentUrl` and/or `clientSecret`.
- Accept provider webhooks and validate the payment session reference.
- Mark the payment `SUCCESS` or `FAILED` only from the webhook or a trusted payment update.
- On successful payment, call the order service to confirm the order as paid.

Webhook endpoint:

```text
POST /api/payments/webhooks/mock-provider
```

Responsibilities:

- Validate the webhook payload and provider secret when configured.
- Match the webhook to the stored payment by `paymentId` or `providerSessionId`.
- Ensure the payment is still `PENDING` before finalizing it.
- Persist payment history for the final status transition.
- Call `POST /api/order/{orderId}/confirm-paid` when the payment succeeds.
- Call `POST /api/order/{orderId}/cancel-payment` when the payment fails or is canceled.

### Order Paid Confirmation

Endpoint:

```text
POST /api/order/{orderId}/confirm-paid
```

Responsibilities:

- Load the order and order items.
- Return the existing order if it is already `PAID`.
- Reject confirmation for canceled orders.
- Mark the order `PAID`.

### Inventory Reservation

Endpoint:

```text
POST /api/inventory/reserve
```

Responsibilities:

- Validate all requested SKU and quantity pairs.
- Lock inventory rows while reserving stock.
- Reject the request if stock is insufficient.
- Create idempotent reservations keyed by `orderId`.
- Keep the order item rows unchanged; inventory is released later if payment fails.

### Inventory Release

Endpoint:

```text
POST /api/inventory/release
```

Responsibilities:

- Load reservations for the order.
- Lock inventory rows while releasing stock.
- Add the reserved quantity back to each SKU.
- Delete reservation records after release.

Current mock response includes:

```json
{
  "id": "payment-id",
  "orderId": "order-id",
  "status": "PENDING",
  "paymentUrl": "http://localhost:3004/payments/checkout?...",
  "clientSecret": "mock_cs_..."
}
```

## Why This Flow Is Safe

If this succeeds:

```text
POST /api/order
```

then the order exists, even if this hangs or fails:

```text
POST /api/payments
```

This avoids losing the order when payment provider calls are slow.

It also avoids trusting the frontend to create payment, because the frontend only calls:

```text
POST /api/checkout
```

## Timeout Recovery

A timeout from `POST /api/payments` is ambiguous:

```text
Maybe payment was not created.
Maybe payment was created but response was lost.
```

The checkout backend should recover by querying payment state:

```text
GET /api/payments?orderId={orderId}
```

For this to work fully, payment service should persist session data:

```text
payment_url
client_secret
provider
provider_session_id
session_expires_at
idempotency_key
```

Then `GET /api/payments?orderId=...` can return the same payment session after a timeout, retry, or page refresh.

## Required Idempotency

Use an idempotency key for checkout and payment creation:

```http
Idempotency-Key: checkout-uuid
```

Backend rule:

```text
Same customer + same idempotency key returns the same checkout/order/payment result.
```

This prevents duplicate orders or duplicate payments if the checkout request is retried after timeout.

Recommended checkout uniqueness:

```text
unique(customer_id, idempotency_key)
```

Recommended payment uniqueness:

```text
unique(customer_id, idempotency_key)
```

Also enforce one active pending payment per order:

```text
unique(order_id) where status = PENDING
```

Exact partial unique index syntax depends on the database.

At minimum, payment creation must be idempotent by `orderId`:

```text
If active pending payment exists for orderId:
  return existing payment/session
Else:
  create payment/session
```

## Recommended API Contract

### Create Checkout

Request:

```http
POST /api/checkout
Authorization: Bearer ...
Idempotency-Key: checkout-uuid
Content-Type: application/json
```

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

Response:

```json
{
  "order": {
    "id": "order-id",
    "orderNumber": "order-number",
    "status": "PENDING_PAYMENT",
    "totalAmount": 100.00,
    "items": []
  },
  "payment": {
    "id": "payment-id",
    "orderId": "order-id",
    "status": "PENDING",
    "sessionStatus": "READY",
    "paymentUrl": "https://provider-checkout-url",
    "clientSecret": "provider-client-secret"
  }
}
```

### Internal Create Order

Request:

```http
POST /api/order
Authorization: Bearer ...
Content-Type: application/json
```

```json
{
  "items": [
    {
      "skuCode": "SKU-001",
      "quantity": 1
    }
  ]
}
```

Response:

```json
{
  "id": "order-id",
  "orderNumber": "order-number",
  "status": "PENDING_PAYMENT",
  "totalAmount": 100.00,
  "items": []
}
```

### Internal Create Payment Session

Request:

```http
POST /api/payments
Authorization: Bearer ...
Idempotency-Key: checkout-uuid
Content-Type: application/json
```

```json
{
  "orderId": "order-id",
  "method": "CARD"
}
```

Response:

```json
{
  "id": "payment-id",
  "orderId": "order-id",
  "status": "PENDING",
  "sessionStatus": "READY",
  "paymentUrl": "https://provider-checkout-url",
  "clientSecret": "provider-client-secret"
}
```

## Frontend Behavior

```text
1. Submit checkout form.
2. Call POST /api/checkout with Idempotency-Key.
3. If checkout succeeds, redirect to payment.paymentUrl.
4. If checkout times out, retry POST /api/checkout with the same Idempotency-Key.
5. If retry returns existing order + payment, redirect to payment.paymentUrl.
6. After the provider finishes payment, wait for the webhook-driven confirmation to update the order and payment state.
7. If payment fails or is canceled, the backend releases the reservation and marks the order canceled.
8. If payment session is not ready, show Retry Payment or poll checkout/payment status.
```

The frontend does not call `POST /api/payments` directly in the recommended flow.

For local and mock-provider flows, the checkout page can trigger the webhook simulation endpoint after the payment session is created. That is a development aid, not a replacement for the provider webhook contract.

## Known Limits

- Inventory is reserved on order creation and released if payment fails.
- Payment session mock values should be persisted for timeout recovery.
- Kafka event publishing in `OrderService` currently happens inside the transaction. For production reliability, use outbox or publish after transaction commit.
- Checkout orchestration needs backend idempotency to avoid duplicate orders and duplicate payments.
- Payment service must enforce one active pending payment per order.
