"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Save, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField, SelectField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { attributeSchema } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createAttribute, fetchCurrentShopProducts } from "@/lib/api";
import { DialogErrorAlert, getErrorMessage } from "./error-alert";
import { FormDialogProps } from "./types";

type AttributeDialogProps = FormDialogProps & {
  defaultProductId?: string;
};

type AttributeFormInput = z.input<typeof attributeSchema>;

function getAttributeDefaults(defaultProductId?: string): AttributeFormInput {
  return { productId: defaultProductId ?? "", code: "", name: "", values: [{ value: "" }] };
}

export function AttributeDialog({ open, onClose, saving, submit, defaultProductId }: AttributeDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<z.input<typeof attributeSchema>, undefined, z.output<typeof attributeSchema>>({
    resolver: zodResolver(attributeSchema),
    defaultValues: getAttributeDefaults(defaultProductId),
  });
  const valuesFieldArray = useFieldArray({
    control: form.control,
    name: "values",
  });
  const { reset } = form;
  const usesDetailProduct = Boolean(defaultProductId);

  const productsQuery = useQuery({
    queryKey: ["shop-product-options"],
    queryFn: () => fetchCurrentShopProducts(),
    enabled: open && !usesDetailProduct,
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

  function resetAttributeForm() {
    reset(getAttributeDefaults(defaultProductId));
  }

  useEffect(() => {
    if (!open) return;
    reset(getAttributeDefaults(defaultProductId));
  }, [defaultProductId, open, reset]);

  async function handleSubmit(values: z.output<typeof attributeSchema>) {
    const attributeValues = values.values
      .map((item) => item.value.trim())
      .filter(Boolean)
      .map((value, index) => ({ value, sortOrder: index }));
    setServerError(null);
    try {
      await submit(() => createAttribute({ ...values, values: attributeValues }));
      resetAttributeForm();
    } catch (error) {
      setServerError(getErrorMessage(error, "Unable to create attribute"));
    }
  }

  function handleClose() {
    setServerError(null);
    resetAttributeForm();
    onClose();
  }

  return (
    <Modal title="Create inventory attribute" open={open} onClose={handleClose}>
      <FormProvider {...form}>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <DialogErrorAlert message={serverError} />
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
          <InputField name="code" label="Code" />
          <InputField name="name" label="Name" />
          <div className="space-y-3 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-950">Values</span>
              <Button type="button" variant="outline" size="sm" onClick={() => valuesFieldArray.append({ value: "" })}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {valuesFieldArray.fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <InputField
                    name={`values.${index}.value`}
                    label={`Value ${index + 1}`}
                    className="flex-1 space-y-2"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-7 h-10 px-3"
                    disabled={valuesFieldArray.fields.length === 1}
                    onClick={() => valuesFieldArray.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <Button className="sm:col-span-2" type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            Save attribute
          </Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
