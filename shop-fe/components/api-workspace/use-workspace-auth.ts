"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { DialogName } from "@/components/api-workspace/dialogs";
import {
  fetchCategories,
  fetchCustomers,
  fetchOrders,
  fetchPayments,
  fetchProducts,
  fetchShops,
  fetchSkus,
} from "@/lib/api";
import {
  CategoryResponseVo,
  CustomerResponseVo,
  OrderResponseVo,
  PaymentResponseVo,
  ProductResponseVo,
  ShopResponseVo,
  SkuResponseVo,
} from "@/lib/types";

export type WorkspaceMode = "admin" | "shop" | "customer";

export type WorkspaceData = {
  products: ProductResponseVo[];
  categories: CategoryResponseVo[];
  shops: ShopResponseVo[];
  customers: CustomerResponseVo[];
  orders: OrderResponseVo[];
  payments: PaymentResponseVo[];
  skus: SkuResponseVo[];
};

export type WorkspaceFeedback = { kind: "success" | "error"; message: string } | null;

const emptyWorkspaceData: WorkspaceData = {
  products: [],
  categories: [],
  shops: [],
  customers: [],
  orders: [],
  payments: [],
  skus: [],
};

async function fetchWorkspaceData(mode: WorkspaceMode, accessToken?: string): Promise<WorkspaceData> {
  const [shops, customers] = await Promise.all([
    mode === "admin" || mode === "shop" ? fetchShops(accessToken) : Promise.resolve([]),
    mode === "admin" || mode === "customer" ? fetchCustomers(accessToken) : Promise.resolve([]),
  ]);

  const [products, categories, orders, payments] = await Promise.all([
    fetchProducts(accessToken),
    fetchCategories(accessToken),
    fetchOrders(undefined, accessToken),
    fetchPayments(undefined, accessToken),
  ]);

  const firstProductId = products.find((product) => product.id)?.id;
  const skus = firstProductId ? await fetchSkus(firstProductId, accessToken) : [];

  return { products, categories, shops, customers, orders, payments, skus };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useWorkspaceAuth(mode: WorkspaceMode) {
  const { data: session, status } = useSession();
  const [dialog, setDialog] = useState<DialogName>(null);
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken;

  const workspaceQuery = useQuery({
    queryKey: ["api-workspace", mode, accessToken ? "authenticated" : "anonymous"],
    queryFn: () => fetchWorkspaceData(mode, accessToken),
    enabled: status !== "loading",
    staleTime: 30 * 1000,
    retry: 1,
  });

  const workspaceMutation = useMutation({
    mutationFn: async (work: (token?: string) => Promise<unknown>) => work(accessToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["api-workspace", mode] });
      setDialog(null);
    },
  });

  async function submit(work: (token?: string) => Promise<unknown>) {
    await workspaceMutation.mutateAsync(work);
  }

  function loadData() {
    void workspaceQuery.refetch();
  }

  async function requireToken() {
    return accessToken;
  }

  const queryError = workspaceQuery.error;
  const mutationError = workspaceMutation.error;
  const feedback: WorkspaceFeedback = mutationError
    ? { kind: "error", message: getErrorMessage(mutationError, "API request failed") }
    : workspaceMutation.isSuccess
      ? { kind: "success", message: "API request completed successfully." }
      : queryError
        ? { kind: "error", message: getErrorMessage(queryError, "Unable to load API data") }
        : null;

  return {
    accessToken,
    data: workspaceQuery.data ?? emptyWorkspaceData,
    dialog,
    setDialog,
    loading: status === "loading" || workspaceQuery.isLoading,
    fetching: workspaceQuery.isFetching,
    saving: workspaceMutation.isPending,
    feedback,
    isError: workspaceQuery.isError,
    refetch: workspaceQuery.refetch,
    loadData,
    requireToken,
    submit,
  };
}
