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
import { FormMessage } from "@/components/ui/form-message";
import { createSku, fetchAttributes, fetchProducts, fetchSkus } from "@/lib/api";
import { AttributeResponseVo, SkuResponseVo } from "@/lib/types";
import { FormDialogProps } from "./types";

export function SkuDialog({ open, onClose, saving, submit }: FormDialogProps) {
  const form = useForm<z.input<typeof skuSchema>, undefined, z.output<typeof skuSchema>>({
    resolver: zodResolver(skuSchema),
    defaultValues: { productId: "", skuCode: "", priceOverride: "0", quantity: "0", attributeValueIds: [] },
  });
  const selectedProductId = useWatch({ control: form.control, name: "productId" });
  const selectedAttributeValueIds = useWatch({ control: form.control, name: "attributeValueIds" }) ?? [];
  const productsQuery = useQuery({
    queryKey: ["admin-product-options"],
    queryFn: () => fetchProducts(),
    enabled: open,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const attributesQuery = useQuery({
    queryKey: ["admin-attribute-values", selectedProductId],
    queryFn: () => fetchAttributes(selectedProductId),
    enabled: open && !!selectedProductId,
    staleTime: 30 * 1000,
    retry: 1,
  });
  const skusQuery = useQuery({
    queryKey: ["admin-sku-combinations", selectedProductId],
    queryFn: () => fetchSkus(selectedProductId),
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
    form.setValue("attributeValueIds", [], { shouldDirty: true });
    form.clearErrors("attributeValueIds");
  }, [form, selectedProductId]);

  function toggleAttributeValue(attributeId: string, valueId: string) {
    const attributeValueIds = new Set(
      attributesQuery.data?.find((attribute) => attribute.id === attributeId)?.values.map((value) => value.id) ?? [],
    );
    const nextValueIds = selectedAttributeValueIds.includes(valueId)
      ? selectedAttributeValueIds.filter((id) => id !== valueId)
      : [...selectedAttributeValueIds.filter((id) => !attributeValueIds.has(id)), valueId];
    form.setValue("attributeValueIds", nextValueIds, { shouldDirty: true, shouldValidate: true });
  }

  function handleSubmit(values: z.output<typeof skuSchema>) {
    const attributeValueIds = values.attributeValueIds ?? [];
    if (hasDuplicateAttributeSelection(attributesQuery.data ?? [], attributeValueIds)) {
      form.setError("attributeValueIds", {
        type: "validate",
        message: "Select only one value for each attribute",
      });
      return;
    }
    if (hasExistingSkuCombination(skusQuery.data ?? [], attributeValueIds)) {
      form.setError("attributeValueIds", {
        type: "validate",
        message: "A SKU with the same attribute values already exists",
      });
      return;
    }

    return submit(() => createSku({ ...values, attributeValueIds }));
  }

  return (
    <Modal title="Create SKU" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(handleSubmit)}>
          <SelectField
            name="productId"
            label="Product"
            options={productOptions}
            placeholder={productPlaceholder}
            disabled={productsQuery.isLoading || productsQuery.isError}
          />
          <InputField name="skuCode" label="SKU code" />
          <InputField name="priceOverride" label="Price override" type="number" />
          <InputField name="quantity" label="Quantity" type="number" />
          <div className="space-y-3 sm:col-span-2">
            <span className="text-sm font-medium text-slate-950">Attribute values</span>
            <FormMessage>{form.formState.errors.attributeValueIds?.message}</FormMessage>
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
                          onClick={() => toggleAttributeValue(attribute.id, value.id)}
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
          <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save SKU</Button>
        </form>
      </FormProvider>
    </Modal>
  );
}

function hasDuplicateAttributeSelection(attributes: AttributeResponseVo[], selectedValueIds: string[]) {
  const selectedAttributeIds = selectedValueIds
    .map((valueId) => attributes.find((attribute) => attribute.values.some((value) => value.id === valueId))?.id)
    .filter((attributeId): attributeId is string => Boolean(attributeId));
  return new Set(selectedAttributeIds).size !== selectedAttributeIds.length;
}

function hasExistingSkuCombination(skus: SkuResponseVo[], selectedValueIds: string[]) {
  const selectedValues = new Set(selectedValueIds);
  return skus.some((sku) => {
    const skuValues = new Set(sku.attributeValueIds);
    return skuValues.size === selectedValues.size && sku.attributeValueIds.every((valueId) => selectedValues.has(valueId));
  });
}
