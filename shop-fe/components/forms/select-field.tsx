"use client";

import { FieldValues, Path, useFormContext } from "react-hook-form";
import { FormMessage } from "@/components/ui/form-message";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type SelectOption = { label: string; value: string };

export function SelectField<T extends FieldValues>({
  name,
  label,
  options,
  id,
  placeholder,
  multiple,
  size,
  className,
  selectClassName,
  disabled,
}: {
  name: Path<T>;
  label: string;
  options: Array<string | SelectOption>;
  id?: string;
  placeholder?: string;
  multiple?: boolean;
  size?: number;
  className?: string;
  selectClassName?: string;
  disabled?: boolean;
}) {
  const form = useFormContext<T>();
  const error = form.formState.errors[name]?.message;
  const selectId = id ?? name;
  const normalizedOptions = options.map(
    (option) =>
      typeof option === "string" ? { label: option, value: option } : option,
  );

  return (
    <div className={className ?? "space-y-2"}>
      <Label htmlFor={selectId}>{label}</Label>
      <Select
        id={selectId}
        multiple={multiple}
        size={size}
        disabled={disabled}
        className={selectClassName}
        {...form.register(name)}
      >
        {!multiple && placeholder ? (
          <option value="">{placeholder}</option>
        ) : null}
        {normalizedOptions.map((option) => (
          <option key={`${option.value}-${option.label}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <FormMessage>{typeof error === "string" ? error : undefined}</FormMessage>
    </div>
  );
}
