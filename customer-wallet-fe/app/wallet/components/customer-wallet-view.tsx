"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, LoaderCircle, RefreshCw, WalletCards } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField } from "@/components/forms";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { depositWallet, fetchWallet, fetchWalletTransactions } from "@/lib/api";
import { WalletTransactionResponseVo } from "@/lib/types";
import { createUuid } from "@/lib/uuid";

const topUpSchema = z.object({ amount: z.coerce.number().positive("Amount must be greater than zero") });
type TopUpFormValues = z.input<typeof topUpSchema>;
const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
function formatMoney(value: number | string | undefined) { const amount = Number(value ?? 0); return currencyFormatter.format(Number.isFinite(amount) ? amount : 0); }
function formatDate(value?: string) { return value ? new Date(value).toLocaleString() : "-"; }

function TransactionRow({ transaction }: { transaction: WalletTransactionResponseVo }) {
  const isCredit = transaction.type === "CREDIT";
  const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="flex items-start justify-between gap-4 border-t border-slate-100 px-4 py-4 first:border-t-0 sm:px-5">
      <div className="flex min-w-0 gap-3">
        <div className={isCredit ? "mt-1 rounded-full bg-emerald-50 p-2 text-emerald-600" : "mt-1 rounded-full bg-orange-50 p-2 text-orange-600"}><Icon className="h-4 w-4" /></div>
        <div className="min-w-0"><p className="font-medium text-slate-950">{isCredit ? "Money in" : "Money out"}</p><p className="mt-1 text-sm text-slate-500">{transaction.description || transaction.externalRef || "Wallet transaction"}</p><p className="mt-1 text-xs text-slate-400">{formatDate(transaction.createdAt)}</p></div>
      </div>
      <div className="shrink-0 text-right"><p className={isCredit ? "font-semibold text-emerald-600" : "font-semibold text-orange-600"}>{isCredit ? "+" : "-"}{formatMoney(transaction.amount)}</p><p className="mt-1 text-xs text-slate-500">Balance {formatMoney(transaction.balanceAfter)}</p></div>
    </div>
  );
}

export function CustomerWalletView() {
  const { status } = useSession();
  const signInStartedRef = useRef(false);
  const queryClient = useQueryClient();
  const form = useForm<TopUpFormValues>({ resolver: zodResolver(topUpSchema), defaultValues: { amount: "50" } });
  const walletQuery = useQuery({ queryKey: ["customer-wallet"], queryFn: fetchWallet, enabled: status === "authenticated", staleTime: 30 * 1000, retry: 1 });
  const transactionsQuery = useQuery({ queryKey: ["customer-wallet-transactions"], queryFn: fetchWalletTransactions, enabled: status === "authenticated", staleTime: 30 * 1000, retry: 1 });
  const topUpMutation = useMutation({
    mutationFn: (values: TopUpFormValues) => depositWallet({ amount: Number(values.amount), currency: walletQuery.data?.currency ?? "USD", externalRef: createUuid(), description: "Customer wallet top up" }),
    onSuccess: async (wallet) => { queryClient.setQueryData(["customer-wallet"], wallet); await queryClient.invalidateQueries({ queryKey: ["customer-wallet-transactions"] }); form.reset({ amount: "50" }); },
  });
  useEffect(() => {
    if (status !== "unauthenticated" || signInStartedRef.current) return;

    signInStartedRef.current = true;
    void signIn("keycloak", { callbackUrl: "/" });
  }, [status]);

  async function refreshWallet() { await Promise.allSettled([walletQuery.refetch(), transactionsQuery.refetch()]); }
  const wallet = walletQuery.data;
  const transactions = transactionsQuery.data ?? [];
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-6 text-white shadow-sm"><Badge variant="outline" className="border-white/20 bg-white/10 text-white">CUSTOMER WALLET</Badge><h1 className="mt-4 text-4xl font-semibold tracking-tight">My wallet</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Login with the same customer SSO used by Customer FE, then pay products from this balance.</p>{status === "unauthenticated" ? <Button type="button" className="mt-5 bg-white text-slate-950 hover:bg-slate-100" onClick={() => void signIn("keycloak")}>Login with customer SSO</Button> : null}</section>
      {status === "loading" ? <Alert>Loading session...</Alert> : null}
      {walletQuery.isError ? <Alert variant="destructive">{walletQuery.error instanceof Error ? walletQuery.error.message : "Unable to load wallet"}</Alert> : null}
      {transactionsQuery.isError ? <Alert variant="destructive">{transactionsQuery.error instanceof Error ? transactionsQuery.error.message : "Unable to load wallet history"}</Alert> : null}
      {topUpMutation.isSuccess ? <Alert variant="success">Wallet topped up.</Alert> : null}
      {topUpMutation.isError ? <Alert variant="destructive">{topUpMutation.error instanceof Error ? topUpMutation.error.message : "Unable to top up wallet"}</Alert> : null}
      {status === "authenticated" ? <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><Card className="overflow-hidden"><CardHeader><CardTitle>Money in/out</CardTitle><CardDescription>Most recent customer wallet transactions appear first.</CardDescription></CardHeader><CardContent className="p-0">{transactionsQuery.isLoading ? <p className="px-5 py-4 text-sm text-slate-500">Loading transactions...</p> : null}{!transactionsQuery.isLoading && transactions.length === 0 ? <p className="px-5 py-4 text-sm text-slate-500">No wallet transactions yet.</p> : null}{transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}</CardContent></Card><aside className="space-y-6 lg:sticky lg:top-24 lg:self-start"><Card className="border-slate-900 bg-slate-950 text-white"><CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-orange-300" />Current balance</CardTitle><CardDescription className="text-slate-300">Available for wallet checkout.</CardDescription></CardHeader><CardContent>{walletQuery.isLoading ? <p className="flex items-center gap-2 text-sm text-slate-300"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading wallet...</p> : <div><p className="text-4xl font-semibold tracking-tight text-white">{formatMoney(wallet?.balance)}</p><p className="mt-2 text-sm text-slate-300">Currency {wallet?.currency ?? "USD"}</p><p className="mt-1 text-xs text-slate-400">Updated {formatDate(wallet?.updatedAt)}</p></div>}</CardContent></Card><Button variant="outline" className="w-full" onClick={() => void refreshWallet()} disabled={walletQuery.isFetching || transactionsQuery.isFetching}><RefreshCw className="h-4 w-4" />Refresh wallet</Button><Card><CardHeader><CardTitle>Simulate top up</CardTitle><CardDescription>Add customer funds for wallet checkout testing.</CardDescription></CardHeader><CardContent><FormProvider {...form}><form className="space-y-4" onSubmit={form.handleSubmit((values) => topUpMutation.mutate(values))}><InputField<TopUpFormValues> name="amount" label="Amount" type="number" min="1" step="0.01" /><Button type="submit" className="w-full" disabled={topUpMutation.isPending}>{topUpMutation.isPending ? "Adding..." : "Add funds"}</Button></form></FormProvider></CardContent></Card></aside></div> : null}
    </main>
  );
}
