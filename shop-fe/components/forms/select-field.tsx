"use client";

import { FieldValues, Path, useFormContext } from "react-hook-form";
import { FormMessage } from "@/components/ui/form-message";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function SelectField<T extends FieldValues>({
  name,
  label,
  options,
}: {
  name: Path<T>;
  label: string;
  options: string[];
}) {
  const form = useFormContext<T>();
  const error = form.formState.errors[name]?.message;

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Select id={name} {...form.register(name)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
      <FormMessage>{typeof error === "string" ? error : undefined}</FormMessage>
    </div>
  );
}
