import * as React from "react";
import { cn } from "@/lib/utils";

function Alert({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" | "success" }) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border px-4 py-3 text-sm",
        variant === "default" && "border-slate-200 bg-slate-50 text-slate-700",
        variant === "destructive" && "border-red-200 bg-red-50 text-red-700",
        variant === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        className,
      )}
      {...props}
    />
  );
}

export { Alert };
