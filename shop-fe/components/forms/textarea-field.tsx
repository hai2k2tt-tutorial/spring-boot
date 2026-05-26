"use client";

import { FieldValues, Path, useFormContext } from "react-hook-form";
import { FormMessage } from "@/components/ui/form-message";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function TextareaField<T extends FieldValues>({
  name,
  label,
  rows = 4,
  className,
}: {
  name: Path<T>;
  label: string;
  rows?: number;
  className?: string;
}) {
  const form = useFormContext<T>();
  const error = form.formState.errors[name]?.message;

  return (
    <div className={className ?? "space-y-2"}>
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} rows={rows} {...form.register(name)} />
      <FormMessage>{typeof error === "string" ? error : undefined}</FormMessage>
    </div>
  );
}
