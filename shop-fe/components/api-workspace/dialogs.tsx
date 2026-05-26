"use client";

import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCcw, Save } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import {
  checkStock,
  createAttribute,
  createCategory,
  createCustomer,
  createPayment,
  createProduct,
  createShop,
  createSku,
  placeOrder,
} from "@/lib/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputField, SelectField, TextareaField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import {
  accountSchema,
  attributeSchema,
  categorySchema,
  orderSchema,
  paymentSchema,
  productSchema,
  skuSchema,
  stockSchema,
  toOptional,
} from "@/components/api-workspace/schemas";
import { useState } from "react";
import { InventoryCheckResponseVo } from "@/lib/types";

export type DialogName = "product" | "category" | "attribute" | "sku" | "order" | "payment" | "customer" | "shop" | "stock" | null;

type DialogProps = {
  dialog: DialogName;
  setDialog: (dialog: DialogName) => void;
  saving: boolean;
  submit: (work: (token?: string) => Promise<unknown>) => Promise<void>;
  requireToken: () => Promise<string | undefined>;
};

export function ApiDialogs({ dialog, setDialog, saving, submit, requireToken }: DialogProps) {
  const [stockResult, setStockResult] = useState<InventoryCheckResponseVo | null>(null);
  const stockMutation = useMutation({
    mutationFn: async (values: z.output<typeof stockSchema>) => {
      const token = await requireToken();
      return checkStock(values.skuCode, values.quantity, token);
    },
    onSuccess: setStockResult,
  });
  const productForm = useForm<z.input<typeof productSchema>, undefined, z.output<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: { shopId: "", name: "", description: "", price: "0", imageUrl: "", categoryId: "", status: "DRAFT" },
  });
  const categoryForm = useForm<z.input<typeof categorySchema>, undefined, z.output<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", parentId: "" },
  });
  const attributeForm = useForm<z.input<typeof attributeSchema>, undefined, z.output<typeof attributeSchema>>({
    resolver: zodResolver(attributeSchema),
    defaultValues: { productId: "", code: "", name: "", inputType: "SELECT" },
  });
  const skuForm = useForm<z.input<typeof skuSchema>, undefined, z.output<typeof skuSchema>>({
    resolver: zodResolver(skuSchema),
    defaultValues: { productId: "", skuCode: "", priceOverride: "0", quantity: "0", attributeValueIds: "" },
  });
  const orderForm = useForm<z.input<typeof orderSchema>, undefined, z.output<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: { customerId: "", status: "PENDING", email: "", firstName: "", lastName: "", skuId: "", skuCode: "", productId: "", shopId: "", price: "0", quantity: "1" },
  });
  const paymentForm = useForm<z.input<typeof paymentSchema>, undefined, z.output<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { customerId: "", orderId: "", amount: "0", method: "BALANCE", status: "PENDING" },
  });
  const customerForm = useForm<z.input<typeof accountSchema>, undefined, z.output<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: { email: "", passwordHash: "", status: "ACTIVE", firstName: "", lastName: "", phone: "", initialBalance: "0", currency: "USD" },
  });
  const shopForm = useForm<z.input<typeof accountSchema>, undefined, z.output<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: { email: "", passwordHash: "", status: "ACTIVE", shopName: "", ownerName: "", phone: "", initialBalance: "0", currency: "USD" },
  });
  const stockForm = useForm<z.input<typeof stockSchema>, undefined, z.output<typeof stockSchema>>({
    resolver: zodResolver(stockSchema),
    defaultValues: { skuCode: "", quantity: "1" },
  });

  return (
    <>
      <Modal title="Create product" open={dialog === "product"} onClose={() => setDialog(null)}>
        <FormProvider {...productForm}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={productForm.handleSubmit((values) => submit((token) => createProduct({ ...values, shopId: toOptional(values.shopId), categoryId: toOptional(values.categoryId), imageUrl: toOptional(values.imageUrl) }, token)))}>
            <InputField name="name" label="Name" />
            <InputField name="price" label="Price" type="number" />
            <InputField name="shopId" label="Shop UUID" />
            <InputField name="categoryId" label="Category UUID" />
            <SelectField name="status" label="Status" options={["DRAFT", "ACTIVE", "ARCHIVED"]} />
            <InputField name="imageUrl" label="Image URL" />
            <TextareaField name="description" label="Description" className="space-y-2 sm:col-span-2" />
            <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save product</Button>
          </form>
        </FormProvider>
      </Modal>

      <Modal title="Create category" open={dialog === "category"} onClose={() => setDialog(null)}>
        <FormProvider {...categoryForm}>
          <form className="grid gap-4" onSubmit={categoryForm.handleSubmit((values) => submit((token) => createCategory({ name: values.name, parentId: toOptional(values.parentId) }, token)))}>
            <InputField name="name" label="Name" />
            <InputField name="parentId" label="Parent UUID" />
            <Button type="submit" disabled={saving}><Save className="h-4 w-4" />Save category</Button>
          </form>
        </FormProvider>
      </Modal>

      <Modal title="Create inventory attribute" open={dialog === "attribute"} onClose={() => setDialog(null)}>
        <FormProvider {...attributeForm}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={attributeForm.handleSubmit((values) => submit((token) => createAttribute(values, token)))}>
            <InputField name="productId" label="Product UUID" />
            <InputField name="code" label="Code" />
            <InputField name="name" label="Name" />
            <SelectField name="inputType" label="Input type" options={["SELECT", "TEXT"]} />
            <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save attribute</Button>
          </form>
        </FormProvider>
      </Modal>

      <Modal title="Create SKU" open={dialog === "sku"} onClose={() => setDialog(null)}>
        <FormProvider {...skuForm}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={skuForm.handleSubmit((values) => submit((token) => createSku({ ...values, attributeValueIds: values.attributeValueIds ? values.attributeValueIds.split(",").map((id) => id.trim()).filter(Boolean) : [] }, token)))}>
            <InputField name="productId" label="Product UUID" />
            <InputField name="skuCode" label="SKU code" />
            <InputField name="priceOverride" label="Price override" type="number" />
            <InputField name="quantity" label="Quantity" type="number" />
            <InputField name="attributeValueIds" label="Attribute value UUIDs, comma separated" className="space-y-2 sm:col-span-2" />
            <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save SKU</Button>
          </form>
        </FormProvider>
      </Modal>

      <Modal title="Check stock" open={dialog === "stock"} onClose={() => setDialog(null)}>
        <FormProvider {...stockForm}>
          <form className="grid gap-4" onSubmit={stockForm.handleSubmit((values) => stockMutation.mutate(values))}>
            <InputField name="skuCode" label="SKU code" />
            <InputField name="quantity" label="Quantity" type="number" />
            {stockResult ? <Alert variant={stockResult.inStock ? "success" : "destructive"}>{stockResult.skuCode}: {stockResult.inStock ? "In stock" : "Not enough stock"}</Alert> : null}
            {stockMutation.isError ? <Alert variant="destructive">{stockMutation.error instanceof Error ? stockMutation.error.message : "Unable to check stock"}</Alert> : null}
            <Button type="submit" disabled={stockMutation.isPending}>
              <RefreshCcw className={`h-4 w-4 ${stockMutation.isPending ? "animate-spin" : ""}`} />
              {stockMutation.isPending ? "Checking" : "Check stock"}
            </Button>
          </form>
        </FormProvider>
      </Modal>

      <Modal title="Create order" open={dialog === "order"} onClose={() => setDialog(null)}>
        <FormProvider {...orderForm}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={orderForm.handleSubmit((values) => submit((token) => placeOrder({
            customerId: values.customerId,
            status: values.status,
            customerDetails: { email: values.email, firstName: values.firstName, lastName: values.lastName },
            items: [{ skuId: values.skuId, skuCode: values.skuCode, productId: values.productId, shopId: values.shopId, price: values.price, quantity: values.quantity }],
          }, token)))}>
            {(["customerId", "email", "firstName", "lastName", "skuId", "skuCode", "productId", "shopId", "price", "quantity"] as const).map((name) => <InputField key={name} name={name} label={name} type={name === "price" || name === "quantity" ? "number" : "text"} />)}
            <SelectField name="status" label="Status" options={["PENDING", "PAID", "CANCELED"]} />
            <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save order</Button>
          </form>
        </FormProvider>
      </Modal>

      <Modal title="Create payment" open={dialog === "payment"} onClose={() => setDialog(null)}>
        <FormProvider {...paymentForm}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={paymentForm.handleSubmit((values) => submit((token) => createPayment(values, token)))}>
            <InputField name="customerId" label="Customer UUID" />
            <InputField name="orderId" label="Order UUID" />
            <InputField name="amount" label="Amount" type="number" />
            <SelectField name="method" label="Method" options={["BALANCE", "CARD", "MANUAL"]} />
            <SelectField name="status" label="Status" options={["PENDING", "SUCCESS", "FAILED"]} />
            <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save payment</Button>
          </form>
        </FormProvider>
      </Modal>

      <Modal title="Create customer" open={dialog === "customer"} onClose={() => setDialog(null)}>
        <FormProvider {...customerForm}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={customerForm.handleSubmit((values) => submit((token) => createCustomer({ email: values.email, passwordHash: values.passwordHash, status: values.status, firstName: values.firstName ?? "", lastName: values.lastName ?? "", phone: toOptional(values.phone), initialBalance: values.initialBalance, currency: values.currency }, token)))}>
            {(["email", "passwordHash", "firstName", "lastName", "phone", "initialBalance", "currency"] as const).map((name) => <InputField key={name} name={name} label={name} type={name === "initialBalance" ? "number" : "text"} />)}
            <SelectField name="status" label="Status" options={["ACTIVE", "LOCKED"]} />
            <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save customer</Button>
          </form>
        </FormProvider>
      </Modal>

      <Modal title="Create shop" open={dialog === "shop"} onClose={() => setDialog(null)}>
        <FormProvider {...shopForm}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={shopForm.handleSubmit((values) => submit((token) => createShop({ email: values.email, passwordHash: values.passwordHash, status: values.status, shopName: values.shopName ?? "", ownerName: values.ownerName ?? "", phone: toOptional(values.phone), initialBalance: values.initialBalance, currency: values.currency }, token)))}>
            {(["email", "passwordHash", "shopName", "ownerName", "phone", "initialBalance", "currency"] as const).map((name) => <InputField key={name} name={name} label={name} type={name === "initialBalance" ? "number" : "text"} />)}
            <SelectField name="status" label="Status" options={["ACTIVE", "LOCKED"]} />
            <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save shop</Button>
          </form>
        </FormProvider>
      </Modal>
    </>
  );
}
