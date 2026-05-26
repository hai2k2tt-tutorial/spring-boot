import { z } from "zod";

const uuid = z.string().trim().uuid("Use a valid UUID");

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
