import { Alert } from "@/components/ui/alert";

export function DialogErrorAlert({
  message,
  className = "sm:col-span-2",
}: {
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;

  return (
    <Alert className={className} variant="destructive">
      {message}
    </Alert>
  );
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
