# API Reference

Use the API gateway at `http://localhost:9000` for normal client traffic. The gateway forwards each `/api/...` path to the matching service and exposes aggregated OpenAPI docs under `/aggregate/{service-name}/v3/api-docs`.

| Service | Local URL | Gateway paths | OpenAPI docs |
| --- | --- | --- | --- |
| product-service | `http://localhost:8080` | `/api/product/**`, `/api/categories/**` | `/aggregate/product-service/v3/api-docs` |
| order-service | `http://localhost:8081` | `/api/order/**` | `/aggregate/order-service/v3/api-docs` |
| inventory-service | `http://localhost:8082` | `/api/inventory/**` | `/aggregate/inventory-service/v3/api-docs` |
| notification-service | `http://localhost:8083` | No REST controller; consumes order events | N/A |
| payment-service | `http://localhost:8085` | `/api/payments/**` | `/aggregate/payment-service/v3/api-docs` |
| shop-service | `http://localhost:8086` | `/api/shops/**` | `/aggregate/shop-service/v3/api-docs` |
| customer-service | `http://localhost:8087` | `/api/customers/**` | `/aggregate/customer-service/v3/api-docs` |

Gateway security permits Swagger/OpenAPI and Prometheus endpoints without authentication. Other API calls require JWT authentication through the gateway. Customer endpoints accept customer-issuer tokens or admin tokens with the `admin` realm role; shop endpoints accept shop-issuer tokens or admin tokens; all other API endpoints require an authenticated JWT.

## Product Service

### Products

| Method | Path | Status | Request body | Response | Access/notes |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/product` | `201 Created` | `ProductRequestDto` | `ProductResponseVo` | - shop
| `PUT` | `/api/product` | `200 OK` | `ProductRequestDto` | `ProductResponseVo` | - shop (own products only)
| `POST` | `/api/product/images/presign` | `201 Created` | `ProductImagePresignRequestDto` | `ProductImagePresignResponseVo` | - shop
| `GET`  | `/api/product` | `200 OK`      | None | `ProductResponseVo[]` | - admin + customer + shop (only own products) |
| `GET`  | `/api/product/{productId}` | `200 OK` | `productId` path `UUID` | `ProductResponseVo` | - admin + customer + shop |

`ProductRequestDto`

`shopId` is resolved from the bearer token.
```json
{
  "id": "UUID (required for update only)",
  "name": "string",
  "description": "string",
  "price": 0,
  "imageUrl": "string",
  "categoryId": "UUID",
  "status": "DRAFT | ACTIVE | ARCHIVED"
}
```

`ProductResponseVo`

```json
{
  "id": "UUID",
  "shopId": "UUID",
  "name": "string",
  "description": "string",
  "price": 0,
  "imageUrl": "string",
  "categoryId": "UUID",
  "categoryName": "string",
  "status": "DRAFT | ACTIVE | ARCHIVED",
  "createdAt": "Instant",
  "updatedAt": "Instant",
  "deletedAt": "Instant"
}
```

`ProductImagePresignRequestDto`

```json
{
  "fileName": "string",
  "contentType": "image/jpeg | image/png | image/webp | image/gif",
  "size": 0
}
```

`ProductImagePresignResponseVo`

```json
{
  "objectName": "string",
  "uploadUrl": "string",
  "imageUrl": "string",
  "contentType": "string",
  "maxSize": 5242880,
  "expiresInSeconds": 900
}
```

### Categories

| Method | Path | Status | Request body | Response | Access/notes |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/categories` | `201 Created` | `CategoryRequestDto` | `CategoryResponseVo` | - admin only
| `GET` | `/api/categories` | `200 OK` | None | `CategoryResponseVo[]` | - shop + customer + admin

`CategoryRequestDto`

```json
{
  "name": "string",
  "parentId": "UUID"
}
```

`CategoryResponseVo`

```json
{
  "id": "UUID",
  "name": "string",
  "parentId": "UUID",
  "createdAt": "Instant",
  "updatedAt": "Instant"
}
```

## Inventory Service

| Method | Path | Status | Params | Request body | Response | Access/notes |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/api/inventory/attributes` | `201 Created` | None | `AttributeRequestDto` | `AttributeResponseVo` | - shop (own products only) (creates one attribute with its values)
| `GET` | `/api/inventory/attributes` | `200 OK` | `productId` query `UUID` | None | `AttributeResponseVo[]` | - shop + customer + admin (only attributes for the specified product)
| `POST` | `/api/inventory/skus` | `201 Created` | None | `SkuRequestDto` | `SkuResponseVo` | - shop (own products only) (I want to adjust this to allow creating multiple SKUs at once, but for now it only creates one SKU at a time)
| `POST` | `/api/inventory/reserve` | `204 No Content` | None | `InventoryReserveRequestDto` | None | - service/internal stock reservation
| `POST` | `/api/inventory/deduct` | `204 No Content` | None | `InventoryDeductRequestDto` | None | - service/internal stock deduction; currently uses the reserve flow without an order id
| `POST` | `/api/inventory/release` | `204 No Content` | None | `InventoryReleaseRequestDto` | None | - service/internal reservation release
| `GET` | `/api/inventory/skus` | `200 OK` | `productId` query `UUID` | None | `SkuResponseVo[]` | - shop + customer + admin (only SKUs for the specified product)
| `GET` | `/api/inventory/skus/{skuCode}` | `200 OK` | `skuCode` path `string` | None | `SkuResponseVo` | - shop + customer + admin
| `GET` | `/api/inventory/stock-check` | `200 OK` | `skuCode` query `string`, `quantity` query `integer` | None | `InventoryCheckResponseVo` | - shop + customer + admin

`AttributeRequestDto`

```json
{
  "productId": "UUID",
  "code": "string",
  "name": "string",
  "values": [
    {
      "value": "string",
      "sortOrder": 0
    }
  ]
}
```

`SkuRequestDto`

```json
{
  "productId": "UUID",
  "skuCode": "string",
  "priceOverride": 0,
  "attributeValueIds": ["UUID"],
  "quantity": 0
}
```

`InventoryReserveRequestDto`

```json
{
  "orderId": "UUID",
  "items": [
    {
      "skuId": "UUID",
      "quantity": 1
    }
  ]
}
```

`InventoryDeductRequestDto`

```json
{
  "items": [
    {
      "skuId": "UUID",
      "quantity": 1
    }
  ]
}
```

`InventoryReleaseRequestDto`

```json
{
  "orderId": "UUID"
}
```

Response models:

- `AttributeResponseVo`: `id`, `productId`, `code`, `name`, `values`, `createdAt`, `updatedAt`
- `AttributeValueResponseVo`: `id`, `attributeId`, `value`, `sortOrder`
- `SkuResponseVo`: `id`, `productId`, `skuCode`, `priceOverride`, `quantity`, `attributeValueIds`, `createdAt`, `updatedAt`
- `InventoryCheckResponseVo`: `skuCode`, `requestedQuantity`, `inStock`

## Order Service

| Method | Path | Status | Params | Request body | Response | Access/notes |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/api/order` | `201 Created` | None | `OrderCreateRequestDto` | `OrderResponseVo` | - customer only
| `POST` | `/api/order/checkout` | `201 Created` | None | `CheckoutCreateRequestDto` | `CheckoutResponseVo` | - customer only; creates/reuses an order and creates/recovers a pending payment
| `POST` | `/api/order/{orderId}/confirm-paid` | `200 OK` | `orderId` path `UUID` | None | `OrderResponseVo` | - payment-service/internal callback; marks pending order as paid
| `POST` | `/api/order/{orderId}/cancel-payment` | `200 OK` | `orderId` path `UUID` | None | `OrderResponseVo` | - payment-service/internal callback; cancels pending order and releases reserved stock
| `GET` | `/api/order` | `200 OK` | Optional `customerId` query `UUID` | None | `OrderResponseVo[]` | - customer (only own orders) + shop (only orders containing their products) + admin (all orders)
| `GET` | `/api/order/{orderId}` | `200 OK` | `orderId` path `UUID` | None | `OrderResponseVo` | - customer (only own order)

`OrderCreateRequestDto`

`customerId` and notification customer details are resolved from the bearer token. Item `skuId`, `productId`, `shopId`, and `price` are resolved server-side from `skuCode`.
```json
{
  "status": "PENDING | PAID | CANCELED",
  "items": [
    {
      "skuCode": "string",
      "quantity": 0
    }
  ]
}
```

`OrderResponseVo`: `id`, `orderNumber`, `customerId`, `status`, `totalAmount`, `items`, `createdAt`, `updatedAt`

`OrderItemResponseVo`: `id`, `skuId`, `productId`, `shopId`, `price`, `quantity`

`CheckoutCreateRequestDto`

```json
{
  "paymentMethod": "BALANCE | CARD | MANUAL",
  "items": [
    {
      "skuCode": "string",
      "quantity": 1
    }
  ]
}
```

`CheckoutResponseVo`: `order`, `payment`

## Payment Service

| Method | Path | Status | Params | Request body | Response | Access/notes |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/api/payments` | `201 Created` | None | `PaymentCreateRequestDto` | `PaymentResponseVo` | - customer only
| `POST` | `/api/payments/webhooks/mock-provider` | `200 OK` | Optional `X-Mock-Provider-Secret` header | `PaymentProviderWebhookRequestDto` | `PaymentResponseVo` | - mock payment provider callback
| `PATCH` | `/api/payments/{paymentId}/status` | `200 OK` | `paymentId` path `UUID` | `PaymentStatusUpdateRequestDto` | `PaymentResponseVo` | - customer only (only own payments) + admin (all payments) + shop (only payments for their orders)
| `GET` | `/api/payments` | `200 OK` | Optional `customerId` query `UUID`, optional `orderId` query `UUID` | None | `PaymentResponseVo[]` | - customer (only own payments) + shop (only payments for their orders) + admin (all payments)
| `GET` | `/api/payments/{paymentId}/history` | `200 OK` | `paymentId` path `UUID` | None | `PaymentHistoryResponseVo[]` | - customer (only own payments) + shop (only payments for their orders) + admin (all payments)

`PaymentCreateRequestDto`

`customerId` is resolved from the bearer token. `amount` and initial `status` are resolved from the order.
```json
{
  "orderId": "UUID",
  "method": "BALANCE | CARD | MANUAL"
}
```

`PaymentStatusUpdateRequestDto`

```json
{
  "status": "PENDING | SUCCESS | FAILED"
}
```

`PaymentProviderWebhookRequestDto`

```json
{
  "paymentId": "UUID",
  "providerSessionId": "string",
  "clientSecret": "string",
  "status": "SUCCESS | FAILED",
  "eventId": "string"
}
```

`PaymentResponseVo`: `id`, `customerId`, `orderId`, `amount`, `method`, `status`, `sessionStatus`, `paymentUrl`, `clientSecret`, `createdAt`, `updatedAt`

`PaymentHistoryResponseVo`: `id`, `customerId`, `paymentId`, `type`, `amount`, `createdAt`

Payment history `type` values are `TOPUP`, `PURCHASE`, and `REFUND`.

## Customer Service

| Method | Path | Status | Params | Request body | Response | Access/notes |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/api/customers/me/sync` | `200 OK` | None | None | `CustomerResponseVo` | - customer login sync; uses bearer token claims, creates auth/profile/wallet if missing, no-op if already synced
| `PATCH` | `/api/customers/{customerId}/status` | `200 OK` | `customerId` path `UUID` | `CustomerStatusUpdateRequestDto` | `CustomerResponseVo` | - admin
| `PATCH` | `/api/customers/{customerId}/wallet` | `200 OK` | `customerId` path `UUID` | `CustomerWalletUpdateRequestDto` | `CustomerResponseVo` | - user (only own wallet) + admin (all wallets)
| `GET` | `/api/customers` | `200 OK` | None | None | `CustomerResponseVo[]` | - admin only
| `GET` | `/api/customers/{customerId}` | `200 OK` | `customerId` path `UUID` | None | `CustomerResponseVo` | - user (only own profile) + admin (all profiles)

`CustomerStatusUpdateRequestDto`

```json
{
  "status": "ACTIVE | LOCKED"
}
```

`CustomerWalletUpdateRequestDto`

```json
{
  "balance": 0,
  "currency": "string"
}
```

`CustomerResponseVo`: `authId`, `email`, `status`, `customerId`, `firstName`, `lastName`, `phone`, `balance`, `currency`, `authCreatedAt`, `authUpdatedAt`, `profileCreatedAt`, `profileUpdatedAt`, `walletUpdatedAt`

## Shop Service

| Method | Path | Status | Params | Request body | Response | Access/notes |
| --- | --- | --- | --- | --- | --- | --- |
| `POST` | `/api/shops/me/sync` | `200 OK` | None | None | `ShopResponseVo` | - shop login sync; uses bearer token claims, creates auth/profile/wallet if missing, no-op if already synced
| `PATCH` | `/api/shops/{shopId}/status` | `200 OK` | `shopId` path `UUID` | `ShopStatusUpdateRequestDto` | `ShopResponseVo` | - admin
| `PATCH` | `/api/shops/{shopId}/wallet` | `200 OK` | `shopId` path `UUID` | `ShopWalletUpdateRequestDto` | `ShopResponseVo` | - shop (only own wallet) + admin (all wallets)
| `GET` | `/api/shops` | `200 OK` | None | None | `ShopResponseVo[]` | - admin only
| `GET` | `/api/shops/{shopId}` | `200 OK` | `shopId` path `UUID` | None | `ShopResponseVo` | - shop (only own profile) + admin (all profiles)

`ShopStatusUpdateRequestDto`

```json
{
  "status": "ACTIVE | LOCKED"
}
```

`ShopWalletUpdateRequestDto`

```json
{
  "balance": 0,
  "currency": "string"
}
```

`ShopResponseVo`: `authId`, `email`, `status`, `shopId`, `shopName`, `ownerName`, `phone`, `balance`, `currency`, `authCreatedAt`, `authUpdatedAt`, `profileCreatedAt`, `profileUpdatedAt`, `walletUpdatedAt`

## POST and PUT Success/Failure Cases

Failure response format notes:

- Gateway authentication/authorization failures can happen before requests reach a service. Expect `401 Unauthorized` for missing/invalid JWT and `403 Forbidden` for insufficient role/scope.
- Mutation failures use `ApiErrorResponseVo`: `timestamp`, `status`, `error`, `message`, `detail`, `path`.
- Invalid JSON, invalid UUID path/query values, or missing required headers can return Spring MVC `400 Bad Request` before service code runs.

### Product Service Mutations

#### `POST /api/product`

Success `201 Created`: creates a product owned by the shop id resolved from the bearer token and returns `ProductResponseVo`.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `400 Bad Request` | `Product request is required` | Request body is missing. |
| `400 Bad Request` | `Category not found` | `categoryId` does not match an existing category. |
| `400 Bad Request` | `Invalid product status` | `status` is not one of `DRAFT`, `ACTIVE`, or `ARCHIVED`. |
| `400 Bad Request` | `Token user id must be a UUID` | Token user id claim cannot be parsed as a UUID. |
| `400 Bad Request` | `Missing token claim: ...` | Required user id claim is missing from the token. |
| `400 Bad Request` | `Unable to read token claims` | Token payload cannot be decoded/read. |
| `401 Unauthorized` | `Missing bearer token` | `Authorization` header is missing or does not start with `Bearer `. |
| `401 Unauthorized` | `Invalid bearer token` | Bearer token structure or payload is invalid. |

#### `PUT /api/product`

Success `200 OK`: updates an existing product owned by the current shop and returns `ProductResponseVo`.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `400 Bad Request` | `Product request is required` | Request body is missing. |
| `400 Bad Request` | `Product id is required` | Request body `id` is missing. |
| `400 Bad Request` | `Category not found` | `categoryId` does not match an existing category. |
| `400 Bad Request` | `Invalid product status` | `status` is not one of `DRAFT`, `ACTIVE`, or `ARCHIVED`. |
| `400 Bad Request` | `Token user id must be a UUID` | Token user id claim cannot be parsed as a UUID. |
| `400 Bad Request` | `Missing token claim: ...` | Required user id claim is missing from the token. |
| `400 Bad Request` | `Unable to read token claims` | Token payload cannot be decoded/read. |
| `401 Unauthorized` | `Missing bearer token` | `Authorization` header is missing or does not start with `Bearer `. |
| `401 Unauthorized` | `Invalid bearer token` | Bearer token structure or payload is invalid. |
| `403 Forbidden` | `Product does not belong to current shop` | Product exists but is owned by a different shop. |
| `404 Not Found` | `Product not found` | Request body `id` does not match an existing product. |

#### `POST /api/product/images/presign`

Success `201 Created`: creates a 15-minute presigned MinIO upload URL and returns `ProductImagePresignResponseVo`.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `400 Bad Request` | `Image upload request is required` | Request body is missing. |
| `400 Bad Request` | `Image file must be 5 MB or smaller` | `size` is `0`, negative, or larger than the configured max size. |
| `400 Bad Request` | `Only JPEG, PNG, WEBP, or GIF images are supported` | `contentType` is missing or unsupported. |
| `400 Bad Request` | `Token user id must be a UUID` | Token user id claim cannot be parsed as a UUID. |
| `400 Bad Request` | `Missing token claim: ...` | Required user id claim is missing from the token. |
| `401 Unauthorized` | `Missing bearer token` | `Authorization` header is missing or does not start with `Bearer `. |
| `401 Unauthorized` | `Invalid bearer token` | Bearer token structure or payload is invalid. |
| `500 Internal Server Error` | `Unable to create product image upload URL` | MinIO bucket creation or presigned URL generation fails. |

#### `POST /api/categories`

Success `201 Created`: creates a category and returns `CategoryResponseVo`.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `400 Bad Request` | `Category request is required` | Request body is missing. |
| `400 Bad Request` | `Parent category not found` | `parentId` is provided but does not match an existing category. |
| `401 Unauthorized` | Gateway/auth error | Missing or invalid JWT. |
| `403 Forbidden` | Gateway/auth error | Authenticated caller is not allowed to create categories. |

### Inventory Service Mutations

#### `POST /api/inventory/attributes`

Success `201 Created`: creates one attribute and all requested values, then returns `AttributeResponseVo`.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `400 Bad Request` | `Attribute request is required` | Request body is missing. |
| `400 Bad Request` | `Product id is required` | `productId` is missing. |
| `400 Bad Request` | `Attribute code is required` | `code` is missing or blank. |
| `400 Bad Request` | `Attribute name is required` | `name` is missing or blank. |
| `400 Bad Request` | `Attribute values are required` | `values` is missing or empty. |
| `400 Bad Request` | `Attribute value is required` | Any value item is null or has a blank `value`. |
| `409 Conflict` | `Attribute code already exists for product` | The same attribute `code` already exists for the product. |

#### `POST /api/inventory/skus`

Success `201 Created`: creates one SKU, maps selected attribute values, creates inventory with the requested quantity, and returns `SkuResponseVo`.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `400 Bad Request` | `SKU request is required` | Request body is missing. |
| `400 Bad Request` | `Product id is required` | `productId` is missing. |
| `400 Bad Request` | `SKU code is required` | `skuCode` is missing or blank. |
| `400 Bad Request` | `At least one attribute value is required` | `attributeValueIds` is missing or empty. |
| `400 Bad Request` | `Only one value can be selected for each attribute` | Duplicate selected ids or multiple values from the same attribute are supplied. |
| `400 Bad Request` | `Quantity must be zero or greater` | `quantity` is missing or negative. |
| `400 Bad Request` | `One or more attribute values were not found` | Any `attributeValueIds` entry does not exist. |
| `400 Bad Request` | `Attribute value does not belong to product` | A selected attribute value belongs to another product. |
| `409 Conflict` | `A SKU with the same attribute values already exists: {skuCode}` | Another SKU for the product already uses exactly the same attribute value set. |

#### `POST /api/inventory/reserve`

Success `204 No Content`: reserves stock by decrementing inventory. If `orderId` already has the same reservation, the call is idempotent and returns `204 No Content`.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `400 Bad Request` | `At least one inventory item is required` | Request body is missing or `items` is missing/empty. |
| `400 Bad Request` | `SKU id is required` | Any item is null or has no `skuId`. |
| `400 Bad Request` | `Quantity must be greater than zero` | Any item has missing, zero, or negative `quantity`. |
| `404 Not Found` | `Inventory not found for SKU` | A requested `skuId` has no inventory row. |
| `409 Conflict` | `Insufficient stock for skuId {skuId}` | Current stock is lower than requested quantity. |
| `409 Conflict` | `Existing reservation does not match requested inventory` | Same `orderId` was already reserved with different SKU/quantity values. |

#### `POST /api/inventory/deduct`

Success `204 No Content`: decrements inventory for the provided SKU quantities. Current implementation delegates to the reserve flow without an `orderId`.

Failure cases are the same as `POST /api/inventory/reserve`, except reservation-idempotency conflict does not apply because no `orderId` is sent.

#### `POST /api/inventory/release`

Success `204 No Content`: releases all reservations for `orderId` by adding reserved quantities back to inventory. If no reservation exists, it is a no-op and still returns `204 No Content`.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `400 Bad Request` | `Order id is required` | Request body is missing or `orderId` is missing. |
| `404 Not Found` | `Inventory not found for SKU` | A reservation exists but its SKU inventory row cannot be found. |

### Order Service Mutations

#### `POST /api/order`

Success `201 Created`: creates an order for the current customer, resolves SKU/product/shop/price server-side, reserves inventory, emits `OrderPlacedEvent`, and returns `OrderResponseVo`. If the same customer sends the same non-blank `Idempotency-Key`, the existing order is returned.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `400 Bad Request` | `At least one order item is required` | `items` is missing or empty. |
| `400 Bad Request` | `SKU code is required` | Any item has missing or blank `skuCode`. |
| `400 Bad Request` | `Quantity must be greater than zero` | Any item has missing, zero, or negative `quantity`. |
| `400 Bad Request` | `Token user id must be a UUID` | Token user id claim cannot be parsed as a UUID. |
| `400 Bad Request` | `Missing token claim: ...` | Required customer token claim is missing. |
| `400 Bad Request` | `Unable to read token claims` | Token payload cannot be decoded/read. |
| `401 Unauthorized` | `Missing bearer token` | `Authorization` header is missing or does not start with `Bearer `. |
| `401 Unauthorized` | `Invalid bearer token` | Bearer token structure or payload is invalid. |
| `404 Not Found` | Upstream message such as `SKU not found` or `Product not found` | Inventory or product lookup fails while resolving an order item. |
| `409 Conflict` | Upstream inventory message such as `Insufficient stock for skuId {skuId}` | Inventory reservation fails. |

#### `POST /api/order/checkout`

Success `201 Created`: creates/reuses an order, creates or recovers a pending payment, and returns `CheckoutResponseVo` with both `order` and `payment`.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `400 Bad Request` | `At least one checkout item is required` | `items` is missing or empty. |
| `400 Bad Request` | Order validation messages | Item validation fails in the order creation flow. |
| `400 Bad Request` | Payment validation messages | Payment creation fails validation, such as invalid payment method. |
| `401 Unauthorized` | Token/auth messages | Customer token is missing or invalid. |
| `404 Not Found` | Upstream lookup messages | SKU, product, order, or payment lookup fails. |
| `409 Conflict` | Upstream inventory/order/payment messages | Inventory reservation or payment/order state transition conflicts. |

#### `POST /api/order/{orderId}/confirm-paid`

Success `200 OK`: marks a pending order as `PAID` and returns `OrderResponseVo`. If the order is already `PAID`, it returns the current order without changing it.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `404 Not Found` | `Order not found` | `orderId` does not match an existing order. |
| `409 Conflict` | `Canceled order cannot be confirmed as paid` | Order is already `CANCELED`. |

#### `POST /api/order/{orderId}/cancel-payment`

Success `200 OK`: marks a pending order as `CANCELED`, releases reserved inventory, and returns `OrderResponseVo`. If the order is already `CANCELED`, it returns the current order without changing it.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `404 Not Found` | `Order not found` | `orderId` does not match an existing order. |
| `409 Conflict` | `Paid order cannot be canceled` | Order is already `PAID`. |
| `404 Not Found` | Upstream inventory message such as `Inventory not found for SKU` | Inventory release fails. |

### Payment Service Mutations

#### `POST /api/payments`

Success `201 Created`: creates a pending payment for the current customer order, initializes mock provider session fields, creates purchase history, and returns `PaymentResponseVo`. If a non-blank `Idempotency-Key` or existing pending payment matches, the existing payment is returned.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `400 Bad Request` | `Order id is required` | `orderId` is missing. |
| `400 Bad Request` | `Payment method is required` | `method` is missing or blank. |
| `400 Bad Request` | `Invalid payment method` | `method` is not `BALANCE`, `CARD`, or `MANUAL`. |
| `400 Bad Request` | `Token user id must be a UUID` | Token user id claim cannot be parsed as a UUID. |
| `400 Bad Request` | `Missing token claim: ...` | Required user id claim is missing from the token. |
| `400 Bad Request` | `Unable to read token claims` | Token payload cannot be decoded/read. |
| `401 Unauthorized` | `Missing bearer token` | `Authorization` header is missing or does not start with `Bearer `. |
| `401 Unauthorized` | `Invalid bearer token` | Bearer token structure or payload is invalid. |
| `403 Forbidden` | `Order does not belong to current customer` | Order exists but belongs to another customer. |
| `404 Not Found` | Upstream message such as `Order not found` | Order lookup fails. |

#### `POST /api/payments/webhooks/mock-provider`

Success `200 OK`: validates the mock-provider callback, finalizes a pending payment as `SUCCESS` or `FAILED`, updates payment history, calls the order service to confirm or cancel the order, and returns `PaymentResponseVo`. If the payment already has the same final status, the current payment is returned.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `400 Bad Request` | `Webhook request is required` | Request body is missing. |
| `400 Bad Request` | `Payment id or provider session id is required` | Neither `paymentId` nor `providerSessionId` is provided. |
| `400 Bad Request` | `Webhook status is required` | `status` is missing or blank. |
| `400 Bad Request` | `Invalid payment status` | `status` is not `PENDING`, `SUCCESS`, or `FAILED`. |
| `400 Bad Request` | `Webhook status must be SUCCESS or FAILED` | Webhook sends `PENDING`. |
| `400 Bad Request` | `Provider session does not match payment` | Supplied `providerSessionId` does not match the payment. |
| `400 Bad Request` | `Client secret does not match payment` | Supplied `clientSecret` does not match the payment. |
| `401 Unauthorized` | `Invalid webhook secret` | `payment.webhook.mock-secret` is configured and `X-Mock-Provider-Secret` does not match. |
| `404 Not Found` | `Payment not found` | Payment lookup by `paymentId` or `providerSessionId` fails. |
| `409 Conflict` | `Payment has already been finalized` | Payment is not pending and the webhook tries to change it to a different final status. |
| `404 Not Found` | Upstream order message such as `Order not found` | Order confirm/cancel callback fails. |
| `409 Conflict` | Upstream order message | Order cannot transition to the requested state. |

### Customer Service Mutations

#### `POST /api/customers/me/sync`

Success `200 OK`: reads customer claims from the bearer token, returns the existing customer if already synced, or creates auth/profile/wallet records with default `ACTIVE` status, `0` balance, and `USD` currency.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `400 Bad Request` | `Token subject must be a UUID` | Token `sub` or `user_id` claim cannot be parsed as a UUID. |
| `400 Bad Request` | `Missing token claim: sub or user_id` | Token has no usable subject/user id claim. |
| `400 Bad Request` | `Missing token claim: email` | Token has no usable email claim. |
| `400 Bad Request` | `Unable to read token claims` | Token payload cannot be decoded/read. |
| `401 Unauthorized` | `Missing bearer token` | `Authorization` header is missing or does not start with `Bearer `. |
| `401 Unauthorized` | `Invalid bearer token` | Bearer token structure or payload is invalid. |
| `409 Conflict` | `Customer email already exists for another auth id` | A different auth id already owns the email in the token. |

### Shop Service Mutations

#### `POST /api/shops/me/sync`

Success `200 OK`: reads shop claims from the bearer token, returns the existing shop if already synced, or creates auth/profile/wallet records with default `ACTIVE` status, `0` balance, and `USD` currency.

Failure cases:

| Status | Message | When |
| --- | --- | --- |
| `400 Bad Request` | `Token subject must be a UUID` | Token `sub` or `user_id` claim cannot be parsed as a UUID. |
| `400 Bad Request` | `Missing token claim: sub or user_id` | Token has no usable subject/user id claim. |
| `400 Bad Request` | `Missing token claim: email` | Token has no usable email claim. |
| `400 Bad Request` | `Unable to read token claims` | Token payload cannot be decoded/read. |
| `401 Unauthorized` | `Missing bearer token` | `Authorization` header is missing or does not start with `Bearer `. |
| `401 Unauthorized` | `Invalid bearer token` | Bearer token structure or payload is invalid. |
| `409 Conflict` | `Shop email already exists for another auth id` | A different auth id already owns the email in the token. |
