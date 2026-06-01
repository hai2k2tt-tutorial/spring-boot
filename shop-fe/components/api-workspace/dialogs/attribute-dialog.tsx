"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField, SelectField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { attributeSchema } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createAttribute, fetchProducts } from "@/lib/api";
import { FormDialogProps } from "./types";

type AttributeDialogProps = FormDialogProps & {
  defaultProductId?: string;
};

const ATTRIBUTE_DEFAULTS = { productId: "", code: "", name: "", values: "" };

export function AttributeDialog({ open, onClose, saving, submit, defaultProductId }: AttributeDialogProps) {
  const form = useForm<z.input<typeof attributeSchema>, undefined, z.output<typeof attributeSchema>>({
    resolver: zodResolver(attributeSchema),
    defaultValues: ATTRIBUTE_DEFAULTS,
  });

  const productsQuery = useQuery({
    queryKey: ["shop-product-options"],
    queryFn: () => fetchProducts(),
    enabled: open,
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
    form.reset({ ...ATTRIBUTE_DEFAULTS, productId: defaultProductId ?? "" });
  }, [defaultProductId, form, open]);

  return (
    <Modal title="Create inventory attribute" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) => {
            const attributeValues = values.values
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
              .map((value, index) => ({ value, sortOrder: index }));
            return submit(() => createAttribute({ ...values, values: attributeValues }));
          })}
        >
          <SelectField
            name="productId"
            label="Product"
            options={productOptions}
            placeholder={productPlaceholder}
            disabled={productsQuery.isLoading || productsQuery.isError}
          />
          <InputField name="code" label="Code" />
          <InputField name="name" label="Name" />
          <InputField name="values" label="Values (comma separated)" className="space-y-2 sm:col-span-2" />
          <Button className="sm:col-span-2" type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            Save attribute
          </Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
