"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useShopNotifications } from "@/hooks/use-shop-notifications";

function formatNotificationTime(value: string) {
  return new Date(value).toLocaleString();
}

export function ShopNotificationMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsQuery = useShopNotifications();
  const notifications = notificationsQuery.data ?? [];
  const notificationCount = notifications.length;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="relative px-2"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="h-4 w-4" />
        {notificationCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
            {notificationCount > 99 ? "99+" : notificationCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-11 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-950">Notifications</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void notificationsQuery.refetch()}>
              Refresh
            </Button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notificationsQuery.isLoading ? (
              <p className="px-4 py-6 text-sm text-slate-500">Loading notifications...</p>
            ) : null}
            {notificationsQuery.isError ? (
              <div className="space-y-3 px-4 py-4">
                <p className="text-sm text-red-700">Unable to load notifications.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void notificationsQuery.refetch()}>
                  Retry
                </Button>
              </div>
            ) : null}
            {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No notifications yet.</p>
            ) : null}
            {notifications.map((notification) => {
              const content = (
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-950">{notification.title}</p>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {notification.type}
                    </span>
                  </div>
                  <p className="text-sm leading-5 text-slate-600">{notification.content}</p>
                  <p className="text-xs text-slate-500">{formatNotificationTime(notification.createdAt)}</p>
                </div>
              );

              return notification.linkUrl ? (
                <Link
                  key={notification.id}
                  href={notification.linkUrl}
                  className="block border-b border-slate-100 px-4 py-3 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  {content}
                </Link>
              ) : (
                <div key={notification.id} className="border-b border-slate-100 px-4 py-3">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
