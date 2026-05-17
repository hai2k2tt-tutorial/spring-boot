import { cn } from "@/lib/utils";

export function FormMessage({ className, children }: React.HTMLAttributes<HTMLParagraphElement>) {
  if (!children) {
    return null;
  }

  return <p className={cn("text-sm text-red-600", className)}>{children}</p>;
}
