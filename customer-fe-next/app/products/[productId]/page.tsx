"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LoaderCircle, ShoppingCart } from "lucide-react";
import { use, useMemo } from "react";
import { FormProvider, Path, useForm, useWatch } from "react-hook-form";
import { signIn, useSession } from "next-auth/react";
import { z } from "zod";
import { ApiTable, EmptyRow } from "@/components/api-workspace/primitives";
import { InputField } from "@/components/forms";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { createOrderCheckout, fetchAttributes, fetchProduct, fetchSkus } from "@/lib/api";
import { AttributeResponseVo, AttributeValueResponseVo, SkuResponseVo } from "@/lib/types";

type ProductDetailPageProps = {
  params: Promise<{ productId: string }>;
};

type AttributeValueLookup = {
  attribute: AttributeResponseVo;
  value: AttributeValueResponseVo;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const orderSchema = z.object({
  quantity: z.coerce.number().int().min(1, "Quantity must be greater than 0"),
  attributeValueIds: z.record(z.string(), z.string()),
});

type OrderFormInput = z.input<typeof orderSchema>;
type OrderFormValues = z.output<typeof orderSchema>;

function formatMoney(value: number) {
  return currencyFormatter.format(value);
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "-";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function buildPaymentHandoffUrl(params: { orderId: string; paymentId: string; clientSecret?: string }) {
  const searchParams = new URLSearchParams({
    orderId: params.orderId,
    paymentId: params.paymentId,
  });

  if (params.clientSecret) {
    searchParams.set("clientSecret", params.clientSecret);
  }

  return `/payments/checkout?${searchParams.toString()}`;
}

function findMatchingSku(skus: SkuResponseVo[], selectedValueIds: string[]) {
  if (selectedValueIds.length === 0) {
    return skus.find((sku) => sku.attributeValueIds.length === 0) ?? (skus.length === 1 ? skus[0] : null);
  }

  const selectedValues = new Set(selectedValueIds);
  return (
    skus.find(
      (sku) =>
        sku.attributeValueIds.length === selectedValueIds.length &&
        sku.attributeValueIds.every((valueId) => selectedValues.has(valueId)),
    ) ?? null
  );
}

function getSkuAttributeLabels(sku: SkuResponseVo, lookup: Map<string, AttributeValueLookup>) {
  return sku.attributeValueIds.map((valueId) => {
    const match = lookup.get(valueId);
    return match ? `${match.attribute.name}: ${match.value.value}` : valueId;
  });
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<OrderFormInput, undefined, OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      quantity: "1",
      attributeValueIds: {},
    },
  });

  const productQuery = useQuery({
    queryKey: ["customer-product", productId],
    queryFn: () => fetchProduct(productId),
    enabled: !!productId,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const attributesQuery = useQuery({
    queryKey: ["customer-product-attributes", productId],
    queryFn: () => fetchAttributes(productId),
    enabled: !!productId,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const skusQuery = useQuery({
    queryKey: ["customer-product-skus", productId],
    queryFn: () => fetchSkus(productId),
    enabled: !!productId,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const orderMutation = useMutation({
    mutationFn: ({ skuCode, quantity, idempotencyKey }: { skuCode: string; quantity: number; idempotencyKey: string }) =>
      createOrderCheckout({ items: [{ skuCode, quantity }] }, "CARD", idempotencyKey),
    onSuccess: async (checkout) => {
      await Promise.allSettled([
        skusQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["customer-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-products"] }),
      ]);

      if (checkout.paymentUrl) {
        window.location.assign(checkout.paymentUrl);
        return;
      }

      router.push(
        buildPaymentHandoffUrl({
          orderId: checkout.order.id,
          paymentId: checkout.payment.id,
          clientSecret: checkout.clientSecret,
        }),
      );
    },
  });

  const product = productQuery.data;
  const attributes = useMemo(() => attributesQuery.data ?? [], [attributesQuery.data]);
  const skus = useMemo(() => skusQuery.data ?? [], [skusQuery.data]);
  const selectedByAttribute = useWatch({
    control: form.control,
    name: "attributeValueIds",
  }) ?? {};
  const watchedQuantity = useWatch({
    control: form.control,
    name: "quantity",
  });
  const quantity = Number(watchedQuantity || 0);

  const attributeValueLookup = useMemo(() => {
    const lookup = new Map<string, AttributeValueLookup>();
    attributes.forEach((attribute) => {
      attribute.values.forEach((value) => {
        lookup.set(value.id, { attribute, value });
      });
    });
    return lookup;
  }, [attributes]);

  const selectedValueIds = attributes
    .map((attribute) => selectedByAttribute[attribute.id])
    .filter((valueId): valueId is string => Boolean(valueId));
  const allAttributesSelected = attributes.every((attribute) => Boolean(selectedByAttribute[attribute.id]));
  const selectedSku = allAttributesSelected ? findMatchingSku(skus, selectedValueIds) : null;
  const stock = selectedSku?.quantity ?? 0;
  const unitPrice = selectedSku?.priceOverride ?? product?.price ?? 0;
  const orderTotal = Math.max(quantity, 0) * unitPrice;
  const loading = productQuery.isLoading || attributesQuery.isLoading || skusQuery.isLoading;
  const isError = productQuery.isError || attributesQuery.isError || skusQuery.isError;
  const cannotOrder = !allAttributesSelected || !selectedSku || stock < quantity || quantity < 1 || orderMutation.isPending;

  async function refetchDetail() {
    await Promise.all([productQuery.refetch(), attributesQuery.refetch(), skusQuery.refetch()]);
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();

    const missingAttributes = attributes.filter((attribute) => !values.attributeValueIds[attribute.id]);
    if (missingAttributes.length > 0) {
      missingAttributes.forEach((attribute) => {
        form.setError(`attributeValueIds.${attribute.id}` as Path<OrderFormInput>, {
          message: "Choose one value",
        });
      });
      return;
    }

    const sku = findMatchingSku(
      skus,
      attributes.map((attribute) => values.attributeValueIds[attribute.id]).filter(Boolean),
    );

    if (!sku) {
      form.setError("root", { message: "Selected attributes do not match an available SKU." });
      return;
    }

    if (sku.quantity < values.quantity) {
      form.setError("quantity", { message: `Only ${sku.quantity} in stock for this SKU.` });
      return;
    }

    if (status !== "authenticated") {
      await signIn("keycloak");
      return;
    }

    await orderMutation.mutateAsync({ skuCode: sku.skuCode, quantity: values.quantity, idempotencyKey: crypto.randomUUID() });
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" size="sm" className="w-fit px-2 text-slate-600">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
          <div>
            <Badge variant="outline">PRODUCT</Badge>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{product?.name ?? "Product detail"}</h1>
            <p className="mt-1 text-sm text-slate-600">Review attributes and SKUs, choose one value per attribute, then place an order for the matching SKU.</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => void refetchDetail()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {status !== "authenticated" ? <Alert>Login is required before placing orders.</Alert> : null}
      {orderMutation.isSuccess ? <Alert variant="success">Order created. Redirecting to payment...</Alert> : null}
      {orderMutation.isError ? (
        <Alert variant="destructive">{getErrorMessage(orderMutation.error, "Order failed, please try again later.")}</Alert>
      ) : null}
      {form.formState.errors.root?.message ? (
        <Alert variant="destructive">{form.formState.errors.root.message}</Alert>
      ) : null}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading product detail...
        </div>
      ) : null}
      {isError ? (
        <Alert variant="destructive">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {getErrorMessage(
                productQuery.error ?? attributesQuery.error ?? skusQuery.error,
                "Unable to load product detail.",
              )}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetchDetail()}>
              Retry
            </Button>
          </div>
        </Alert>
      ) : null}

      {product ? (
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Overview</h2>
            <Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status ?? "N/A"}</Badge>
          </div>
          <div className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
            <div><span className="font-medium text-slate-950">Product ID</span><div className="break-all">{product.id ?? "-"}</div></div>
            <div><span className="font-medium text-slate-950">Shop ID</span><div className="break-all">{product.shopId ?? "-"}</div></div>
            <div><span className="font-medium text-slate-950">Base price</span><div>{formatMoney(product.price)}</div></div>
            <div><span className="font-medium text-slate-950">Category</span><div>{product.categoryName ?? product.categoryId ?? "-"}</div></div>
            <div><span className="font-medium text-slate-950">Created</span><div>{formatDate(product.createdAt)}</div></div>
            <div><span className="font-medium text-slate-950">Updated</span><div>{formatDate(product.updatedAt)}</div></div>
            <div className="sm:col-span-2 lg:col-span-3"><span className="font-medium text-slate-950">Image URL</span><div className="break-all">{product.imageUrl ?? "-"}</div></div>
            <div className="sm:col-span-2 lg:col-span-3"><span className="font-medium text-slate-950">Description</span><div>{product.description}</div></div>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-950">Create order</h2>
            <p className="mt-1 text-sm text-slate-500">Creates a pending order, starts card payment, then redirects to checkout.</p>
          </div>
          <Badge variant={selectedSku && stock >= quantity && quantity > 0 ? "secondary" : "outline"}>
            Stock {stock}
          </Badge>
        </div>

        <FormProvider {...form}>
          <form className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {attributes.length === 0 ? (
                <Alert>No attributes are configured for this product.</Alert>
              ) : null}
              {attributes.map((attribute) => {
                const fieldName = `attributeValueIds.${attribute.id}` as Path<OrderFormInput>;
                const error = form.formState.errors.attributeValueIds?.[attribute.id]?.message;

                return (
                  <div key={attribute.id} className="grid gap-2 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[12rem_minmax(0,1fr)]">
                    <Label htmlFor={`attribute-${attribute.id}`} className="pt-2">
                      {attribute.name}
                    </Label>
                    <div className="space-y-2">
                      <Select id={`attribute-${attribute.id}`} {...form.register(fieldName)}>
                        <option value="">Choose {attribute.name}</option>
                        {attribute.values.map((value) => (
                          <option key={value.id} value={value.id}>
                            {value.value}
                          </option>
                        ))}
                      </Select>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <Badge variant="outline">{attribute.code}</Badge>
                        <span className="break-all">ID {attribute.id}</span>
                      </div>
                      <FormMessage>{typeof error === "string" ? error : undefined}</FormMessage>
                    </div>
                  </div>
                );
              })}
              <InputField<OrderFormInput> name="quantity" label="Quantity" type="number" min="1" />
            </div>

            <div className="rounded-md border border-slate-200 p-4">
              <h3 className="font-medium text-slate-950">Order summary</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3"><span className="text-slate-500">SKU</span><span className="break-all font-medium text-slate-950">{selectedSku?.skuCode ?? "-"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Unit price</span><span>{formatMoney(unitPrice)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Stock</span><span>{stock}</span></div>
                <div className="flex justify-between gap-3 border-t border-slate-200 pt-3"><span className="font-medium text-slate-950">Total</span><span className="font-semibold text-slate-950">{formatMoney(orderTotal)}</span></div>
              </div>
              {!allAttributesSelected ? <p className="mt-4 text-sm text-slate-500">Choose all attributes to resolve the SKU.</p> : null}
              {allAttributesSelected && !selectedSku ? <p className="mt-4 text-sm text-red-600">No SKU exists for this combination. Stock is 0.</p> : null}
              {selectedSku && stock < quantity ? <p className="mt-4 text-sm text-red-600">Requested quantity is higher than stock.</p> : null}
              <Button type="submit" className="mt-5 w-full" disabled={cannotOrder}>
                {orderMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                {status === "authenticated" ? "Create order and pay" : "Login to order"}
              </Button>
            </div>
          </form>
        </FormProvider>
      </div>

      <ApiTable title="Attributes" headers={["ID", "Product", "Code", "Name", "Values", "Created", "Updated"]}>
        {attributesQuery.isLoading ? <EmptyRow colSpan={7} label="Loading attributes..." /> : null}
        {!attributesQuery.isLoading && attributes.length === 0 ? <EmptyRow colSpan={7} label="No attributes returned." /> : null}
        {attributes.map((attribute) => (
          <TableRow key={attribute.id}>
            <TableCell className="break-all font-medium">{attribute.id}</TableCell>
            <TableCell className="break-all">{attribute.productId}</TableCell>
            <TableCell>{attribute.code}</TableCell>
            <TableCell>{attribute.name}</TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                {attribute.values.map((value) => (
                  <span key={value.id}>{value.value} <span className="text-xs text-slate-500">({value.id}, order {value.sortOrder})</span></span>
                ))}
              </div>
            </TableCell>
            <TableCell className="text-slate-500">{formatDate(attribute.createdAt)}</TableCell>
            <TableCell className="text-slate-500">{formatDate(attribute.updatedAt)}</TableCell>
          </TableRow>
        ))}
      </ApiTable>

      <ApiTable title="SKUs" headers={["ID", "Product", "SKU", "Attribute value IDs", "Attributes", "Price", "Stock", "Created", "Updated"]}>
        {skusQuery.isLoading ? <EmptyRow colSpan={9} label="Loading SKUs..." /> : null}
        {!skusQuery.isLoading && skus.length === 0 ? <EmptyRow colSpan={9} label="No SKUs returned." /> : null}
        {skus.map((sku) => {
          const attributeLabels = getSkuAttributeLabels(sku, attributeValueLookup);

          return (
            <TableRow key={sku.id}>
              <TableCell className="break-all font-medium">{sku.id}</TableCell>
              <TableCell className="break-all">{sku.productId}</TableCell>
              <TableCell className="break-all">{sku.skuCode}</TableCell>
              <TableCell className="break-all">{sku.attributeValueIds.length ? sku.attributeValueIds.join(", ") : "-"}</TableCell>
              <TableCell>{attributeLabels.length ? attributeLabels.join(", ") : "-"}</TableCell>
              <TableCell>{sku.priceOverride != null ? `${formatMoney(sku.priceOverride)} override` : `${formatMoney(product?.price ?? 0)} base`}</TableCell>
              <TableCell>{sku.quantity}</TableCell>
              <TableCell className="text-slate-500">{formatDate(sku.createdAt)}</TableCell>
              <TableCell className="text-slate-500">{formatDate(sku.updatedAt)}</TableCell>
            </TableRow>
          );
        })}
      </ApiTable>
    </main>
  );
}
