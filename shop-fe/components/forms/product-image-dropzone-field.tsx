"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { FieldValues, Path, useFormContext } from "react-hook-form";
import { uploadProductImage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Label } from "@/components/ui/label";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function ProductImageDropzoneField<T extends FieldValues>({
  name,
  label = "Product image",
  className,
}: {
  name: Path<T>;
  label?: string;
  className?: string;
}) {
  const form = useFormContext<T>();
  const fieldValue = form.watch(name) as string | undefined;
  const error = form.formState.errors[name]?.message;
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const displayedPreviewUrl = previewUrl ?? fieldValue;

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProductImage(file),
    onSuccess: (uploaded) => {
      form.setValue(name, uploaded.imageUrl as never, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      setPreviewUrl(undefined);
    },
    onError: (uploadError) => {
      setPreviewUrl(undefined);
      form.setError(name, {
        type: "upload",
        message: uploadError instanceof Error ? uploadError.message : "Failed to upload image",
      });
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".gif"],
    },
    maxFiles: 1,
    maxSize: MAX_IMAGE_BYTES,
    multiple: false,
    disabled: uploadMutation.isPending,
    onDrop: (acceptedFiles, rejectedFiles) => {
      const rejected = rejectedFiles[0];
      if (rejected) {
        form.setError(name, {
          type: "upload",
          message: rejected.errors[0]?.message ?? "Choose one image up to 5 MB",
        });
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      form.clearErrors(name);
      uploadMutation.mutate(file, {
        onSettled: () => URL.revokeObjectURL(objectUrl),
      });
    },
  });

  const helperText = useMemo(() => {
    if (uploadMutation.isPending) return "Uploading image to MinIO...";
    if (fieldValue) return "Image uploaded. This URL will be saved with the product.";
    return "Drag an image here or click to upload. JPEG, PNG, WEBP, or GIF up to 5 MB.";
  }, [fieldValue, uploadMutation.isPending]);

  const removeImage = () => {
    form.setValue(name, "" as never, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setPreviewUrl(undefined);
    form.clearErrors(name);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      <div
        {...getRootProps()}
        className={cn(
          "group relative flex min-h-48 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center transition",
          "hover:border-slate-500 hover:bg-slate-100",
          isDragActive && "border-slate-700 bg-slate-100",
          uploadMutation.isPending && "cursor-wait opacity-80",
        )}
      >
        <input {...getInputProps()} />
        {displayedPreviewUrl ? (
          <Image src={displayedPreviewUrl} alt="Selected product image" fill unoptimized className="object-cover" />
        ) : (
          <div className="flex max-w-sm flex-col items-center gap-3 text-slate-500">
            <div className="rounded-full bg-white p-3 shadow-sm">
              <ImagePlus className="h-6 w-6 text-slate-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">
                {isDragActive ? "Drop image to upload" : "Upload product image"}
              </p>
              <p className="mt-1 text-xs">{helperText}</p>
            </div>
          </div>
        )}

        {uploadMutation.isPending ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-medium text-slate-700">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Uploading
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{helperText}</p>
        {fieldValue ? (
          <Button type="button" variant="outline" size="sm" onClick={removeImage}>
            <X className="h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>
      <FormMessage>{typeof error === "string" ? error : undefined}</FormMessage>
    </div>
  );
}
