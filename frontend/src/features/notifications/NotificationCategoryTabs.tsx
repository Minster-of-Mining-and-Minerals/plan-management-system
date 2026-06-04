"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NOTIFICATION_CATEGORY_OPTIONS,
  NotificationCategory,
} from "./constants";

interface NotificationCategoryTabsProps {
  activeCategory: NotificationCategory;
  onCategoryChange: (category: NotificationCategory) => void;
  size?: "sm" | "default";
  className?: string;
}

export function NotificationCategoryTabs({
  activeCategory,
  onCategoryChange,
  size = "sm",
  className = "",
}: NotificationCategoryTabsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {NOTIFICATION_CATEGORY_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = option.key === activeCategory;
        return (
          <Button
            key={option.key}
            size={size}
            variant={active ? "default" : "outline"}
            onClick={() => onCategoryChange(option.key)}
          >
            <Icon className="mr-2 h-4 w-4" />
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export function NotificationEmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 text-center text-muted-foreground">
      <Bell className="mx-auto mb-3 h-8 w-8 opacity-40" />
      <p>{message}</p>
    </div>
  );
}
