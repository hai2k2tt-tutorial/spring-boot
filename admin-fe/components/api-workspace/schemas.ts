import { z } from "zod";

const uuid = z.string().trim().uuid("Use a valid UUID");
const optionalUuid = z.string().trim().uuid("Use a valid UUID").optional().or(z.literal(""));
const optionalText = z.string().trim().optional().or(z.literal(""));

export const productSchema = z.object({
  shopId: uuid,
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().min(1, "Description is required"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  imageUrl: optionalText,
  categoryId: uuid,
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  parentId: optionalUuid,
});

export const attributeSchema = z.object({
  productId: uuid,
  code: z.string().trim().min(1, "Code is required"),
  name: z.string().trim().min(1, "Name is required"),
  inputType: z.enum(["SELECT", "TEXT"]),
});

export const skuSchema = z.object({
  productId: uuid,
  skuCode: z.string().trim().min(1, "SKU code is required"),
  priceOverride: z.coerce.number().optional(),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  attributeValueIds: optionalText,
});

export const orderSchema = z.object({
  customerId: uuid,
  status: z.enum(["PENDING", "PAID", "CANCELED"]),
  email: z.string().trim().email("Valid email is required"),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  skuId: uuid,
  skuCode: z.string().trim().min(1, "SKU code is required"),
  productId: uuid,
  shopId: uuid,
  price: z.coerce.number().positive("Price must be greater than 0"),
  quantity: z.coerce.number().int().min(1, "Quantity must be greater than 0"),
});

export const paymentSchema = z.object({
  customerId: uuid,
  orderId: uuid,
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum(["BALANCE", "CARD", "MANUAL"]),
  status: z.enum(["PENDING", "SUCCESS", "FAILED"]),
});

export const accountSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  passwordHash: z.string().trim().min(1, "Password hash is required"),
  status: z.enum(["ACTIVE", "LOCKED"]),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  shopName: z.string().trim().optional(),
  ownerName: z.string().trim().optional(),
  phone: optionalText,
  initialBalance: z.coerce.number().min(0, "Balance cannot be negative"),
  currency: z.string().trim().min(1, "Currency is required"),
});

export const stockSchema = z.object({
  skuCode: z.string().trim().min(1, "SKU code is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be greater than 0"),
});

export function toOptional(value?: string) {
  return value && value.length > 0 ? value : undefined;
}
