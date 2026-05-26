"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ApiMetricData = {
  products: unknown[];
  shops: unknown[];
  customers: unknown[];
  payments: unknown[];
};

export function ApiMetrics({ data }: { data: ApiMetricData }) {
  const { products, shops, customers, payments } = data;
  return (
    <section className="grid gap-4 md:grid-cols-4">
      {[
        ["Products", products.length],
        ["Shops", shops.length],
        ["Customers", customers.length],
        ["Payments", payments.length],
      ].map(([label, value]) => (
        <Card key={String(label)}>
          <CardHeader>
            <CardTitle className="text-sm text-slate-500">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-950">{value}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
