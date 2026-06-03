"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, RefreshCw, Store } from "lucide-react";
import { useSession } from "next-auth/react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchOrders, fetchProduct, fetchShopByProductShopId } from "@/lib/api";
import { OrderItemResponseVo, OrderResponseVo, ProductResponseVo, ShopResponseVo, UUID } from "@/lib/types";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

type OrderCatalogDetails = {
  products: Record<UUID, ProductResponseVo>;
  shops: Record<UUID, ShopResponseVo>;
  failedLookups: number;
};

function uniqueIds(ids: UUID[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

async function fetchOrderCatalogDetails(orders: OrderResponseVo[]): Promise<OrderCatalogDetails> {
  const items = orders.flatMap((order) => order.items ?? []);
  const productIds = uniqueIds(items.map((item) => item.productId));
  const shopIds = uniqueIds(items.map((item) => item.shopId));

  const [productResults, shopResults] = await Promise.all([
    Promise.allSettled(productIds.map(async (productId) => [productId, await fetchProduct(productId)] as const)),
    Promise.allSettled(shopIds.map(async (shopId) => [shopId, await fetchShopByProductShopId(shopId)] as const)),
  ]);

  const products: Record<UUID, ProductResponseVo> = {};
  const shops: Record<UUID, ShopResponseVo> = {};
  let failedLookups = 0;

  for (const result of productResults) {
    if (result.status === "fulfilled") {
      const [productId, product] = result.value;
      products[productId] = product;
    } else {
      failedLookups += 1;
    }
  }

  for (const result of shopResults) {
    if (result.status === "fulfilled") {
      const [shopId, shop] = result.value;
      shops[shopId] = shop;
    } else {
      failedLookups += 1;
    }
  }

  return { products, shops, failedLookups };
}

function formatMoney(value: number | string | undefined) {
  const amount = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "-";
}

function statusVariant(status: string) {
  if (status === "PAID") return "secondary";
  if (status === "CANCELED") return "destructive";
  return "outline";
}

function normalizeStatus(status: string) {
  return status.replaceAll("_", " ");
}

type OrderItemCardProps = {
  item: OrderItemResponseVo;
  product?: ProductResponseVo;
};

function OrderItemCard({ item, product }: OrderItemCardProps) {
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

type OrderCardProps = {
  order: OrderResponseVo;
  details?: OrderCatalogDetails;
};

function OrderCard({ order, details }: OrderCardProps) {
  const firstItem = order.items?.[0];
  const shop = firstItem ? details?.shops[firstItem.shopId] : undefined;
  const shopLabel = shop?.shopName ?? (firstItem ? `Shop ${firstItem.shopId.slice(0, 8)}` : "Shop");
  const shopHref = shop?.shopId ? `/shops/${shop.shopId}` : undefined;
  const orderHref = `/orders/${order.id}`;

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
            <Store className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            {shopHref ? (
              <Link href={shopHref} className="block truncate text-sm font-semibold text-slate-950 hover:underline">
                {shopLabel}
              </Link>
            ) : (
              <p className="truncate text-sm font-semibold text-slate-950">{shopLabel}</p>
            )}
            <Link href={orderHref} className="text-xs text-slate-500 hover:text-slate-950 hover:underline">
              Order #{order.orderNumber}
            </Link>
          </div>
        </div>
        <Badge variant={statusVariant(order.status)} className="w-fit uppercase tracking-wide">
          {normalizeStatus(order.status)}
        </Badge>
      </div>

      <CardContent className="p-0">
        {(order.items ?? []).map((item) => (
          <OrderItemCard key={item.id} item={item} product={details?.products[item.productId]} />
        ))}
      </CardContent>

      <div className="flex flex-col gap-3 border-t border-slate-100 bg-orange-50/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-xs text-slate-500">Created {formatDate(order.createdAt)}</p>
        <Link href={orderHref} className="flex items-baseline justify-between gap-3 sm:justify-end">
          <span className="text-sm text-slate-600">Order Total</span>
          <span className="text-xl font-semibold text-orange-600">{formatMoney(order.totalAmount)}</span>
        </Link>
      </div>
    </Card>
  );
}

export function OrdersView() {
  const { data: session, status } = useSession();
  const authQueryKey = status === "authenticated" ? (session?.user.email ?? "authenticated") : "anonymous";

  const ordersQuery = useQuery({
    queryKey: ["customer-orders", authQueryKey],
    queryFn: () => fetchOrders(),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });

  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const detailKey = useMemo(() => {
    const items = orders.flatMap((order) => order.items ?? []);
    const productIds = uniqueIds(items.map((item) => item.productId)).sort();
    const shopIds = uniqueIds(items.map((item) => item.shopId)).sort();
    return { productIds, shopIds };
  }, [orders]);

  const detailsQuery = useQuery({
    queryKey: ["customer-order-catalog-details", authQueryKey, detailKey.productIds, detailKey.shopIds],
    queryFn: () => fetchOrderCatalogDetails(orders),
    enabled: status !== "loading" && orders.length > 0,
    staleTime: 60 * 1000,
    retry: 1,
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline">CUSTOMER</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Orders</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Track purchases by shop, status, product, and total amount.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to products</Link>
          </Button>
          <Button variant="outline" onClick={() => void ordersQuery.refetch()} disabled={ordersQuery.isFetching}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {status === "loading" ? <Alert>Loading customer session...</Alert> : null}
      {ordersQuery.isLoading ? <Alert>Loading orders...</Alert> : null}
      {ordersQuery.isError ? (
        <Alert variant="destructive">
          {ordersQuery.error instanceof Error ? ordersQuery.error.message : "Unable to load orders."}
        </Alert>
      ) : null}
      {detailsQuery.data?.failedLookups ? (
        <Alert>Some product or shop details could not be loaded. Showing available order data.</Alert>
      ) : null}
      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white">
          <CardContent className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Package className="h-8 w-8 text-slate-400" />
            <p className="font-medium text-slate-950">No orders yet</p>
            <p className="text-sm text-slate-500">Products you purchase will appear here as one-column order cards.</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} details={detailsQuery.data} />
        ))}
      </div>
    </main>
  );
}
