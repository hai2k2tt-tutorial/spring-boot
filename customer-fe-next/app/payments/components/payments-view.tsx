"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ApiTable, EmptyRow } from "@/components/api-workspace/primitives";
import { ErrorRow, LoadingRow } from "@/components/api-workspace/table-rows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { fetchPayments } from "@/lib/api";

export function PaymentsView() {
  const { data: session, status } = useSession();
  const authQueryKey = status === "authenticated" ? (session?.user.email ?? "authenticated") : "anonymous";

  const paymentsQuery = useQuery({
    queryKey: ["customer-payments", authQueryKey],
    queryFn: () => fetchPayments(),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });

  const payments = paymentsQuery.data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline">CUSTOMER</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Payments</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">Review payment activity tied to your orders.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to products</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => void paymentsQuery.refetch()}
            disabled={paymentsQuery.isFetching}
          >
            Refresh
          </Button>
        </div>
      </div>

      {status === "loading" ? <p className="text-sm text-slate-500">Loading customer session...</p> : null}

      <ApiTable title="Payments" headers={["Payment", "Order", "Method", "Status", "Amount"]}>
        {paymentsQuery.isLoading ? <LoadingRow colSpan={5} label="Loading payments..." /> : null}
        {paymentsQuery.isError ? (
          <ErrorRow colSpan={5} error={paymentsQuery.error} onRetry={() => void paymentsQuery.refetch()} />
        ) : null}
        {!paymentsQuery.isLoading && !paymentsQuery.isError && payments.length === 0 ? (
          <EmptyRow colSpan={5} label="No payments returned." />
        ) : null}
        {payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell className="font-medium">{payment.id}</TableCell>
            <TableCell>{payment.orderId}</TableCell>
            <TableCell>{payment.method}</TableCell>
            <TableCell>
              <Badge
                variant={
                  payment.status === "SUCCESS" ? "secondary" : payment.status === "FAILED" ? "destructive" : "outline"
                }
              >
                {payment.status}
              </Badge>
            </TableCell>
            <TableCell>${payment.amount}</TableCell>
          </TableRow>
        ))}
      </ApiTable>
    </main>
  );
}

