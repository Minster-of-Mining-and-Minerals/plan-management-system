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
      role="tablist"
      className={cn(
        "flex flex-wrap items-center gap-2.5 rounded-2xl border border-border bg-card p-2.5 shadow-xs w-fit max-w-full",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <Button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            variant={active ? "default" : "outline"}
            size="default"
            disabled={tab.disabled}
            onClick={() => onChange(tab.value)}
            className={cn(
              "h-10 rounded-xl px-4 text-xs font-semibold shadow-none transition-all flex items-center gap-2",
              active
                ? "bg-primary text-primary-foreground shadow-xs border-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {tab.icon ? <span className="h-4 w-4 shrink-0">{tab.icon}</span> : null}
            <span>{tab.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
