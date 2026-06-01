import { z } from "zod";

const uuid = z.string().trim().uuid("Use a valid UUID");
const optionalUuid = z.string().trim().uuid("Use a valid UUID").optional().or(z.literal(""));
const optionalText = z.string().trim().optional().or(z.literal(""));

export const productSchema = z.object({
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
  values: z.string().trim().min(1, "Values are required"),
});

export const skuSchema = z.object({
  productId: uuid,
  skuCode: z.string().trim().min(1, "SKU code is required"),
  priceOverride: z.coerce.number().optional(),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  attributeValueIds: z.array(uuid).default([]),
});

export const orderSchema = z.object({
  skuCode: z.string().trim().min(1, "SKU code is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be greater than 0"),
});

export const paymentSchema = z.object({
  orderId: uuid,
  method: z.enum(["BALANCE", "CARD", "MANUAL"]),
});

export const stockSchema = z.object({
  skuCode: z.string().trim().min(1, "SKU code is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be greater than 0"),
});

export function toOptional(value?: string) {
  return value && value.length > 0 ? value : undefined;
}
