import { PaymentMethod } from "@/lib/types";
import { PaymentCheckoutView } from "./components/payment-checkout-view";

type PaymentCheckoutPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PaymentCheckoutPage({ searchParams }: PaymentCheckoutPageProps) {
  const resolvedSearchParams = await searchParams;
  const orderId = getSearchParamValue(resolvedSearchParams.orderId);
  const method = getSearchParamValue(resolvedSearchParams.method);
  const paymentMethod: PaymentMethod = method === "MANUAL" || method === "BALANCE" ? method : "CARD";

  return <PaymentCheckoutView orderId={orderId} method={paymentMethod} />;
}
