"use client";

import { FieldValues, Path, useFormContext } from "react-hook-form";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InputField<T extends FieldValues>({
  name,
  label,
  id,
  type = "text",
  min,
  step,
  className,
}: {
  name: Path<T>;
  label: string;
  id?: string;
  type?: string;
  min?: string;
  step?: string;
  className?: string;
}) {
  const form = useFormContext<T>();
  const error = form.formState.errors[name]?.message;
  const inputId = id ?? name;

  return (
    <div className={className ?? "space-y-2"}>
      <Label htmlFor={inputId}>{label}</Label>
      <Input id={inputId} type={type} min={min} step={step} {...form.register(name)} />
      <FormMessage>{typeof error === "string" ? error : undefined}</FormMessage>
    </div>
  );
}
