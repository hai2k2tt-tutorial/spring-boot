"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { InputField } from "@/components/forms/input-field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCurrentShop, fetchCurrentShopWallet, updateCurrentShopProfile } from "@/lib/api";
import { ShopResponseVo } from "@/lib/types";

const shopProfileSchema = z.object({
  shopName: z.string().trim().min(1, "Shop name is required"),
  ownerName: z.string().trim().min(1, "Owner name is required"),
  phone: z.string().trim().optional(),
});

type ShopProfileFormValues = z.infer<typeof shopProfileSchema>;

function toDefaultValues(profile?: ShopResponseVo): ShopProfileFormValues {
  return {
    shopName: profile?.shopName ?? "",
    ownerName: profile?.ownerName ?? "",
    phone: profile?.phone ?? "",
  };
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : "-";
}

function formatBalance(balance?: number, currency?: string) {
  const amount = Number(balance ?? 0);
  return `${Number.isFinite(amount) ? amount : 0} ${currency ?? "USD"}`;
}

export function ProfileView() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const form = useForm<ShopProfileFormValues>({
    resolver: zodResolver(shopProfileSchema),
    defaultValues: toDefaultValues(),
  });

  const profileQuery = useQuery({
    queryKey: ["shop-profile"],
    queryFn: fetchCurrentShop,
    enabled: status === "authenticated",
    staleTime: 30 * 1000,
    retry: 1,
  });

  const walletQuery = useQuery({
    queryKey: ["shop-wallet"],
    queryFn: fetchCurrentShopWallet,
    enabled: status === "authenticated",
    staleTime: 30 * 1000,
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: (values: ShopProfileFormValues) => {
      if (!profileQuery.data) {
        throw new Error("Shop profile is not loaded");
      }

      return updateCurrentShopProfile({
        shopName: values.shopName,
        ownerName: values.ownerName,
        phone: values.phone?.trim() || undefined,
      });
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(["shop-profile"], profile);
      form.reset(toDefaultValues(profile));
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      form.reset(toDefaultValues(profileQuery.data));
    }
  }, [form, profileQuery.data]);

  const profile = profileQuery.data;
  const isLoading = status === "loading" || profileQuery.isLoading;
  const isSaving = updateMutation.isPending;
  const wallet = walletQuery.data;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge variant="outline">SHOP PROFILE</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Profile details</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            View and update your shop profile. Wallet details are shown for context.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to workspace</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => void Promise.allSettled([profileQuery.refetch(), walletQuery.refetch()])}
            disabled={status !== "authenticated" || profileQuery.isFetching || walletQuery.isFetching}
          >
            Refresh
          </Button>
        </div>
      </div>

      {status === "unauthenticated" ? (
        <Alert variant="destructive">Sign in to view and update your profile.</Alert>
      ) : null}
      {profileQuery.isError ? (
        <Alert variant="destructive">
          {profileQuery.error instanceof Error ? profileQuery.error.message : "Unable to load profile"}
        </Alert>
      ) : null}
      {walletQuery.isError ? (
        <Alert variant="destructive">
          {walletQuery.error instanceof Error ? walletQuery.error.message : "Unable to load wallet"}
        </Alert>
      ) : null}
      {updateMutation.isSuccess ? <Alert variant="success">Profile updated.</Alert> : null}
      {updateMutation.isError ? (
        <Alert variant="destructive">
          {updateMutation.error instanceof Error ? updateMutation.error.message : "Unable to update profile"}
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Editable profile</CardTitle>
            <CardDescription>These fields are stored on your shop profile.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <p className="text-sm text-slate-500">Loading profile...</p> : null}
            {!isLoading ? (
              <FormProvider {...form}>
                <form className="space-y-5" onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputField<ShopProfileFormValues> name="shopName" label="Shop name" />
                    <InputField<ShopProfileFormValues> name="ownerName" label="Owner name" />
                  </div>
                  <InputField<ShopProfileFormValues> name="phone" label="Phone" />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={status !== "authenticated" || isSaving || !profile}>
                      {isSaving ? "Saving..." : "Save profile"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset(toDefaultValues(profile))}
                      disabled={isSaving || !profile}
                    >
                      Reset
                    </Button>
                  </div>
                </form>
              </FormProvider>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account detail</CardTitle>
            <CardDescription>Read-only identity and wallet data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Detail label="Email" value={profile?.email} />
            <Detail label="Status" value={profile?.status} />
            <Detail
              label="Wallet"
              value={wallet || profile ? formatBalance(wallet?.balance ?? profile?.balance, wallet?.currency ?? profile?.currency) : undefined}
            />
            <Detail label="Shop ID" value={profile?.shopId} />
            <Detail label="Updated" value={formatDate(wallet?.updatedAt ?? profile?.walletUpdatedAt ?? profile?.profileUpdatedAt)} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-slate-950">{value || "-"}</p>
    </div>
  );
}
