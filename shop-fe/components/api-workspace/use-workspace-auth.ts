"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { DialogName } from "@/components/api-workspace/dialogs";
import {
  fetchCategories,
  fetchCurrentShopOrders,
  fetchCurrentShopPayments,
  fetchCurrentShopProducts,
  fetchCurrentShopWallet,
  fetchCustomers,
  fetchOrders,
  fetchPayments,
  fetchProducts,
  fetchShops,
} from "@/lib/api";
import {
  CategoryResponseVo,
  CustomerResponseVo,
  OrderResponseVo,
  PaymentResponseVo,
  ProductResponseVo,
  ShopWalletResponseVo,
  ShopResponseVo,
} from "@/lib/types";

export type WorkspaceMode = "admin" | "shop" | "customer";

export type WorkspaceData = {
  products: ProductResponseVo[];
  categories: CategoryResponseVo[];
  shops: ShopResponseVo[];
  customers: CustomerResponseVo[];
  orders: OrderResponseVo[];
  payments: PaymentResponseVo[];
  shopWallet?: ShopWalletResponseVo;
};

export type WorkspaceFeedback = { kind: "success" | "error"; message: string } | null;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useWorkspaceAuth(mode: WorkspaceMode) {
  const { data: session, status } = useSession();
  const [dialog, setDialog] = useState<DialogName>(null);
  const authQueryKey = status === "authenticated" ? (session?.user.email ?? "authenticated") : "anonymous";
  const loadShops = mode === "admin" || mode === "shop";
  const loadCustomers = mode === "admin" || mode === "shop" || mode === "customer";

  const productsQuery = useQuery({
    queryKey: ["api-workspace-products", mode, authQueryKey],
    queryFn: () => (mode === "shop" ? fetchCurrentShopProducts() : fetchProducts()),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });
  const categoriesQuery = useQuery({
    queryKey: ["api-workspace-categories", mode, authQueryKey],
    queryFn: () => fetchCategories(),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });
  const shopsQuery = useQuery({
    queryKey: ["api-workspace-shops", mode, authQueryKey],
    queryFn: () => fetchShops(),
    enabled: status !== "loading" && loadShops,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const customersQuery = useQuery({
    queryKey: ["api-workspace-customers", mode, authQueryKey],
    queryFn: () => fetchCustomers(),
    enabled: status !== "loading" && loadCustomers,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const ordersQuery = useQuery({
    queryKey: ["api-workspace-orders", mode, authQueryKey],
    queryFn: () => (mode === "shop" ? fetchCurrentShopOrders() : fetchOrders()),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });
  const paymentsQuery = useQuery({
    queryKey: ["api-workspace-payments", mode, authQueryKey],
    queryFn: () => (mode === "shop" ? fetchCurrentShopPayments() : fetchPayments()),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });
  const shopWalletQuery = useQuery({
    queryKey: ["shop-wallet", mode, authQueryKey],
    queryFn: fetchCurrentShopWallet,
    enabled: status !== "loading" && mode === "shop",
    staleTime: 30 * 1000,
    retry: 1,
  });
  const workspaceMutation = useMutation({
    mutationFn: async (work: () => Promise<unknown>) => work(),
    onSuccess: async () => {
      await refetchWorkspace();
      setDialog(null);
    },
  });

  async function submit(work: () => Promise<unknown>) {
    await workspaceMutation.mutateAsync(work);
  }

  function loadData() {
    void refetchWorkspace();
  }

  async function refetchWorkspace() {
    await Promise.allSettled([
      productsQuery.refetch(),
      categoriesQuery.refetch(),
      shopsQuery.refetch(),
      customersQuery.refetch(),
      ordersQuery.refetch(),
      paymentsQuery.refetch(),
      shopWalletQuery.refetch(),
    ]);
  }

  const data: WorkspaceData = {
    products: productsQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    shops: shopsQuery.data ?? [],
    customers: customersQuery.data ?? [],
    orders: ordersQuery.data ?? [],
    payments: paymentsQuery.data ?? [],
    shopWallet: shopWalletQuery.data,
  };
  const queryError =
    productsQuery.error ||
    categoriesQuery.error ||
    shopsQuery.error ||
    customersQuery.error ||
    ordersQuery.error ||
    paymentsQuery.error ||
    shopWalletQuery.error;
  const mutationError = workspaceMutation.error;
  const feedback: WorkspaceFeedback = mutationError
    ? { kind: "error", message: getErrorMessage(mutationError, "API request failed") }
    : workspaceMutation.isSuccess
      ? { kind: "success", message: "API request completed successfully." }
      : queryError
        ? { kind: "error", message: getErrorMessage(queryError, "Unable to load API data") }
        : null;

  const loading =
    status === "loading" ||
    productsQuery.isLoading ||
    categoriesQuery.isLoading ||
    shopsQuery.isLoading ||
    customersQuery.isLoading ||
    ordersQuery.isLoading ||
    paymentsQuery.isLoading ||
    shopWalletQuery.isLoading;
  const fetching =
    productsQuery.isFetching ||
    categoriesQuery.isFetching ||
    shopsQuery.isFetching ||
    customersQuery.isFetching ||
    ordersQuery.isFetching ||
    paymentsQuery.isFetching ||
    shopWalletQuery.isFetching;
  const isError =
    productsQuery.isError ||
    categoriesQuery.isError ||
    shopsQuery.isError ||
    customersQuery.isError ||
    ordersQuery.isError ||
    paymentsQuery.isError ||
    shopWalletQuery.isError;

  return {
    data,
    dialog,
    setDialog,
    loading,
    fetching,
    saving: workspaceMutation.isPending,
    feedback,
    isError,
    refetch: refetchWorkspace,
    loadData,
    submit,
  };
}
