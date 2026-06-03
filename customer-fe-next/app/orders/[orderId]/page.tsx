"use client";

import Image from "next/image";
import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle, Clock3, Package, ReceiptText, Store, Truck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchOrder, fetchPayments, fetchProduct, fetchShopByProductShopId } from "@/lib/api";
import { OrderItemResponseVo, OrderResponseVo, PaymentResponseVo, ProductResponseVo, ShopResponseVo, UUID } from "@/lib/types";

type OrderDetailPageProps = {
  params: Promise<{ orderId: string }>;
};

type OrderDetailCatalog = {
  products: Record<UUID, ProductResponseVo>;
  shop?: ShopResponseVo;
  failedLookups: number;
};

type HistoryStep = {
  label: string;
  description: string;
  timestamp?: string;
  state: "done" | "current" | "future";
  icon: typeof CheckCircle2;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function uniqueIds(ids: UUID[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function formatMoney(value: number | string | undefined) {
  const amount = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "Pending";
}

function statusVariant(status: string) {
  if (status === "PAID") return "secondary";
  if (status === "CANCELED") return "destructive";
  return "outline";
}

function normalizeStatus(status: string) {
  return status.replaceAll("_", " ");
}

function getShopId(order: OrderResponseVo) {
  return order.items?.[0]?.shopId;
}

async function fetchOrderDetailCatalog(order: OrderResponseVo): Promise<OrderDetailCatalog> {
  const productIds = uniqueIds((order.items ?? []).map((item) => item.productId));
  const shopId = getShopId(order);

  const [productResults, shopResult] = await Promise.all([
    Promise.allSettled(productIds.map(async (productId) => [productId, await fetchProduct(productId)] as const)),
    shopId ? fetchShopByProductShopId(shopId).then((shop) => ({ status: "fulfilled" as const, value: shop })).catch((reason) => ({ status: "rejected" as const, reason })) : Promise.resolve(undefined),
  ]);

  const products: Record<UUID, ProductResponseVo> = {};
  let failedLookups = 0;

  for (const result of productResults) {
    if (result.status === "fulfilled") {
      const [productId, product] = result.value;
      products[productId] = product;
    } else {
      failedLookups += 1;
    }
  }

  if (shopResult?.status === "rejected") {
    failedLookups += 1;
  }

  return {
    products,
    shop: shopResult?.status === "fulfilled" ? shopResult.value : undefined,
    failedLookups,
  };
}

function buildHistory(order: OrderResponseVo): HistoryStep[] {
  const paid = order.status === "PAID";
  const canceled = order.status === "CANCELED";

  return [
    {
      label: "Order placed",
      description: "The shop received your order.",
      timestamp: order.createdAt,
      state: "done",
      icon: CheckCircle2,
    },
    {
      label: canceled ? "Payment canceled" : "Paid",
      description: canceled ? "The payment was canceled and the order is no longer active." : "Payment confirmation for this order.",
      timestamp: paid || canceled ? order.updatedAt : undefined,
      state: paid || canceled ? "done" : "current",
      icon: paid || canceled ? CheckCircle2 : Clock3,
    },
    {
      label: "Start shipped",
      description: "Future shipping status will appear here when fulfillment starts.",
      state: "future",
      icon: Truck,
    },
  ];
}

function OrderHistory({ order }: { order: OrderResponseVo }) {
  const history = buildHistory(order);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ReceiptText className="h-4 w-4" />
          Order history
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {history.map((step, index) => {
          const Icon = step.icon;
          const done = step.state === "done";
          const current = step.state === "current";

          return (
            <div key={step.label} className="grid grid-cols-[2rem_1fr] gap-3">
              <div className="flex flex-col items-center">
                <div className={done ? "text-orange-600" : current ? "text-slate-950" : "text-slate-300"}>
                  {step.state === "future" ? <Circle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                {index < history.length - 1 ? <div className="mt-2 h-12 w-px bg-slate-200" /> : null}
              </div>
              <div className="pb-6">
                <p className={done || current ? "font-semibold text-slate-950" : "font-semibold text-slate-400"}>{step.label}</p>
                <p className="mt-1 text-sm text-slate-500">{step.description}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(step.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ShopCard({ order, shop }: { order: OrderResponseVo; shop?: ShopResponseVo }) {
  const fallbackShopId = getShopId(order);
  const shopHref = shop?.shopId ? `/shops/${shop.shopId}` : undefined;
  const shopName = shop?.shopName ?? (fallbackShopId ? `Shop ${fallbackShopId.slice(0, 8)}` : "Shop");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="h-4 w-4" />
          Shop information
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {shopHref ? (
            <Link href={shopHref} className="text-lg font-semibold text-slate-950 underline-offset-4 hover:underline">
              {shopName}
            </Link>
          ) : (
            <p className="text-lg font-semibold text-slate-950">{shopName}</p>
          )}
          <p className="mt-1 text-sm text-slate-500">{shop?.ownerName ? `Owned by ${shop.ownerName}` : "Seller details"}</p>
          {shop?.email ? <p className="mt-1 break-all text-sm text-slate-500">{shop.email}</p> : null}
        </div>
        {shopHref ? (
          <Button asChild variant="outline">
            <Link href={shopHref}>View shop</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OrderItemRow({ item, product }: { item: OrderItemResponseVo; product?: ProductResponseVo }) {
  const productName = product?.name ?? `Product ${item.productId.slice(0, 8)}`;

  return (
    <div className="flex gap-4 border-t border-slate-100 px-4 py-4 first:border-t-0 sm:px-5">
      <Link
        href={`/products/${item.productId}`}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:h-24 sm:w-24"
      >
        {product?.imageUrl ? (
          <Image src={product.imageUrl} alt={productName} fill sizes="96px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <Package className="h-7 w-7" />
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/products/${item.productId}`} className="line-clamp-2 font-medium text-slate-950 hover:underline">
          {productName}
        </Link>
        <p className="mt-1 text-xs text-slate-500">SKU item: {item.skuId.slice(0, 8)}</p>
        <p className="mt-2 text-sm text-slate-500">x{item.quantity}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold text-orange-600">{formatMoney(item.price)}</p>
        <p className="mt-1 text-xs text-slate-500">Subtotal {formatMoney(Number(item.price) * item.quantity)}</p>
      </div>
    </div>
  );
}

function PricingSummary({ order, payment }: { order: OrderResponseVo; payment?: PaymentResponseVo }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pricing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Items subtotal</span>
          <span className="font-medium text-slate-950">{formatMoney(order.totalAmount)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Shipping fee</span>
          <span className="font-medium text-slate-950">{formatMoney(0)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Payment method</span>
          <span className="font-medium text-slate-950">{payment?.method ?? "-"}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-500">Payment status</span>
          <span className="font-medium text-slate-950">{payment?.status ?? "-"}</span>
        </div>
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-slate-600">Order Total</span>
            <span className="text-2xl font-semibold text-orange-600">{formatMoney(order.totalAmount)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderId } = use(params);

  const orderQuery = useQuery({
    queryKey: ["customer-order", orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: Boolean(orderId),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const order = orderQuery.data;

  const catalogQuery = useQuery({
    queryKey: ["customer-order-detail-catalog", order?.id, order?.items?.map((item) => item.productId).join("|")],
    queryFn: () => fetchOrderDetailCatalog(order as OrderResponseVo),
    enabled: Boolean(order),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const paymentsQuery = useQuery({
    queryKey: ["customer-order-payments", orderId],
    queryFn: () => fetchPayments({ orderId }),
    enabled: Boolean(orderId),
    staleTime: 30 * 1000,
    retry: 1,
  });

  const payment = paymentsQuery.data?.[0];

  async function refreshDetail() {
    await Promise.allSettled([orderQuery.refetch(), catalogQuery.refetch(), paymentsQuery.refetch()]);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="outline" size="sm" className="w-fit px-2 text-slate-600">
            <Link href="/orders">
              <ArrowLeft className="h-4 w-4" />
              Back to orders
            </Link>
          </Button>
          <div>
            <Badge variant="outline">ORDER DETAIL</Badge>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Order #{order?.orderNumber ?? orderId.slice(0, 8)}</h1>
            <p className="mt-1 text-sm text-slate-500">{order ? `Placed ${formatDate(order.createdAt)}` : "Loading order detail..."}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {order ? (
            <Badge variant={statusVariant(order.status)} className="uppercase tracking-wide">
              {normalizeStatus(order.status)}
            </Badge>
          ) : null}
          <Button variant="outline" onClick={() => void refreshDetail()} disabled={orderQuery.isFetching}>
            Refresh
          </Button>
        </div>
      </div>

      {orderQuery.isLoading ? <Alert>Loading order detail...</Alert> : null}
      {orderQuery.isError ? (
        <Alert variant="destructive">{orderQuery.error instanceof Error ? orderQuery.error.message : "Unable to load order."}</Alert>
      ) : null}
      {catalogQuery.data?.failedLookups ? <Alert>Some product or shop details could not be loaded. Showing available order data.</Alert> : null}

      {order ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <ShopCard order={order} shop={catalogQuery.data?.shop} />

            <Card className="overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                <h2 className="font-semibold text-slate-950">Order detail</h2>
                <p className="mt-1 text-sm text-slate-500">Products purchased from this shop.</p>
              </div>
              <CardContent className="p-0">
                {(order.items ?? []).map((item) => (
                  <OrderItemRow key={item.id} item={item} product={catalogQuery.data?.products[item.productId]} />
                ))}
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <OrderHistory order={order} />
            <PricingSummary order={order} payment={payment} />
          </aside>
        </div>
      ) : null}
    </main>
  );
}
