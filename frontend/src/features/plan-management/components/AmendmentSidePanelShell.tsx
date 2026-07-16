"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

type AmendmentSidePanelShellProps = {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children: ReactNode;
};

export function AmendmentSidePanelShell({
  title,
  subtitle,
  onClose,
  children,
}: AmendmentSidePanelShellProps) {
  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="absolute top-0 right-0 z-20 flex h-full w-full flex-col gap-4 overflow-y-auto border-l border-border bg-card p-4 shadow-xl lg:w-[340px]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {onClose ? (
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4">{children}</div>
    </motion.div>
  );
}
