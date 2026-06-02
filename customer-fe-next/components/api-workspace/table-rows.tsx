"use client";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function LoadingRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-6 text-center text-sm text-slate-500">
        {label}
      </TableCell>
    </TableRow>
  );
}

export function ErrorRow({
  colSpan,
  error,
  onRetry,
}: {
  colSpan: number;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-6 text-center">
        <div className="flex flex-col items-center gap-3 text-sm text-red-600">
          <span>{getErrorMessage(error, "Unable to load data")}</span>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

