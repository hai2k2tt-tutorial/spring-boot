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
  const productsQuery = useQuery({
    queryKey: ["shop-product-options"],
    queryFn: () => fetchProducts(),
    enabled: open,
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
  const attributeValueOptions = useMemo(
    () =>
      (attributesQuery.data ?? []).flatMap((attribute) =>
        attribute.values.map((value) => ({
          label: `${attribute.name}: ${value.value}`,
          value: value.id,
        })),
      ),
    [attributesQuery.data],
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

  return (
    <Modal title="Create SKU" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) =>
            submit(() => createSku({ ...values, attributeValueIds: values.attributeValueIds ?? [] }))
          )}
        >
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
          <SelectField
            name="attributeValueIds"
            label="Attribute values"
            options={attributeValueOptions}
            multiple
            size={6}
            disabled={!selectedProductId || attributesQuery.isLoading || attributesQuery.isError}
            className="space-y-2 sm:col-span-2"
            selectClassName="h-auto min-h-[9rem]"
          />
          <Button className="sm:col-span-2" type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            Save SKU
          </Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
