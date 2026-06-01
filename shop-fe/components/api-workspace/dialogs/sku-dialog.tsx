"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { InputField, SelectField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { skuSchema } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createSku, fetchAttributes, fetchProducts } from "@/lib/api";
import { FormDialogProps } from "./types";

type SkuDialogProps = FormDialogProps & {
  defaultProductId?: string;
};

const SKU_DEFAULTS = { productId: "", skuCode: "", priceOverride: "0", quantity: "0", attributeValueIds: [] };

export function SkuDialog({ open, onClose, saving, submit, defaultProductId }: SkuDialogProps) {
  const form = useForm<z.input<typeof skuSchema>, undefined, z.output<typeof skuSchema>>({
    resolver: zodResolver(skuSchema),
    defaultValues: SKU_DEFAULTS,
  });

  const selectedProductId = useWatch({ control: form.control, name: "productId" });
  const selectedAttributeValueIds = useWatch({ control: form.control, name: "attributeValueIds" }) ?? [];
  const usesDetailProduct = Boolean(defaultProductId);
  const productsQuery = useQuery({
    queryKey: ["shop-product-options"],
    queryFn: () => fetchProducts(),
    enabled: open && !usesDetailProduct,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const attributesQuery = useQuery({
    queryKey: ["shop-attribute-values", selectedProductId],
    queryFn: () => fetchAttributes(selectedProductId),
    enabled: open && !!selectedProductId,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const productOptions = useMemo(
    () =>
      (productsQuery.data ?? [])
        .filter((product) => !!product.id)
        .map((product) => ({ label: product.name, value: product.id! })),
    [productsQuery.data],
  );
  const productPlaceholder = productsQuery.isLoading
    ? "Loading products..."
    : productsQuery.isError
      ? "Unable to load products"
      : productOptions.length
        ? "Select product"
        : "No products available";

  useEffect(() => {
    if (!open) return;
    form.reset({ ...SKU_DEFAULTS, productId: defaultProductId ?? "" });
  }, [defaultProductId, form, open]);

  function toggleAttributeValue(valueId: string) {
    const nextValueIds = selectedAttributeValueIds.includes(valueId)
      ? selectedAttributeValueIds.filter((id) => id !== valueId)
      : [...selectedAttributeValueIds, valueId];
    form.setValue("attributeValueIds", nextValueIds, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <Modal title="Create SKU" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) =>
            submit(() => createSku({ ...values, attributeValueIds: values.attributeValueIds ?? [] }))
          )}
        >
          {usesDetailProduct ? (
            <input type="hidden" {...form.register("productId")} />
          ) : (
            <SelectField
              name="productId"
              label="Product"
              options={productOptions}
              placeholder={productPlaceholder}
              disabled={productsQuery.isLoading || productsQuery.isError}
            />
          )}
          <InputField name="skuCode" label="SKU code" />
          <InputField name="priceOverride" label="Price override" type="number" />
          <InputField name="quantity" label="Quantity" type="number" />
          <div className="space-y-3 sm:col-span-2">
            <span className="text-sm font-medium text-slate-950">Attribute values</span>
            {!selectedProductId ? <p className="text-sm text-slate-500">Select a product first.</p> : null}
            {attributesQuery.isLoading ? <p className="text-sm text-slate-500">Loading attributes...</p> : null}
            {attributesQuery.isError ? <p className="text-sm text-red-600">Unable to load attributes.</p> : null}
            {!attributesQuery.isLoading && !attributesQuery.isError && selectedProductId && !attributesQuery.data?.length ? (
              <p className="text-sm text-slate-500">No attributes available.</p>
            ) : null}
            <div className="space-y-3">
              {attributesQuery.data?.map((attribute) => (
                <div key={attribute.id} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-[9rem_1fr]">
                  <div className="text-sm font-medium text-slate-700">{attribute.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {attribute.values.map((value) => {
                      const selected = selectedAttributeValueIds.includes(value.id);
                      return (
                        <Button
                          key={value.id}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleAttributeValue(value.id)}
                        >
                          {value.value}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Button className="sm:col-span-2" type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            Save SKU
          </Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
