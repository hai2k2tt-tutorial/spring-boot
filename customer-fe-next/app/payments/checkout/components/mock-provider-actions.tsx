"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { sendMockPaymentWebhook } from "@/lib/api";

type MockProviderActionsProps = {
  paymentId?: string;
  clientSecret?: string;
};

const mockProviderSecret = process.env.NEXT_PUBLIC_MOCK_PROVIDER_SECRET;

export function MockProviderActions({ paymentId, clientSecret }: MockProviderActionsProps) {
  const queryClient = useQueryClient();
  const webhookMutation = useMutation({
    mutationFn: (status: "SUCCESS" | "FAILED") =>
      sendMockPaymentWebhook(
        {
          paymentId,
          clientSecret,
          status,
          eventId: crypto.randomUUID(),
        },
        mockProviderSecret,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      queryClient.invalidateQueries({ queryKey: ["customer-payments"] });
    },
  });

  if (!paymentId) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-md border border-slate-200 p-4">
      <div>
        <p className="text-sm font-medium text-slate-950">Mock provider execution</p>
        <p className="mt-1 text-sm text-slate-500">
          Simulate the provider returning a webhook. A success webhook marks the payment successful, confirms the order paid, and deducts inventory.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={webhookMutation.isPending} onClick={() => webhookMutation.mutate("SUCCESS")}>
          <CheckCircle2 className="h-4 w-4" />
          Pay successfully
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={webhookMutation.isPending}
          onClick={() => webhookMutation.mutate("FAILED")}
        >
          <XCircle className="h-4 w-4" />
          Fail payment
        </Button>
      </div>
      {webhookMutation.isPending ? <Alert>Sending provider webhook...</Alert> : null}
      {webhookMutation.isError ? (
        <Alert variant="destructive">
          {webhookMutation.error instanceof Error ? webhookMutation.error.message : "Provider webhook failed"}
        </Alert>
      ) : null}
      {webhookMutation.data ? (
        <Alert variant={webhookMutation.data.status === "SUCCESS" ? "success" : "destructive"}>
          Payment is now {webhookMutation.data.status}. Return to the dashboard to see the updated order and inventory.
        </Alert>
      ) : null}
    </div>
  );
}
