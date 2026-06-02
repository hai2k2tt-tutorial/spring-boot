import Link from "next/link";
import { CreditCard, ReceiptText } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PaymentCheckoutPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PaymentCheckoutPage({ searchParams }: PaymentCheckoutPageProps) {
  const resolvedSearchParams = await searchParams;
  const orderId = getSearchParamValue(resolvedSearchParams.orderId);
  const paymentId = getSearchParamValue(resolvedSearchParams.paymentId);
  const clientSecret = getSearchParamValue(resolvedSearchParams.clientSecret);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl items-center px-4 py-8 sm:px-6">
      <Card className="w-full overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
          <Badge variant="secondary">PAYMENT HANDOFF</Badge>
          <h1 className="mt-3 text-3xl font-semibold">Continue payment</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            The order is pending and a payment record has been created. Connect this page to Stripe, VNPay, or another provider when the backend returns a real payment URL or client secret.
          </p>
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment session
          </CardTitle>
          <CardDescription>Use these identifiers to complete or reconcile the payment flow.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!orderId || !paymentId ? (
            <Alert variant="destructive">Missing order or payment information. Return to the product page and create the order again.</Alert>
          ) : (
            <div className="grid gap-3 rounded-md border border-slate-200 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-slate-500">Order ID</p>
                <p className="break-all font-medium text-slate-950">{orderId}</p>
              </div>
              <div>
                <p className="text-slate-500">Payment ID</p>
                <p className="break-all font-medium text-slate-950">{paymentId}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-slate-500">Client secret</p>
                <p className="break-all font-medium text-slate-950">{clientSecret ?? "Not returned by backend"}</p>
              </div>
            </div>
          )}

          <Alert>
            Current backend support stops at creating a pending payment record. A provider checkout page requires the backend to return `paymentUrl` or `clientSecret` from payment creation.
          </Alert>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard">
                <ReceiptText className="h-4 w-4" />
                View dashboard
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/products">Back to products</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
