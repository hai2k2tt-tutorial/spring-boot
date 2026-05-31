"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { use, useState } from "react";
import { AttributeDialog } from "@/components/api-workspace/dialogs/attribute-dialog";
import { OrderDialog } from "@/components/api-workspace/dialogs/order-dialog";
import { SkuDialog } from "@/components/api-workspace/dialogs/sku-dialog";
import { StockDialog } from "@/components/api-workspace/dialogs/stock-dialog";
import { ApiTable, EmptyRow } from "@/components/api-workspace/primitives";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { fetchAttributes, fetchProduct, fetchSkus } from "@/lib/api";

type DialogName = "attribute" | "sku" | "stock" | "order" | null;

type Feedback = { kind: "success" | "error"; message: string } | null;

type ProductDetailPageProps = {
  params: Promise<{ productId: string }>;
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId } = use(params);
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogName>(null);
  const [activeSkuCode, setActiveSkuCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const handleSubmit = async (work: () => Promise<unknown>) => {
    await submitMutation.mutateAsync(work);
  };

  const productQuery = useQuery({
    queryKey: ["shop-product", productId],
    queryFn: () => fetchProduct(productId),
    enabled: !!productId,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const attributesQuery = useQuery({
    queryKey: ["shop-attributes", productId],
    queryFn: () => fetchAttributes(productId),
    enabled: !!productId,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const skusQuery = useQuery({
    queryKey: ["shop-skus", productId],
    queryFn: () => fetchSkus(productId),
    enabled: !!productId,
    staleTime: 30 * 1000,
    retry: 1,
  });

  const submitMutation = useMutation({
    mutationFn: async (work: () => Promise<unknown>) => work(),
    onSuccess: async () => {
      setFeedback({ kind: "success", message: "Update saved." });
      await Promise.allSettled([attributesQuery.refetch(), skusQuery.refetch()]);
      await queryClient.invalidateQueries({ queryKey: ["api-workspace-orders"] });
      setDialog(null);
      setActiveSkuCode(null);
    },
    onError: (error) => {
      setFeedback({ kind: "error", message: getErrorMessage(error, "API request failed") });
    },
  });

  const loading = productQuery.isLoading || attributesQuery.isLoading || skusQuery.isLoading;
  const isError = productQuery.isError || attributesQuery.isError || skusQuery.isError;
  const product = productQuery.data;

  function closeDialog() {
    setDialog(null);
    setActiveSkuCode(null);
  }

  function openOrderDialog(skuCode: string) {
    setActiveSkuCode(skuCode);
    setDialog("order");
  }

  function openStockDialog(skuCode: string) {
    setActiveSkuCode(skuCode);
    setDialog("stock");
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" size="sm" className="w-fit px-2 text-slate-600">
            <Link href="/shop">
              <ArrowLeft className="h-4 w-4" />
              Back to workspace
            </Link>
          </Button>
          <div>
            <Badge variant="outline">PRODUCT</Badge>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{product?.name ?? "Product detail"}</h1>
            <p className="mt-1 text-sm text-slate-600">Manage attributes, SKUs, inventory checks, and orders for this product.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void Promise.all([productQuery.refetch(), attributesQuery.refetch(), skusQuery.refetch()])}>
            Refresh
          </Button>
          <Button onClick={() => setDialog("sku")}>
            <Plus className="h-4 w-4" />
            SKU
          </Button>
          <Button variant="secondary" onClick={() => setDialog("attribute")}>
            Attribute
          </Button>
        </div>
      </div>

      {feedback ? (
        <Alert variant={feedback.kind === "error" ? "destructive" : "success"}>{feedback.message}</Alert>
      ) : null}
      {loading ? <p className="text-sm text-slate-500">Loading product detail...</p> : null}
      {isError ? (
        <Button type="button" variant="outline" onClick={() => void Promise.all([productQuery.refetch(), attributesQuery.refetch(), skusQuery.refetch()])}>
          Retry loading data
        </Button>
      ) : null}

      {product ? (
        <div className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Overview</h2>
            <Badge variant={product.status === "ACTIVE" ? "secondary" : "outline"}>{product.status ?? "N/A"}</Badge>
          </div>
          <div className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <span className="font-medium text-slate-950">Price</span>
              <div>${product.price}</div>
            </div>
            <div>
              <span className="font-medium text-slate-950">Category</span>
              <div>{product.categoryId ?? "-"}</div>
            </div>
            <div>
              <span className="font-medium text-slate-950">Updated</span>
              <div>{product.updatedAt ? new Date(product.updatedAt).toLocaleString() : "-"}</div>
            </div>
            <div>
              <span className="font-medium text-slate-950">Description</span>
              <div>{product.description}</div>
            </div>
          </div>
        </div>
      ) : null}

      <ApiTable title="Attributes" headers={["Code", "Name", "Values", "Updated"]}>
        {attributesQuery.data?.length ? null : <EmptyRow colSpan={4} label="No attributes returned." />}
        {attributesQuery.data?.map((attribute) => (
          <TableRow key={attribute.id}>
            <TableCell className="font-medium">{attribute.code}</TableCell>
            <TableCell>{attribute.name}</TableCell>
            <TableCell>
              {attribute.values?.length
                ? attribute.values.map((value) => value.value).join(", ")
                : "-"}
            </TableCell>
            <TableCell className="text-slate-500">{new Date(attribute.updatedAt).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </ApiTable>

      <ApiTable title="SKUs" headers={["SKU", "Price override", "Quantity", "Created", "Actions"]}>
        {skusQuery.data?.length ? null : <EmptyRow colSpan={5} label="No SKUs returned." />}
        {skusQuery.data?.map((sku) => (
          <TableRow key={sku.id}>
            <TableCell className="font-medium">{sku.skuCode}</TableCell>
            <TableCell>{sku.priceOverride ?? "-"}</TableCell>
            <TableCell>{sku.quantity}</TableCell>
            <TableCell className="text-slate-500">{new Date(sku.createdAt).toLocaleString()}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openStockDialog(sku.skuCode)}>
                  Stock check
                </Button>
                <Button size="sm" onClick={() => openOrderDialog(sku.skuCode)}>
                  Create order
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </ApiTable>

      <AttributeDialog
        open={dialog === "attribute"}
        onClose={closeDialog}
        saving={submitMutation.isPending}
        submit={handleSubmit}
        defaultProductId={productId}
      />
      <SkuDialog
        open={dialog === "sku"}
        onClose={closeDialog}
        saving={submitMutation.isPending}
        submit={handleSubmit}
        defaultProductId={productId}
      />
      <OrderDialog
        open={dialog === "order"}
        onClose={closeDialog}
        saving={submitMutation.isPending}
        submit={handleSubmit}
        defaultSkuCode={activeSkuCode ?? undefined}
      />
      <StockDialog open={dialog === "stock"} onClose={closeDialog} defaultSkuCode={activeSkuCode} />
    </main>
  );
}
