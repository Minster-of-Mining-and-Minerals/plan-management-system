"use client";

import { X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AppointmentSidePanelShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: Props) {
  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.28, ease: "easeInOut" }}
      className={cn(
        "absolute right-0 top-0 z-10 flex h-full min-h-[50dvh] w-full max-w-[360px] flex-col overflow-hidden",
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm"
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-primary/20 bg-primary px-4 py-3 text-primary-foreground">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-primary-foreground/85">{subtitle}</p>
          )}
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="space-y-4">{children}</div>
      </div>

      {footer && (
        <div className="shrink-0 rounded-b-xl border-t border-border bg-card px-4 py-3">
          {footer}
        </div>
      )}
    </motion.aside>
  );
}
