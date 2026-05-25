"use client";

import type { ReactNode } from "react";

interface ConfigTabPanelProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
}

/** Content panel under config tabs — matches table section styling. */
export function ConfigTabPanel({
  title,
  description,
  actions,
  children,
  noPadding = false,
}: ConfigTabPanelProps) {
  const hasHeader = title || description || actions;

  return (
    <div className="rounded-lg border border-section-accent/25 bg-white shadow-sm overflow-hidden">
      {hasHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-section-accent/15 bg-gradient-to-r from-slate-50 to-white">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-primary">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </div>
  );
}
