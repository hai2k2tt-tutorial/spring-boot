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

export interface ProductImagePresignResponseVo {
  objectName: string;
  uploadUrl: string;
  imageUrl: string;
  contentType: string;
  maxSize: number;
  expiresInSeconds: number;
}

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
  skuCode?: string;
  productId: UUID;
  shopId: UUID;
  price: number;
  quantity: number;
}

export interface PaymentCreateRequestDto {
  orderId: UUID;
  method: PaymentMethod | string;
}

export interface PaymentStatusUpdateRequestDto {
  status: PaymentStatus | string;
}

export interface PaymentResponseVo {
  id: UUID;
  customerId: UUID;
  orderId: UUID;
  amount: number;
  method: PaymentMethod | string;
  status: PaymentStatus | string;
  createdAt: Instant;
  updatedAt: Instant;
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
  authCreatedAt: Instant;
  authUpdatedAt: Instant;
  profileCreatedAt: Instant;
  profileUpdatedAt: Instant;
}

export interface ShopStatusUpdateRequestDto {
  status: AccountStatus | string;
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
  authCreatedAt: Instant;
  authUpdatedAt: Instant;
  profileCreatedAt: Instant;
  profileUpdatedAt: Instant;
}

export interface ShopWalletResponseVo {
  id?: UUID;
  ownerType?: "CUSTOMER" | "SHOP" | string;
  ownerId?: UUID;
  shopId?: UUID;
  balance: number;
  currency: string;
  updatedAt: Instant;
}

export interface ShopNotificationResponseVo {
  id: UUID;
  shopId: UUID;
  type: string;
  title: string;
  content: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Instant;
  readAt?: Instant;
}
