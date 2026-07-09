"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DIALOG_SIMPLE_SCROLL } from "@/lib/dialogLayout";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SystemAuditLog } from "@/redux/types/systemAuditLog";

type Props = {
  log: SystemAuditLog | null;
  open: boolean;
  onClose: () => void;
};

function JsonBlock({ label, value }: { label: string; value?: Record<string, unknown> | null }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <pre className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
        {value ? JSON.stringify(value, null, 2) : "—"}
      </pre>
    </div>
  );
}

export function SystemAuditLogDetailModal({ log, open, onClose }: Props) {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={cn(DIALOG_SIMPLE_SCROLL, "max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogDescription>
            {new Date(log.created_at).toLocaleString()} ·{" "}
            {log.changedByUser?.full_name ?? "Unknown user"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{log.module_label ?? log.module}</Badge>
            <Badge className="capitalize">{log.action}</Badge>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Entity</p>
              <p className="font-medium">{log.entity_label ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Changed By</p>
              <p className="font-medium">{log.changedByUser?.full_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{log.changedByUser?.email}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Summary</p>
              <p>{log.summary ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">IP Address</p>
              <p>{log.ip_address ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Entity ID</p>
              <p className="font-mono text-xs break-all">{log.entity_id ?? "—"}</p>
            </div>
          </div>

          <JsonBlock label="Previous Values" value={log.previous_values} />
          <JsonBlock label="New Values" value={log.new_values} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
