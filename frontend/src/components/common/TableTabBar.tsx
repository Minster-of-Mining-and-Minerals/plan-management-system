"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TableTabItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface TableTabBarProps<T extends string> {
  tabs: TableTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Tab bar styled like TableLayout sideActions — bordered group with default/outline buttons. */
export function TableTabBar<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: TableTabBarProps<T>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2",
        className
      )}
    >
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          type="button"
          variant={value === tab.value ? "default" : "outline"}
          size="default"
          disabled={tab.disabled}
          onClick={() => onChange(tab.value)}
          className="flex items-center gap-2"
        >
          {tab.icon ? <span className="h-4 w-4 shrink-0">{tab.icon}</span> : null}
          <span>{tab.label}</span>
        </Button>
      ))}
    </div>
  );
}
