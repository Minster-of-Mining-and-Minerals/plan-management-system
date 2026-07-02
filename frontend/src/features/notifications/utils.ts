import { Bell } from "lucide-react";
import {
  NOTIFICATION_CATEGORY_OPTIONS,
  NOTIFICATION_ICON_VARIANTS,
  NotificationCategory,
} from "./constants";
import type { AppNotification } from "@/redux/api/notificationApi";

const PLAN_ACHIEVEMENT_NOTIFICATION_TYPES = new Set([
  "plan_achievement_submitted",
  "plan_achievement_approved",
  "plan_achievement_rejected",
]);

function withAchievementFocus(link: string): string {
  if (link.includes("focus=achievement")) {
    return link;
  }
  const separator = link.includes("?") ? "&" : "?";
  return `${link}${separator}focus=achievement`;
}

export function formatNotificationWhen(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function iconForCategory(category?: NotificationCategory) {
  const option = NOTIFICATION_CATEGORY_OPTIONS.find((x) => x.key === category);
  const Icon = option?.icon || Bell;
  return Icon;
}

export function iconForNotification(notification: AppNotification) {
  const Icon =
    (notification.icon_variant && NOTIFICATION_ICON_VARIANTS[notification.icon_variant]) ||
    iconForCategory(notification.category);
  return Icon;
}

export function resolveNotificationLink(notification: AppNotification): string | null {
  const isAchievementNotification = PLAN_ACHIEVEMENT_NOTIFICATION_TYPES.has(
    notification.notification_type ?? ""
  );

  if (notification.link_path) {
    if (isAchievementNotification) {
      return withAchievementFocus(notification.link_path);
    }
    return notification.link_path;
  }

  const isPlanReviewNotification =
    notification.notification_type === "plan_published_for_review" ||
    notification.notification_type === "review_reopened";

  if (
    notification.related_entity_type === "plan_version" &&
    notification.related_entity_id
  ) {
    if (isPlanReviewNotification) {
      return `/plans/review/${notification.related_entity_id}`;
    }
    return `/plans/${notification.related_entity_id}`;
  }

  if (
    notification.related_entity_type === "plan_node" &&
    notification.related_entity_id &&
    notification.metadata?.plan_version_id
  ) {
    const base = isPlanReviewNotification ? "/plans/review" : "/plans";
    const path = `${base}/${notification.metadata.plan_version_id}/nodes/${notification.related_entity_id}`;
    return isAchievementNotification ? withAchievementFocus(path) : path;
  }

  return null;
}
