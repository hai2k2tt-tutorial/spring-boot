"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, LoaderCircle, RefreshCw, Store } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchWallet, fetchWalletTransactions } from "@/lib/api";
import { WalletTransactionResponseVo } from "@/lib/types";

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
function formatMoney(value: number | string | undefined) { const amount = Number(value ?? 0); return currencyFormatter.format(Number.isFinite(amount) ? amount : 0); }
function formatDate(value?: string) { return value ? new Date(value).toLocaleString() : "-"; }

function TransactionRow({ transaction }: { transaction: WalletTransactionResponseVo }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-slate-100 px-4 py-4 first:border-t-0 sm:px-5">
      <div className="flex min-w-0 gap-3">
        <div className="mt-1 rounded-full bg-emerald-50 p-2 text-emerald-600"><ArrowDownLeft className="h-4 w-4" /></div>
        <div className="min-w-0"><p className="font-medium text-slate-950">Money in</p><p className="mt-1 text-sm text-slate-500">{transaction.description || transaction.externalRef || "Shop wallet credit"}</p><p className="mt-1 text-xs text-slate-400">{formatDate(transaction.createdAt)}</p></div>
      </div>
      <div className="shrink-0 text-right"><p className="font-semibold text-emerald-600">+{formatMoney(transaction.amount)}</p><p className="mt-1 text-xs text-slate-500">Balance {formatMoney(transaction.balanceAfter)}</p></div>
    </div>
  );
}

export function ShopWalletView() {
  const { status } = useSession();
  const walletQuery = useQuery({ queryKey: ["shop-wallet"], queryFn: fetchWallet, enabled: status === "authenticated", staleTime: 30 * 1000, retry: 1 });
  const transactionsQuery = useQuery({ queryKey: ["shop-wallet-transactions"], queryFn: fetchWalletTransactions, enabled: status === "authenticated", staleTime: 30 * 1000, retry: 1 });
  async function refreshWallet() { await Promise.allSettled([walletQuery.refetch(), transactionsQuery.refetch()]); }
  const wallet = walletQuery.data;
  const transactions = transactionsQuery.data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-sm"><Badge variant="outline" className="border-white/20 bg-white/10 text-white">SHOP WALLET</Badge><h1 className="mt-4 text-4xl font-semibold tracking-tight">Shop wallet</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Login with the same shop SSO used by Shop FE. Money from customer wallet purchases is credited here.</p>{status === "unauthenticated" ? <Button type="button" className="mt-5 bg-white text-slate-950 hover:bg-slate-100" onClick={() => void signIn("keycloak")}>Login with shop SSO</Button> : null}</section>
      {status === "loading" ? <Alert>Loading session...</Alert> : null}
      {walletQuery.isError ? <Alert variant="destructive">{walletQuery.error instanceof Error ? walletQuery.error.message : "Unable to load wallet"}</Alert> : null}
      {transactionsQuery.isError ? <Alert variant="destructive">{transactionsQuery.error instanceof Error ? transactionsQuery.error.message : "Unable to load wallet history"}</Alert> : null}
      {status === "authenticated" ? <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"><Card className="overflow-hidden"><CardHeader><CardTitle>Incoming money</CardTitle><CardDescription>Most recent shop wallet credits appear first.</CardDescription></CardHeader><CardContent className="p-0">{transactionsQuery.isLoading ? <p className="px-5 py-4 text-sm text-slate-500">Loading transactions...</p> : null}{!transactionsQuery.isLoading && transactions.length === 0 ? <p className="px-5 py-4 text-sm text-slate-500">No shop wallet transactions yet.</p> : null}{transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}</CardContent></Card><aside className="space-y-6 lg:sticky lg:top-24 lg:self-start"><Card className="border-slate-900 bg-slate-950 text-white"><CardHeader><CardTitle className="flex items-center gap-2"><Store className="h-5 w-5 text-emerald-300" />Shop balance</CardTitle><CardDescription className="text-slate-300">Funds received from paid customer orders.</CardDescription></CardHeader><CardContent>{walletQuery.isLoading ? <p className="flex items-center gap-2 text-sm text-slate-300"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading wallet...</p> : <div><p className="text-4xl font-semibold tracking-tight text-white">{formatMoney(wallet?.balance)}</p><p className="mt-2 text-sm text-slate-300">Currency {wallet?.currency ?? "USD"}</p><p className="mt-1 text-xs text-slate-400">Updated {formatDate(wallet?.updatedAt)}</p></div>}</CardContent></Card><Button variant="outline" className="w-full" onClick={() => void refreshWallet()} disabled={walletQuery.isFetching || transactionsQuery.isFetching}><RefreshCw className="h-4 w-4" />Refresh wallet</Button></aside></div> : null}
    </main>
  );
}
