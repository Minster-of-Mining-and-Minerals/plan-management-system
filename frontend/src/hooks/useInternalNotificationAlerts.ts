"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useGetNotificationsQuery } from "@/redux/api/notificationApi";
import { hasAnyPermission } from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";

const POLL_MS = 30_000;

/**
 * Polls unread notifications for clinical staff (appointment or workflow receivers)
 * and shows a toast when new items arrive.
 */
export function useInternalNotificationAlerts(enabled: boolean) {
  const { permissions } = useAuth();
  const canReceive = hasAnyPermission(permissions, [
    "PATIENTS:RECEIVE_APPOINTMENT",
    "PATIENTS:RECEIVE_PATIENT",
  ]);
  const active = enabled && canReceive;

  const { data: notifications = [] } = useGetNotificationsQuery(undefined, {
    skip: !active,
    pollingInterval: active ? POLL_MS : 0,
  });

  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!active) return;

    const unread = notifications.filter((n) => !n.is_read);

    if (!initialized.current) {
      unread.forEach((n) => seenIds.current.add(n.notification_id));
      initialized.current = true;
      return;
    }

    for (const n of unread) {
      if (seenIds.current.has(n.notification_id)) continue;
      seenIds.current.add(n.notification_id);
      toast.info(n.title, { description: n.message, duration: 8000 });
    }
  }, [notifications, active]);
}
