export type UUID = string;
export type Instant = string;

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type AttributeInputType = "SELECT" | "TEXT";
export type OrderStatus = "PENDING" | "PAID" | "CANCELED";
export type PaymentMethod = "BALANCE" | "CARD" | "MANUAL";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";
export type PaymentHistoryType = "TOPUP" | "PURCHASE" | "REFUND";
export type AccountStatus = "ACTIVE" | "LOCKED";

export interface ProductRequestDto {
  id?: UUID;
  shopId?: UUID;
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
  inputType: AttributeInputType | string;
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
  inputType: AttributeInputType | string;
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

export interface UserDetails {
  email: string;
  firstName: string;
  lastName: string;
}

export interface Order {
  id?: number;
  orderNumber?: string;
  skuCode: string;
  price: number;
  quantity: number;
  userDetails: UserDetails;
}

export interface OrderCreateRequestDto {
  customerId: UUID;
  status?: OrderStatus | string;
  customerDetails?: UserDetails;
  items: OrderItemRequestDto[];
}

export interface OrderItemRequestDto {
  skuId: UUID;
  skuCode: string;
  productId: UUID;
  shopId: UUID;
  price: number;
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
  customerId: UUID;
  orderId: UUID;
  amount: number;
  method: PaymentMethod | string;
  status?: PaymentStatus | string;
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

export interface CustomerCreateRequestDto {
  email: string;
  passwordHash: string;
  status?: AccountStatus | string;
  firstName: string;
  lastName: string;
  phone?: string;
  initialBalance?: number;
  currency?: string;
}

export interface CustomerStatusUpdateRequestDto {
  status: AccountStatus | string;
}

export interface CustomerWalletUpdateRequestDto {
  balance: number;
  currency: string;
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

export interface ShopCreateRequestDto {
  email: string;
  passwordHash: string;
  status?: AccountStatus | string;
  shopName: string;
  ownerName: string;
  phone?: string;
  initialBalance?: number;
  currency?: string;
}

export interface ShopStatusUpdateRequestDto {
  status: AccountStatus | string;
}

export interface ShopWalletUpdateRequestDto {
  balance: number;
  currency: string;
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
