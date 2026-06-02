"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ApiTable, EmptyRow } from "@/components/api-workspace/primitives";
import { ErrorRow, LoadingRow } from "@/components/api-workspace/table-rows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { fetchOrders } from "@/lib/api";

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

  const orders = ordersQuery.data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline">CUSTOMER</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Orders</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">Track recent orders and their fulfillment status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to products</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => void ordersQuery.refetch()}
            disabled={ordersQuery.isFetching}
          >
            Refresh
          </Button>
        </div>
      </div>

      {status === "loading" ? <p className="text-sm text-slate-500">Loading customer session...</p> : null}

      <ApiTable title="Orders" headers={["Order", "Status", "Total", "Items", "Created"]}>
        {ordersQuery.isLoading ? <LoadingRow colSpan={5} label="Loading orders..." /> : null}
        {ordersQuery.isError ? (
          <ErrorRow colSpan={5} error={ordersQuery.error} onRetry={() => void ordersQuery.refetch()} />
        ) : null}
        {!ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0 ? (
          <EmptyRow colSpan={5} label="No orders returned." />
        ) : null}
        {orders.map((order) => {
          const createdAtLabel = order.createdAt ? new Date(order.createdAt).toLocaleString() : "-";
          return (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.orderNumber}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    order.status === "PAID" ? "secondary" : order.status === "CANCELED" ? "destructive" : "outline"
                  }
                >
                  {order.status}
                </Badge>
              </TableCell>
              <TableCell>${order.totalAmount}</TableCell>
              <TableCell>{order.items?.length ?? 0}</TableCell>
              <TableCell className="text-slate-500">{createdAtLabel}</TableCell>
            </TableRow>
          );
        })}
      </ApiTable>
    </main>
  );
}

