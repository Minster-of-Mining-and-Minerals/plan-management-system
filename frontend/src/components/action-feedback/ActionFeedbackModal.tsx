"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActionFeedbackRequest } from "./types";

const VARIANT_STYLES = {
  success: {
    accent: "bg-emerald-500",
    iconBg: "bg-emerald-50 text-emerald-600",
    ring: "ring-emerald-100",
    button: "bg-emerald-600 hover:bg-emerald-700 text-white",
    Icon: CheckCircle2,
  },
  error: {
    accent: "bg-red-500",
    iconBg: "bg-red-50 text-red-600",
    ring: "ring-red-100",
    button: "bg-red-600 hover:bg-red-700 text-white",
    Icon: XCircle,
  },
  warning: {
    accent: "bg-amber-500",
    iconBg: "bg-amber-50 text-amber-700",
    ring: "ring-amber-100",
    button: "bg-amber-600 hover:bg-amber-700 text-white",
    Icon: AlertTriangle,
  },
  info: {
    accent: "bg-sky-500",
    iconBg: "bg-sky-50 text-sky-700",
    ring: "ring-sky-100",
    button: "bg-sky-600 hover:bg-sky-700 text-white",
    Icon: Info,
  },
  confirm: {
    accent: "bg-primary",
    iconBg: "bg-primary/10 text-primary",
    ring: "ring-primary/15",
    button: "bg-primary hover:bg-primary/90 text-primary-foreground",
    Icon: AlertTriangle,
  },
} as const;

interface ActionFeedbackModalProps {
  request: ActionFeedbackRequest | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ActionFeedbackModal({
  request,
  onConfirm,
  onCancel,
}: ActionFeedbackModalProps) {
  if (!request) return null;

  const styles = VARIANT_STYLES[request.variant];
  const Icon = styles.Icon;
  const isConfirm = request.variant === "confirm";
  const confirmLabel = request.confirmLabel ?? (isConfirm ? "Confirm" : "OK");
  const cancelLabel = request.cancelLabel ?? "Cancel";
  const confirmClass = request.destructive
    ? "bg-red-600 hover:bg-red-700 text-white"
    : styles.button;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={!isConfirm}
        className={cn(
          "flex max-h-[min(90dvh,calc(100vh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-md top-[max(1rem,5dvh)] translate-y-0 sm:top-[50%] sm:-translate-y-1/2",
          styles.ring,
          "ring-2"
        )}
      >
        <div className={cn("h-1.5 w-full shrink-0", styles.accent)} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 space-y-4">
          <DialogHeader className="space-y-3">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  styles.iconBg
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-1.5 text-left min-w-0">
                <DialogTitle className="text-lg leading-snug">
                  {request.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {request.message}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="shrink-0 gap-2 sm:gap-2">
            {isConfirm && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {cancelLabel}
              </Button>
            )}
            <Button type="button" className={confirmClass} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
