"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSession, useSession } from "next-auth/react";
import { useEffect } from "react";
import { fetchCurrentShopNotifications } from "@/lib/api";
import { getAccessToken, setAccessToken } from "@/lib/auth-token";
import { ShopNotificationResponseVo } from "@/lib/types";

export const shopNotificationsQueryKey = ["shop-notifications"];

function sortNewestFirst(notifications: ShopNotificationResponseVo[]) {
    return [...notifications].sort(
        (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    );
}

async function resolveAccessToken() {
    const storedToken = getAccessToken();
    if (storedToken) return storedToken;

    const session = await getSession();
    if (session?.accessToken) {
        setAccessToken(session.accessToken, session.accessTokenExpires);
        return session.accessToken;
    }

    return undefined;
}

function parseSseNotifications(buffer: string) {
    const chunks = buffer.split("\n\n");
    const rest = chunks.pop() ?? "";
    const notifications = chunks.flatMap((chunk) => {
        const eventName = chunk
            .split("\n")
            .find((line) => line.startsWith("event:"))
            ?.slice("event:".length)
            .trim();

        if (eventName !== "notification") return [];

        const data = chunk
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice("data:".length).trim())
            .join("\n");

        if (!data) return [];

        try {
            return [JSON.parse(data) as ShopNotificationResponseVo];
        } catch {
            return [];
        }
    });

    return { notifications, rest };
}

export function useShopNotifications() {
    const queryClient = useQueryClient();
    const { status } = useSession();

    const query = useQuery({
        queryKey: shopNotificationsQueryKey,
        queryFn: fetchCurrentShopNotifications,
        enabled: status === "authenticated",
        staleTime: 30 * 1000,
        retry: 1,
        select: sortNewestFirst,
    });

    useEffect(() => {
        if (status !== "authenticated") return;

        const abortController = new AbortController();

        async function connect() {
            const token = await resolveAccessToken();
            if (!token || abortController.signal.aborted) return;

            const response = await fetch("/api/gateway/notifications/shop/me/stream", {
                headers: {
                    Accept: "text/event-stream",
                    Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
                },
                signal: abortController.signal,
            });

            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (!abortController.signal.aborted) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const parsed = parseSseNotifications(buffer);
                buffer = parsed.rest;

                for (const notification of parsed.notifications) {
                    queryClient.setQueryData<ShopNotificationResponseVo[]>(shopNotificationsQueryKey, (current = []) =>
                        sortNewestFirst([notification, ...current.filter((item) => item.id !== notification.id)])
                    );

                    if (notification.type === "ORDER_PAID") {
                        await queryClient.invalidateQueries({ queryKey: ["api-workspace-orders"] });
                    }
                }
            }
        }

        void connect().catch(() => undefined);

        return () => abortController.abort();
    }, [queryClient, status]);

    return query;
}