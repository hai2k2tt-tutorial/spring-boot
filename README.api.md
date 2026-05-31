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

| Method | Path | Status        | Request body | Response |
|--------| --- |---------------| --- | --- |
| `POST` | `/api/product` | `201 Created` | `ProductRequestDto` | `ProductResponseVo` | - shop
| `put`  | `/api/product` | `200 updated` | `ProductRequestDto` | `ProductResponseVo` | - shop (own products only)
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
  "status": "DRAFT | ACTIVE | ARCHIVED",
  "createdAt": "Instant",
  "updatedAt": "Instant"
}
```

### Categories

| Method | Path | Status | Request body | Response |
| --- | --- | --- | --- | --- |
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

| Method | Path | Status | Params | Request body | Response |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/inventory/attributes` | `201 Created` | None | `AttributeRequestDto` | `AttributeResponseVo` | - shop (own products only) (I want to adjust this to allow creating multiple attributes at once, but for now it only creates one attribute at a time)
| `POST` | `/api/inventory/attributes/{attributeId}/values` | `201 Created` | `attributeId` path `UUID` | `AttributeValueRequestDto` | `AttributeValueResponseVo` | - shop (own products only) (I want to adjust this to update many values at once, but for now it only creates one value at a time)
| `GET` | `/api/inventory/attributes` | `200 OK` | `productId` query `UUID` | None | `AttributeResponseVo[]` | - shop + customer + admin (only attributes for the specified product)
| `GET` | `/api/inventory/attributes/{attributeId}/values` | `200 OK` | `attributeId` path `UUID` | None | `AttributeValueResponseVo[]` | - shop + customer + admin (only values for the specified attribute)
| `POST` | `/api/inventory/skus` | `201 Created` | None | `SkuRequestDto` | `SkuResponseVo` | - shop (own products only) (I want to adjust this to allow creating multiple SKUs at once, but for now it only creates one SKU at a time)
| `GET` | `/api/inventory/skus` | `200 OK` | `productId` query `UUID` | None | `SkuResponseVo[]` | - shop + customer + admin (only SKUs for the specified product)
| `GET` | `/api/inventory/skus/{skuCode}` | `200 OK` | `skuCode` path `string` | None | `SkuResponseVo` | - shop + customer + admin
| `GET` | `/api/inventory/stock-check` | `200 OK` | `skuCode` query `string`, `quantity` query `integer` | None | `InventoryCheckResponseVo` | - shop + customer + admin

`AttributeRequestDto`

```json
{
  "productId": "UUID",
  "code": "string",
  "name": "string",
  "inputType": "SELECT | TEXT"
}
```

`AttributeValueRequestDto`

```json
{
  "value": "string",
  "sortOrder": 0
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

Response models:

- `AttributeResponseVo`: `id`, `productId`, `code`, `name`, `inputType`, `createdAt`, `updatedAt`
- `AttributeValueResponseVo`: `id`, `attributeId`, `value`, `sortOrder`
- `SkuResponseVo`: `id`, `productId`, `skuCode`, `priceOverride`, `quantity`, `attributeValueIds`, `createdAt`, `updatedAt`
- `InventoryCheckResponseVo`: `skuCode`, `requestedQuantity`, `inStock`

## Order Service

| Method | Path | Status | Params | Request body | Response |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/order` | `201 Created` | None | `OrderCreateRequestDto` | `OrderResponseVo` | - customer only
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

## Payment Service

| Method | Path | Status | Params | Request body | Response |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/payments` | `201 Created` | None | `PaymentCreateRequestDto` | `PaymentResponseVo` | - customer only
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

`PaymentResponseVo`: `id`, `customerId`, `orderId`, `amount`, `method`, `status`, `createdAt`, `updatedAt`

`PaymentHistoryResponseVo`: `id`, `customerId`, `paymentId`, `type`, `amount`, `createdAt`

Payment history `type` values are `TOPUP`, `PURCHASE`, and `REFUND`.

## Customer Service

| Method | Path | Status | Params | Request body | Response |
| --- | --- | --- | --- | --- | --- |
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

| Method | Path | Status | Params | Request body | Response |
| --- | --- | --- | --- | --- | --- |
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
