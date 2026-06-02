"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ApiTable, EmptyRow } from "@/components/api-workspace/primitives";
import { ErrorRow, LoadingRow } from "@/components/api-workspace/table-rows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { fetchCustomers } from "@/lib/api";

export function ProfileView() {
  const { data: session, status } = useSession();
  const authQueryKey = status === "authenticated" ? (session?.user.email ?? "authenticated") : "anonymous";

  const customersQuery = useQuery({
    queryKey: ["customer-records", authQueryKey],
    queryFn: () => fetchCustomers(),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });

  const customers = customersQuery.data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline">CUSTOMER</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Profile & wallet</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">View your customer profile details and wallet balance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to products</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => void customersQuery.refetch()}
            disabled={customersQuery.isFetching}
          >
            Refresh
          </Button>
        </div>
      </div>

      {status === "loading" ? <p className="text-sm text-slate-500">Loading customer session...</p> : null}

      <ApiTable title="Profile" headers={["Customer", "Email", "Status", "Wallet"]}>
        {customersQuery.isLoading ? <LoadingRow colSpan={4} label="Loading customers..." /> : null}
        {customersQuery.isError ? (
          <ErrorRow colSpan={4} error={customersQuery.error} onRetry={() => void customersQuery.refetch()} />
        ) : null}
        {!customersQuery.isLoading && !customersQuery.isError && customers.length === 0 ? (
          <EmptyRow colSpan={4} label="No customer records returned." />
        ) : null}
        {customers.map((customer) => (
          <TableRow key={customer.customerId}>
            <TableCell className="font-medium">
              {customer.firstName} {customer.lastName}
            </TableCell>
            <TableCell>{customer.email}</TableCell>
            <TableCell>
              <Badge variant={customer.status === "ACTIVE" ? "secondary" : "outline"}>{customer.status}</Badge>
            </TableCell>
            <TableCell>
              {customer.balance} {customer.currency}
            </TableCell>
          </TableRow>
        ))}
      </ApiTable>
    </main>
  );
}

