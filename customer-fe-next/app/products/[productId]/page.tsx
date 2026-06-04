"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImageIcon, LoaderCircle, ShoppingCart, Store } from "lucide-react";
import { use, useMemo } from "react";
import { FormProvider, Path, useForm, useWatch } from "react-hook-form";
import { signIn, useSession } from "next-auth/react";
import { z } from "zod";
import { InputField } from "@/components/forms";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Label } from "@/components/ui/label";
import { createOrderCheckout, fetchAttributes, fetchProduct, fetchShopByProductShopId, fetchSkus } from "@/lib/api";
import { AttributeResponseVo, AttributeValueResponseVo, SkuResponseVo } from "@/lib/types";
import { createUuid } from "@/lib/uuid";

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

  const product = productQuery.data;

  const shopQuery = useQuery({
    queryKey: ["customer-product-shop", product?.shopId],
    queryFn: () => fetchShopByProductShopId(product?.shopId ?? ""),
    enabled: Boolean(product?.shopId),
    staleTime: 60 * 1000,
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
  const shopName = shopQuery.data?.shopName ?? "Shop";
  const shopHref = shopQuery.data?.shopId
    ? `/shops/${shopQuery.data.shopId}`
    : product?.shopId
      ? `/shops/${product.shopId}`
      : undefined;
  const selectedLabels = selectedSku ? selectedSku.attributeValueIds
    .map((valueId) => attributeValueLookup.get(valueId))
    .filter((value): value is AttributeValueLookup => Boolean(value))
    .map(({ attribute, value }) => `${attribute.name}: ${value.value}`) : [];
  const selectedItemLabel = selectedLabels.length ? selectedLabels.join(" / ") : selectedSku ? "Base product" : "Choose options to resolve a SKU.";

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

    await orderMutation.mutateAsync({ skuCode: sku.skuCode, quantity: values.quantity, idempotencyKey: createUuid() });
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
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(18rem,0.95fr)_minmax(0,1.05fr)] lg:p-6">
          <div className="md:sticky md:top-6 md:self-start">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-100 via-slate-50 to-orange-50">
              <div className="aspect-square">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300">
                    <ImageIcon className="h-16 w-16" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status ?? "N/A"}</Badge>
                <Badge variant="outline">{product.categoryName ?? product.categoryId ?? "General"}</Badge>
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{product.name}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{product.description}</p>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <Store className="h-4 w-4 text-slate-500" />
                <span>Sold by</span>
                {shopHref ? (
                  <Link href={shopHref} className="font-medium text-slate-950 underline-offset-4 hover:underline">
                    {shopQuery.isLoading ? "Loading shop..." : shopName}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-950">{shopQuery.isLoading ? "Loading shop..." : shopName}</span>
                )}
              </div>
              <p className="text-3xl font-semibold tracking-tight text-orange-600">{formatMoney(unitPrice)}</p>
            </div>

            <FormProvider {...form}>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-5">
                  {attributes.length === 0 ? (
                    <Alert>No product variants are configured. You can order when a single base SKU exists.</Alert>
                  ) : null}

                  {attributes.map((attribute) => {
                    const fieldName = `attributeValueIds.${attribute.id}` as Path<OrderFormInput>;
                    const selectedValueId = selectedByAttribute[attribute.id];
                    const error = form.formState.errors.attributeValueIds?.[attribute.id]?.message;

                    return (
                      <div key={attribute.id} className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <Label className="text-sm font-semibold text-slate-950">{attribute.name}</Label>
                          <span className="text-xs uppercase tracking-wide text-slate-400">{attribute.code}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {attribute.values
                            .slice()
                            .sort((left, right) => left.sortOrder - right.sortOrder)
                            .map((value) => {
                              const selected = selectedValueId === value.id;

                              return (
                                <Button
                                  key={value.id}
                                  type="button"
                                  variant={selected ? "default" : "outline"}
                                  className={selected ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-800" : "bg-white"}
                                  onClick={() => {
                                    form.setValue(fieldName, value.id, { shouldDirty: true, shouldValidate: true });
                                    form.clearErrors(fieldName);
                                  }}
                                >
                                  {value.value}
                                </Button>
                              );
                            })}
                        </div>
                        <FormMessage>{typeof error === "string" ? error : undefined}</FormMessage>
                      </div>
                    );
                  })}

                  <div className="max-w-40">
                    <InputField<OrderFormInput> name="quantity" label="Quantity" type="number" min="1" />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-950">Selected item</h3>
                      <p className="mt-1 text-sm text-slate-500">{selectedItemLabel}</p>
                    </div>
                    <Badge variant={selectedSku && stock >= quantity && quantity > 0 ? "secondary" : "outline"}>
                      Stock {stock}
                    </Badge>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <span className="text-slate-500">SKU</span>
                      <div className="break-all font-medium text-slate-950">{selectedSku?.skuCode ?? "-"}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Unit price</span>
                      <div className="font-medium text-slate-950">{formatMoney(unitPrice)}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Total</span>
                      <div className="font-semibold text-slate-950">{formatMoney(orderTotal)}</div>
                    </div>
                  </div>
                  {!allAttributesSelected ? <p className="mt-4 text-sm text-slate-500">Choose all product options before checkout.</p> : null}
                  {allAttributesSelected && !selectedSku ? <p className="mt-4 text-sm text-red-600">This option combination is not available.</p> : null}
                  {selectedSku && stock < quantity ? <p className="mt-4 text-sm text-red-600">Requested quantity is higher than stock.</p> : null}
                  <Button type="submit" className="mt-5 w-full bg-orange-600 text-white hover:bg-orange-700" disabled={cannotOrder}>
                    {orderMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                    {status === "authenticated" ? "Buy now" : "Login to order"}
                  </Button>
                </div>
              </form>
            </FormProvider>
          </div>
        </section>
      ) : null}
    </main>
  );
}
