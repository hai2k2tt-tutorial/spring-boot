"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField, SelectField } from "@/components/forms";
import { Modal } from "@/components/api-workspace/primitives";
import { accountSchema, toOptional } from "@/components/api-workspace/schemas";
import { Button } from "@/components/ui/button";
import { createCustomer } from "@/lib/api";
import { FormDialogProps } from "./types";

export function CustomerDialog({ open, onClose, saving, submit }: FormDialogProps) {
  const form = useForm<z.input<typeof accountSchema>, undefined, z.output<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: { email: "", passwordHash: "", status: "ACTIVE", firstName: "", lastName: "", phone: "", initialBalance: "0", currency: "USD" },
  });

  return (
    <Modal title="Create customer" open={open} onClose={onClose}>
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) => submit(() => createCustomer({ email: values.email, passwordHash: values.passwordHash, status: values.status, firstName: values.firstName ?? "", lastName: values.lastName ?? "", phone: toOptional(values.phone), initialBalance: values.initialBalance, currency: values.currency })))}>
          {(["email", "passwordHash", "firstName", "lastName", "phone", "initialBalance", "currency"] as const).map((name) => <InputField key={name} name={name} label={name} type={name === "initialBalance" ? "number" : "text"} />)}
          <SelectField name="status" label="Status" options={["ACTIVE", "LOCKED"]} />
          <Button className="sm:col-span-2" type="submit" disabled={saving}><Save className="h-4 w-4" />Save customer</Button>
        </form>
      </FormProvider>
    </Modal>
  );
}
