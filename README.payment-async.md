# Payment Feature: Async Split Order and Payment Flow

This document describes the async version of the split checkout flow from
`README.payment-sync.md`.

The architecture uses an orchestration saga with broker/outbox/SSE based
delivery and notifications. The behavioral split is:

```text
Order checkout creates only the order.
Payment page Pay action requests payment creation.
Payment creation/settlement is coordinated asynchronously by a saga orchestrator.
```

## Goal

Keep order creation fast and keep payment/provider/wallet work out of the order
request path, while still requiring an explicit customer Pay action before a
payment is created or settled.

Target user experience:

```text
Customer clicks Buy now
        ↓
Order is created as PENDING_PAYMENT
        ↓
FE navigates to payment page
        ↓
Customer clicks Pay
        ↓
FE shows Payment creating
        ↓
Payment saga orchestrator commands provider session creation or BALANCE settlement
        ↓
FE receives SSE update or polling sees payment state
        ↓
CARD/MANUAL continues to provider/mock session
BALANCE redirects to paid order detail
```

Core rules:

```text
Do not create any payment row/session during order checkout.
Do not call payment-service or an external payment provider inside the order transaction.
Do not make the browser consume Kafka, Redis Stream, or another internal broker directly.
```

## High-Level Flow

```text
Customer FE
  ↓ POST /api/order/checkout
Order service
  ↓ validate checkout request and bearer token
  ↓ resolve SKU/product/price
  ↓ reserve inventory
  ↓ save order PENDING_PAYMENT
  ↓ optionally save ORDER_CREATED / ORDER_PENDING_PAYMENT outbox event
  ↓ commit
  ↓ return order to FE
Customer FE
  ↓ navigate to /payments/checkout?orderId=...&method=...
Customer clicks Pay
  ↓ POST /api/payments/async or POST /api/payments/session-requests
Payment API
  ↓ validate orderId, paymentMethod, bearer token, and order ownership
  ↓ reject PAID/CANCELED orders
  ↓ save payment request and outbox event PAYMENT_CREATION_REQUESTED
  ↓ commit
  ↓ return accepted request/payment placeholder to FE
Customer FE
  ↓ open SSE connection or poll payment state
Outbox publisher
  ↓ publish PAYMENT_CREATION_REQUESTED
Payment saga orchestrator
  ↓ consume PAYMENT_CREATION_REQUESTED
  ↓ create/update payment saga state
  ↓ create or reuse payment idempotently
  ↓ CARD/MANUAL: create provider/mock session
  ↓ BALANCE: command wallet debit/credits
  ↓ command order confirmation/cancellation when terminal
  ↓ publish payment state events
Realtime/SSE backend
  ↓ consume payment state event or read latest DB state
  ↓ push SSE event to customer browser
Customer FE
  ↓ fetch payment by orderId
  ↓ redirect or show final state
```

The important change from a backend-owned async checkout is that
`PAYMENT_CREATION_REQUESTED` is emitted from the payment step, not from order
checkout. Order checkout may publish order lifecycle events for notifications,
but those events must not create a payment or start the payment saga.

Saga style:

```text
Orchestration saga.

Payment saga orchestrator owns the workflow state and decides the next command.
Participant services execute commands and return results.
Participant services do not independently decide the next global checkout step.
```

## Architecture

Use an orchestration saga architecture:

```text
Payment API transaction → payment request + outbox row
outbox publisher → Kafka/Redis Stream → payment saga orchestrator
payment saga orchestrator transaction → saga state + command outbox rows
command outbox publisher → Kafka/Redis Stream or HTTP command adapter → participant services
participant result events → payment saga orchestrator
payment state events → realtime-service or long-lived Next.js Node server → SSE → Browser
```

The orchestrator may be implemented inside `payment-service` initially. If it
grows, split it into a dedicated `payment-saga-service`.

A dedicated realtime service is recommended for production.

Next.js can bridge broker events to SSE only if it runs as a long-lived Node.js
server/container. It is not suitable if deployed as serverless or edge functions
unless timeout/reconnect behavior is explicitly handled.

## Order Service Responsibilities

Current service files:

```text
order-service/src/main/java/com/techie/microservices/order/controller/OrderController.java
order-service/src/main/java/com/techie/microservices/order/service/OrderCheckoutService.java
order-service/src/main/java/com/techie/microservices/order/service/OrderService.java
```

Async split checkout responsibilities:

- Validate checkout request and require at least one item.
- Resolve current customer from the `Authorization` token.
- Resolve SKU through inventory-service.
- Resolve product through product-service.
- Calculate item price from SKU `priceOverride` or product price.
- Reserve inventory with `POST /api/inventory/reserve`.
- Create order with status `PENDING_PAYMENT`.
- Save `t_order` and `t_order_item` rows.
- Store `idempotency_key` and reuse the same order for the same `customerId + idempotencyKey`.
- Optionally save an order lifecycle outbox event for notifications or analytics.
- Return the committed order immediately to FE.

Recommended transaction boundary:

```text
resolve SKU/product data
reserve inventory
@Transactional
  save order
  save order items
  save ORDER_PENDING_PAYMENT outbox event if needed
commit
return order
```

Do not save `PAYMENT_CREATION_REQUESTED` in the order checkout transaction.
Payment creation starts only after the payment page Pay action.

Current order status values:

```text
PENDING_PAYMENT
PENDING
PAID
CANCELED
```

Use `PENDING_PAYMENT` for new checkout orders.

## Payment Request API

The synchronous split flow uses:

```http
POST /api/payments
```

For async payment creation, use a request endpoint that commits quickly and lets
the saga orchestrator do provider/wallet work:

```http
POST /api/payments/async
Authorization: Bearer ...
Idempotency-Key: payment-request-uuid
Content-Type: application/json
```

Request:

```json
{
  "orderId": "order-id",
  "method": "CARD"
}
```

Response options:

```json
{
  "orderId": "order-id",
  "method": "CARD",
  "requestStatus": "ACCEPTED"
}
```

or, if the service persists a payment placeholder before publishing:

```json
{
  "id": "payment-id",
  "orderId": "order-id",
  "method": "CARD",
  "status": "PENDING",
  "sessionStatus": "CREATING",
  "paymentUrl": null,
  "clientSecret": null
}
```

Payment request API responsibilities:

- Require `orderId` and `method`.
- Resolve current customer from the bearer token.
- Load the order through order-service and verify ownership.
- Reject `PAID` and `CANCELED` orders.
- Reuse an existing active payment/request for the same customer/order/idempotency key.
- Save `PAYMENT_CREATION_REQUESTED` to outbox after validation.
- Return without calling a provider or wallet-service.

The Payment API starts the saga but does not orchestrate it in the request
thread. The saga starts only after the request transaction commits and the
outbox publisher publishes `PAYMENT_CREATION_REQUESTED`.

## Payment Outbox

Use outbox to avoid this failure:

```text
Payment saga start event was published, but the payment request DB transaction rolled back.
```

Preferred flow:

```text
Payment request transaction saves outbox row
        ↓
Transaction commits
        ↓
Outbox publisher reads row
        ↓
Publishes PAYMENT_CREATION_REQUESTED
        ↓
Marks outbox row published
```

Only mark an outbox row published after the broker send succeeds. For Kafka,
wait for the producer send result/callback and use producer settings that
provide durable acknowledgement, such as `acks=all` in production.

Example outbox payload:

```json
{
  "eventId": "uuid",
  "eventType": "PAYMENT_CREATION_REQUESTED",
  "orderId": "order-id",
  "customerId": "customer-id",
  "paymentMethod": "CARD",
  "idempotencyKey": "payment-request-uuid",
  "createdAt": "timestamp"
}
```

Broker key:

```text
orderId
```

Using `orderId` as key keeps payment events for the same order ordered within
one partition or stream shard.

## Payment Saga Orchestrator Responsibilities

Payment saga orchestrator consumes `PAYMENT_CREATION_REQUESTED` and owns the
payment saga lifecycle.

Current payment service files:

```text
payment-service/src/main/java/com/techie/microservices/payment/controller/PaymentController.java
payment-service/src/main/java/com/techie/microservices/payment/service/PaymentService.java
```

Orchestrator responsibilities:

- Validate `orderId`, `customerId`, and `paymentMethod` from the event.
- Load order detail from order-service.
- Verify the order belongs to the event/customer context.
- Reject `PAID` and `CANCELED` orders.
- Create or update a persisted saga instance keyed by `orderId` and/or
  `paymentRequestId`.
- Idempotently create or reuse an active payment for `orderId`.
- Reuse payment by `customerId + idempotencyKey` when supplied.
- For `CARD` and `MANUAL`, create payment with status `PENDING`.
- For `CARD` and `MANUAL`, command mock/provider session creation and persist
  the resulting session fields.
- For `BALANCE`, send commands to debit the current customer wallet and credit
  shop wallets by grouped order item totals.
- For `BALANCE`, mark payment `SUCCESS`, set `sessionStatus=COMPLETED`, and
  send a command to order-service `confirm-paid`.
- On terminal failure, send a command to order-service `cancel-payment` when the
  order should be canceled.
- Persist payment history.
- Publish payment state events only after payment/saga state is committed.

Recommended saga states:

```text
STARTED
VALIDATING_ORDER
CREATING_PAYMENT
CREATING_PROVIDER_SESSION
DEBITING_CUSTOMER_WALLET
CREDITING_SHOP_WALLETS
CONFIRMING_ORDER_PAID
CANCELING_ORDER_PAYMENT
COMPLETED
FAILED
COMPENSATING
COMPENSATED
```

Recommended command/result events:

```text
PAYMENT_CREATION_REQUESTED
CREATE_PROVIDER_SESSION_COMMAND
PROVIDER_SESSION_CREATED
PROVIDER_SESSION_CREATE_FAILED
DEBIT_CUSTOMER_WALLET_COMMAND
CUSTOMER_WALLET_DEBITED
CUSTOMER_WALLET_DEBIT_FAILED
CREDIT_SHOP_WALLET_COMMAND
SHOP_WALLET_CREDITED
SHOP_WALLET_CREDIT_FAILED
CONFIRM_ORDER_PAID_COMMAND
ORDER_PAID_CONFIRMED
CANCEL_ORDER_PAYMENT_COMMAND
ORDER_PAYMENT_CANCELED
```

The orchestrator is the only component that should translate participant
results into the next checkout command.

Recommended saga persistence:

```text
t_payment_saga
  saga_id
  order_id
  payment_id
  customer_id
  idempotency_key
  state
  last_event_id
  failure_reason
  retry_count
  created_at
  updated_at

unique(order_id)
unique(customer_id, idempotency_key)
```

Every command should include a stable command id or external reference so a
participant can safely ignore duplicate command delivery.

Current payment session state persisted by payment-service:

```text
payment_id
order_id
customer_id
amount
method
status
session_status
payment_url
client_secret
provider
provider_session_id
session_expires_at
idempotency_key
created_at
updated_at
```

Current session statuses:

```text
READY
COMPLETED
FAILED
```

An async implementation may also use:

```text
CREATING
```

Current payment statuses:

```text
PENDING
SUCCESS
FAILED
```

Recommended async result events:

```text
PAYMENT_SESSION_READY
PAYMENT_SESSION_FAILED
PAYMENT_SETTLED
PAYMENT_FAILED
```

## Finalization

For provider completion, keep the current finalization contract:

```http
POST /api/payments/webhooks/mock-provider
PATCH /api/payments/{paymentId}/status
```

On `SUCCESS`, payment-service/saga orchestrator credits shop wallets and sends
the order confirmation command:

```http
POST /api/order/{orderId}/confirm-paid
```

On `FAILED`, payment-service/saga orchestrator sends the cancel command when
the order should be canceled:

```http
POST /api/order/{orderId}/cancel-payment
```

## Idempotency Requirements

Broker delivery can be duplicated.

Payment request handling, saga orchestration, and participant command handling
must all be idempotent:

```text
If payment/request exists by customerId + idempotencyKey:
  return existing request/payment state
Else if active PENDING payment exists for orderId:
  return existing payment/session
Else:
  accept request or create payment/session/saga
```

Current persistence already supports:

```text
t_order.idempotency_key
unique index: t_order(customer_id, idempotency_key)

t_payment.idempotency_key
unique index: t_payment(customer_id, idempotency_key)
index: t_payment(order_id, status)
```

Recommended hardening:

```text
unique(order_id) where status = PENDING
unique(customer_id, idempotency_key) for payment requests if stored separately
```

Wallet settlement must also remain idempotent:

```text
customer debit externalRef = paymentId
shop credit externalRef = paymentId:shopId
```

## SSE Design

Frontend opens SSE after the customer clicks Pay and the payment request is
accepted:

```http
GET /api/orders/{orderId}/events
Authorization: Bearer ...
Accept: text/event-stream
```

SSE backend must validate:

- User is authenticated.
- User owns the order.
- User can only subscribe to their own order/payment events.

Recommended SSE events:

```text
event: payment-creating
data: {"orderId":"order-id"}

event: payment-session-ready
data: {"orderId":"order-id","paymentId":"payment-id"}

event: payment-session-failed
data: {"orderId":"order-id","paymentId":"payment-id"}

event: payment-settled
data: {"orderId":"order-id","paymentId":"payment-id"}

event: payment-failed
data: {"orderId":"order-id","paymentId":"payment-id"}
```

Avoid sending `clientSecret` through SSE unless necessary.

Preferred pattern:

```text
SSE says state changed.
FE calls authenticated GET /api/payments?orderId=... to fetch paymentUrl/clientSecret/status.
```

This is safer and gives fallback behavior after refresh or disconnect.

## Frontend Behavior

After order checkout response:

```json
{
  "order": {
    "id": "order-id",
    "status": "PENDING_PAYMENT"
  }
}
```

FE navigates to:

```text
/payments/checkout?orderId=order-id&method=CARD
```

Payment page behavior:

```text
1. Load GET /api/order/{orderId}.
2. Show order total and selected payment method.
3. Wait for the customer to click Pay.
4. POST /api/payments/async with orderId and method.
5. Open SSE for orderId or start polling.
6. If payment-session-ready:
   - call GET /api/payments?orderId=...
   - redirect to payment.paymentUrl or show provider/mock controls for CARD/MANUAL.
7. If payment-settled:
   - redirect to paid order detail for BALANCE.
8. If payment-session-failed or payment-failed:
   - show Retry payment or cancel order.
9. If SSE disconnects:
   - reconnect.
10. If no event after timeout:
   - poll GET /api/payments?orderId=...
```

The frontend calls the payment request API only after the customer clicks Pay.
It does not create payment during order checkout.

## Recovery API

SSE is not guaranteed delivery. The browser can refresh or disconnect.

Use the current payment query endpoint:

```http
GET /api/payments?orderId={orderId}
Authorization: Bearer ...
```

Possible responses:

No accepted/created payment yet:

```json
[]
```

Payment request accepted and creating:

```json
[
  {
    "id": "payment-id",
    "orderId": "order-id",
    "method": "CARD",
    "status": "PENDING",
    "sessionStatus": "CREATING",
    "paymentUrl": null,
    "clientSecret": null
  }
]
```

Session ready:

```json
[
  {
    "id": "payment-id",
    "orderId": "order-id",
    "method": "CARD",
    "status": "PENDING",
    "sessionStatus": "READY",
    "paymentUrl": "http://localhost:3004/payments/checkout?...",
    "clientSecret": "mock_cs_..."
  }
]
```

Wallet settled:

```json
[
  {
    "id": "payment-id",
    "orderId": "order-id",
    "method": "BALANCE",
    "status": "SUCCESS",
    "sessionStatus": "COMPLETED",
    "paymentUrl": null,
    "clientSecret": null
  }
]
```

Session failed:

```json
[
  {
    "id": "payment-id",
    "orderId": "order-id",
    "status": "FAILED",
    "sessionStatus": "FAILED",
    "paymentUrl": null,
    "clientSecret": null
  }
]
```

The order remains the source of truth for final checkout state:

```http
GET /api/order/{orderId}
Authorization: Bearer ...
```

## Retry and Timeout Policy

Payment saga orchestrator should not hang forever on provider or wallet calls.

Recommended policy:

```text
Provider timeout: 5-10 seconds
Retries: 2-3 attempts
Backoff: exponential
Final provider session state: FAILED
```

If payment creation fails:

```text
payment.session_status = FAILED
payment.status = FAILED when no retry should continue
publish PAYMENT_SESSION_FAILED or PAYMENT_FAILED
optionally send CANCEL_ORDER_PAYMENT_COMMAND
FE shows Retry payment or canceled order state
```

Retry payment endpoint options:

```text
POST /api/payments/session/retry
POST /api/payments/async
```

Retries must use idempotency keys so provider sessions, wallet debits, and shop
credits are not duplicated.

For `BALANCE`, failed wallet debit/credit should not double-move money on retry.
Keep using wallet `externalRef` values based on `paymentId`.

## Limits and Tradeoffs

### Benefits

- Order checkout returns as soon as the order is committed.
- Customer intent to pay is explicit and separate from order creation.
- Slow provider and wallet calls do not block the customer Pay request.
- Payment creation can be retried independently.
- FE can show real-time payment progress.
- The broker/SSE architecture remains the async notification path.
- The payment saga has one explicit owner for workflow decisions.

### Limits

- System becomes eventually consistent.
- FE must handle waiting, timeout, refresh, and reconnect states.
- SSE is not durable; polling fallback is still required.
- More infrastructure is needed: outbox publisher, payment saga orchestrator,
  participant command handlers, and customer realtime backend.
- Duplicate broker events must be handled safely.
- Payment session data must be persisted; events alone are not enough.
- Inventory can remain reserved if the customer never clicks Pay or if async payment creation fails.
- Add cancel/expiration tooling for stale `PENDING_PAYMENT` orders.
- Current payment-service does not yet include an async saga orchestrator or
  broker consumer.

## Recommended Production Rule

Use the saga database and service databases as source of truth. Use broker/SSE
for delivery and notification, not as the only source of truth.

Source of truth:

```text
payment saga database + order database + payment database + wallet database
```

Notification path:

```text
outbox/broker + SSE
```

Frontend recovery path:

```text
GET /api/payments?orderId=...
GET /api/order/{orderId}
```
