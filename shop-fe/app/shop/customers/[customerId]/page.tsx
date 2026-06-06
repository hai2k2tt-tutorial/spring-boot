"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { use } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCustomer } from "@/lib/api";

type CustomerProfilePageProps = {
  params: Promise<{ customerId: string }>;
};

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "-";
}

function displayName(firstName?: string, lastName?: string) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Customer profile";
}

export default function CustomerProfilePage({ params }: CustomerProfilePageProps) {
  const { customerId } = use(params);

  const customerQuery = useQuery({
    queryKey: ["shop-customer-profile", customerId],
    queryFn: () => fetchCustomer(customerId),
    enabled: Boolean(customerId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const customer = customerQuery.data;
  const name = displayName(customer?.firstName, customer?.lastName);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Button asChild variant="outline" size="sm" className="mb-4 w-fit px-2 text-slate-600">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to workspace
            </Link>
          </Button>
          <Badge variant="outline">CUSTOMER</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">{name}</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Read-only customer profile details for shop order review.
          </p>
        </div>
        <Button variant="outline" onClick={() => void customerQuery.refetch()} disabled={customerQuery.isFetching}>
          Refresh
        </Button>
      </div>

      {customerQuery.isLoading ? <p className="text-sm text-slate-500">Loading customer profile...</p> : null}
      {customerQuery.isError ? (
        <Alert variant="destructive">
          {customerQuery.error instanceof Error ? customerQuery.error.message : "Unable to load customer profile"}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Customer-owned data is read-only from the shop workspace.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label="First name" value={customer?.firstName} />
            <Detail label="Last name" value={customer?.lastName} />
            <Detail label="Email" value={customer?.email} />
            <Detail label="Phone" value={customer?.phone} />
            <Detail label="Status" value={customer?.status} />
            <Detail label="Customer ID" value={customer?.customerId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account detail</CardTitle>
            <CardDescription>Identity context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Detail label="Auth created" value={formatDate(customer?.authCreatedAt)} />
            <Detail label="Profile updated" value={formatDate(customer?.profileUpdatedAt)} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-slate-950">{value || "-"}</p>
    </div>
  );
}
