export type UUID = string;
export type Instant = string;

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type OrderStatus = "PENDING_PAYMENT" | "PENDING" | "PAID" | "CANCELED";
export type PaymentMethod = "BALANCE" | "CARD" | "MANUAL";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";
export type PaymentHistoryType = "TOPUP" | "PURCHASE" | "REFUND";
export type AccountStatus = "ACTIVE" | "LOCKED";

export interface ProductRequestDto {
  id?: UUID;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  categoryId?: UUID;
  status?: ProductStatus | string;
  skuCode?: string;
}

export interface ProductResponseVo {
  id?: UUID;
  shopId?: UUID;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  categoryId?: UUID;
  categoryName?: string;
  status?: ProductStatus | string;
  createdAt?: Instant;
  updatedAt?: Instant;
  deletedAt?: Instant;
  skuCode?: string;
}

export type Product = ProductResponseVo & { skuCode: string };

export interface CategoryRequestDto {
  name: string;
  parentId?: UUID;
}

export interface CategoryResponseVo {
  id: UUID;
  name: string;
  parentId?: UUID;
  createdAt: Instant;
  updatedAt: Instant;
}

export interface AttributeRequestDto {
  productId: UUID;
  code: string;
  name: string;
  values: AttributeValueRequestDto[];
}

export interface AttributeValueRequestDto {
  value: string;
  sortOrder: number;
}

export interface SkuRequestDto {
  productId: UUID;
  skuCode: string;
  priceOverride?: number;
  attributeValueIds: UUID[];
  quantity: number;
}

export interface AttributeResponseVo {
  id: UUID;
  productId: UUID;
  code: string;
  name: string;
  values: AttributeValueResponseVo[];
  createdAt: Instant;
  updatedAt: Instant;
}

export interface AttributeValueResponseVo {
  id: UUID;
  attributeId: UUID;
  value: string;
  sortOrder: number;
}

export interface SkuResponseVo {
  id: UUID;
  productId: UUID;
  skuCode: string;
  priceOverride?: number;
  quantity: number;
  attributeValueIds: UUID[];
  createdAt: Instant;
  updatedAt: Instant;
}

export interface InventoryCheckResponseVo {
  skuCode: string;
  requestedQuantity: number;
  inStock: boolean;
}

export interface Order {
  id?: number;
  orderNumber?: string;
  skuCode: string;
  quantity: number;
}

export interface OrderCreateRequestDto {
  items: OrderItemRequestDto[];
}

export interface OrderItemRequestDto {
  skuCode: string;
  quantity: number;
}

export interface OrderResponseVo {
  id: UUID;
  orderNumber: string;
  customerId: UUID;
  status: OrderStatus | string;
  totalAmount: number;
  items: OrderItemResponseVo[];
  createdAt: Instant;
  updatedAt: Instant;
}

export interface OrderItemResponseVo {
  id: UUID;
  skuId: UUID;
  productId: UUID;
  shopId: UUID;
  price: number;
  quantity: number;
}

export interface PaymentCreateRequestDto {
  orderId: UUID;
  method: PaymentMethod | string;
}

export interface CheckoutCreateRequestDto {
  items: OrderItemRequestDto[];
  paymentMethod: PaymentMethod | string;
}

export interface PaymentStatusUpdateRequestDto {
  status: PaymentStatus | string;
}

export interface PaymentProviderWebhookRequestDto {
  paymentId?: UUID;
  providerSessionId?: string;
  clientSecret?: string;
  status: PaymentStatus | string;
  eventId?: string;
}

export interface PaymentResponseVo {
  id: UUID;
  customerId: UUID;
  orderId: UUID;
  amount: number;
  method: PaymentMethod | string;
  status: PaymentStatus | string;
  sessionStatus?: string;
  paymentUrl?: string;
  payment_url?: string;
  clientSecret?: string;
  client_secret?: string;
  createdAt: Instant;
  updatedAt: Instant;
}

export interface OrderCheckoutResponseVo {
  order: OrderResponseVo;
  payment: PaymentResponseVo;
  paymentUrl?: string;
  clientSecret?: string;
}

export interface PaymentHistoryResponseVo {
  id: UUID;
  customerId: UUID;
  paymentId: UUID;
  type: PaymentHistoryType | string;
  amount: number;
  createdAt: Instant;
}

export interface CustomerStatusUpdateRequestDto {
  status: AccountStatus | string;
}

export interface CustomerWalletUpdateRequestDto {
  balance: number;
  currency: string;
}

export interface CustomerProfileUpdateRequestDto {
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface CustomerResponseVo {
  authId: UUID;
  email: string;
  status: AccountStatus | string;
  customerId: UUID;
  firstName: string;
  lastName: string;
  phone?: string;
  balance: number;
  currency: string;
  authCreatedAt: Instant;
  authUpdatedAt: Instant;
  profileCreatedAt: Instant;
  profileUpdatedAt: Instant;
  walletUpdatedAt: Instant;
}

export interface CustomerWalletResponseVo {
  id?: UUID;
  ownerType?: "CUSTOMER" | "SHOP" | string;
  ownerId?: UUID;
  customerId?: UUID;
  balance: number;
  currency: string;
  updatedAt: Instant;
}

export interface CustomerWalletTransactionResponseVo {
  id: UUID;
  walletId?: UUID;
  ownerType?: "CUSTOMER" | "SHOP" | string;
  ownerId?: UUID;
  customerId?: UUID;
  type: "CREDIT" | "DEBIT" | string;
  amount: number;
  balanceAfter: number;
  currency: string;
  externalRef?: string;
  description?: string;
  createdAt: Instant;
}

export interface CustomerWalletMoneyRequestDto {
  amount: number;
  currency?: string;
  externalRef?: string;
  description?: string;
}

export interface ShopStatusUpdateRequestDto {
  status: AccountStatus | string;
}

export interface ShopWalletUpdateRequestDto {
  balance: number;
  currency: string;
}

export interface ShopProfileUpdateRequestDto {
  shopName: string;
  ownerName: string;
  phone?: string;
}

export interface ShopResponseVo {
  authId: UUID;
  email: string;
  status: AccountStatus | string;
  shopId: UUID;
  shopName: string;
  ownerName: string;
  phone?: string;
  balance: number;
  currency: string;
  authCreatedAt: Instant;
  authUpdatedAt: Instant;
  profileCreatedAt: Instant;
  profileUpdatedAt: Instant;
  walletUpdatedAt: Instant;
}
