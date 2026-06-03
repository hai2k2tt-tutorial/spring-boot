# Payment Feature: Async Kafka and SSE Flow

This document describes a future asynchronous checkout design where order creation returns quickly, payment session creation happens through Kafka, and the customer frontend receives real-time updates through SSE.

## Goal

Return to the customer quickly after order creation while creating the payment session asynchronously.

Target user experience:

```text
Customer clicks Create order
        ↓
Order is created
        ↓
FE shows Payment creating
        ↓
Payment service creates payment session in background
        ↓
FE receives SSE update
        ↓
FE redirects to provider checkout page
```

## High-Level Flow

```text
Customer FE
  ↓ POST /api/order
Order service
  ↓ save order PENDING_PAYMENT_SESSION
  ↓ save outbox event ORDER_CREATED
  ↓ return order to FE
Customer FE
  ↓ open SSE connection for order/payment status
Outbox publisher
  ↓ publish ORDER_CREATED to Kafka
Payment service
  ↓ consume ORDER_CREATED
  ↓ create payment and external provider session
  ↓ save paymentUrl/clientSecret
  ↓ publish PAYMENT_SESSION_READY to Kafka
Realtime/SSE backend
  ↓ consume PAYMENT_SESSION_READY or read latest DB state
  ↓ push SSE event to customer browser
Customer FE
  ↓ receive PAYMENT_SESSION_READY
  ↓ fetch payment session by orderId
  ↓ redirect to paymentUrl
```

## Important Architecture Choice

Do not make the browser or customer FE consume Kafka directly.

Use a backend component between Kafka and browser:

```text
Kafka → realtime-service or Next.js Node server → SSE → Browser
```

A dedicated realtime service is recommended for production.

Next.js can consume Kafka only if it runs as a long-lived Node.js server/container. It is not suitable if deployed as serverless or edge functions.

## Order Service Responsibilities

Current service file:

```text
order-service/src/main/java/com/techie/microservices/order/service/OrderService.java
```

Future responsibilities:

- Validate order request.
- Resolve current customer.
- Resolve SKU/product price.
- Check and reserve inventory.
- Create order with status `PENDING_PAYMENT_SESSION`.
- Save an outbox event `ORDER_CREATED` in the same DB transaction.
- Return order immediately to FE.

Recommended transaction boundary:

```text
@Transactional
  reserve inventory
  save order
  save order items
  save outbox event
commit
```

Do not call payment provider inside this transaction.

Do not rely on direct Kafka publish inside the transaction.

## Outbox Pattern

Use outbox to avoid this failure:

```text
Kafka event was published, but order DB transaction rolled back.
```

Preferred flow:

```text
Order transaction saves outbox row
        ↓
Transaction commits
        ↓
Outbox publisher reads row
        ↓
Publishes Kafka event
        ↓
Marks outbox row published
```

Example outbox payload:

```json
{
  "eventId": "uuid",
  "eventType": "ORDER_CREATED",
  "orderId": "order-id",
  "customerId": "customer-id",
  "totalAmount": 100.00,
  "currency": "USD",
  "createdAt": "2026-06-02T00:00:00Z"
}
```

Kafka key:

```text
orderId
```

Using `orderId` as key keeps events for the same order ordered within one Kafka partition.

## Payment Service Responsibilities

Payment service consumes `ORDER_CREATED`.

Responsibilities:

- Idempotently create or load existing payment for `orderId`.
- Create external provider session, for example Stripe Checkout, PayPal, VNPay.
- Persist provider session fields.
- Publish `PAYMENT_SESSION_READY` or `PAYMENT_SESSION_FAILED`.

Payment session state should be persisted:

```text
payment_id
order_id
customer_id
status
session_status
payment_url
client_secret
provider
provider_session_id
error_message
expires_at
created_at
updated_at
```

Recommended payment session statuses:

```text
CREATING
READY
FAILED
EXPIRED
```

Recommended payment statuses:

```text
PENDING
SUCCESS
FAILED
CANCELED
```

## Idempotency Requirements

Kafka can deliver duplicate messages.

Payment consumer must be idempotent:

```text
If payment exists for orderId:
  return existing payment/session
Else:
  create payment/session
```

Use a unique constraint:

```text
unique(order_id)
```

or, if multiple attempts are allowed:

```text
unique(order_id, active_session_flag)
```

When calling a provider, pass an idempotency key when supported:

```text
provider idempotency key = orderId or paymentId
```

## SSE Design

Frontend opens SSE after order creation:

```http
GET /api/orders/{orderId}/events
Authorization: Bearer ...
Accept: text/event-stream
```

SSE backend must validate:

- User is authenticated.
- User owns the order.
- User can only subscribe to their own events.

Recommended SSE event:

```text
event: payment-session-ready
data: {"orderId":"order-id","paymentId":"payment-id"}
```

Avoid sending `clientSecret` through SSE unless necessary.

Preferred pattern:

```text
SSE says state changed.
FE calls authenticated GET /api/payments/session?orderId=... to fetch paymentUrl/clientSecret.
```

This is safer and gives fallback behavior after refresh or disconnect.

## Frontend Behavior

After order creation response:

```json
{
  "id": "order-id",
  "status": "PENDING_PAYMENT_SESSION"
}
```

FE navigates to payment waiting page:

```text
/payments/checkout?orderId=order-id
```

Payment page behavior:

```text
1. Open SSE for orderId.
2. Show Payment creating.
3. If SSE receives PAYMENT_SESSION_READY:
   - call GET /api/payments/session?orderId=...
   - redirect to paymentUrl.
4. If SSE disconnects:
   - reconnect.
5. If no event after timeout:
   - poll GET /api/payments/session?orderId=...
6. If session failed:
   - show Retry payment.
```

## Recovery API

SSE is not guaranteed delivery. The browser can refresh or disconnect.

You need a query endpoint:

```text
GET /api/payments/session?orderId={orderId}
```

Possible responses:

Session still creating:

```json
{
  "orderId": "order-id",
  "sessionStatus": "CREATING",
  "paymentUrl": null,
  "clientSecret": null
}
```

Session ready:

```json
{
  "orderId": "order-id",
  "paymentId": "payment-id",
  "sessionStatus": "READY",
  "paymentUrl": "https://provider-checkout-url",
  "clientSecret": "provider-client-secret"
}
```

Session failed:

```json
{
  "orderId": "order-id",
  "sessionStatus": "FAILED",
  "errorMessage": "Provider timeout"
}
```

## Retry and Timeout Policy

Payment service should not hang forever on provider calls.

Recommended policy:

```text
Provider timeout: 5-10 seconds
Retries: 2-3 attempts
Backoff: exponential
Final state: FAILED
```

If payment session creation fails:

```text
payment.session_status = FAILED
publish PAYMENT_SESSION_FAILED
FE shows Retry payment
```

Retry payment endpoint:

```text
POST /api/payments/session/retry
```

or reuse:

```text
POST /api/payments/session
```

with idempotent behavior.

## Limits and Tradeoffs

### Benefits

- Order API returns quickly.
- Slow provider calls do not block order creation.
- FE can show real-time payment progress.
- Payment creation can be retried independently.
- Kafka decouples order and payment services.

### Limits

- System becomes eventually consistent.
- FE must handle waiting, timeout, refresh, and reconnect states.
- SSE is not durable; polling fallback is still required.
- More infrastructure is needed: Kafka consumer, SSE backend, outbox publisher.
- Duplicate Kafka events must be handled safely.
- Payment session data must be persisted; events alone are not enough.

## Recommended Production Rule

Use Kafka/SSE for notification, not source of truth.

Source of truth:

```text
order database + payment database
```

Notification path:

```text
Kafka + SSE
```

Frontend recovery path:

```text
GET /api/payments/session?orderId=...
```
