import { z } from "zod";

const uuid = z.string().trim().uuid("Use a valid UUID");

export const orderSchema = z.object({
  skuCode: z.string().trim().min(1, "SKU code is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be greater than 0"),
});

export const paymentSchema = z.object({
  orderId: uuid,
  method: z.enum(["BALANCE", "CARD", "MANUAL"]),
});
