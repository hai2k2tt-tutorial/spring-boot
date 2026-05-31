import { z } from "zod";

const uuid = z.string().trim().uuid("Use a valid UUID");
const optionalUuid = z.string().trim().uuid("Use a valid UUID").optional().or(z.literal(""));
const optionalText = z.string().trim().optional().or(z.literal(""));

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

export const stockSchema = z.object({
  skuCode: z.string().trim().min(1, "SKU code is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be greater than 0"),
});

export function toOptional(value?: string) {
  return value && value.length > 0 ? value : undefined;
}
