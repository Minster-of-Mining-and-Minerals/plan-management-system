"use client";

import { useState } from "react";
import { Paperclip, ArrowRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { MedicalHistoryLog } from "@/redux/api/medicalWorkflowApi";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusVariant(status: string) {
  switch (status) {
    case "forwarded":
      return "default" as const;
    case "returned":
      return "secondary" as const;
    case "prescribed":
      return "outline" as const;
    case "completed":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function RoutePill({ entry }: { entry: MedicalHistoryLog }) {
  const from = entry.sender?.full_name || "Staff";
  const to = entry.receiver?.full_name;
  const isRoute =
    to && (entry.action_type === "forward" || entry.action_type === "return");

  if (isRoute) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-1 rounded border border-purple-100 bg-purple-50 px-2 py-1 text-[11px] text-purple-800 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-200">
        <span className="font-medium">{from}</span>
        <ArrowRight className="h-3 w-3 shrink-0" />
        <span className="font-medium">{to}</span>
      </div>
    );
  }

  return (
    <p className="mt-1.5 text-xs text-muted-foreground">
      By {from}
      {entry.sender?.internalProfile?.departmentRef?.name
        ? ` · ${entry.sender.internalProfile.departmentRef.name}`
        : ""}
    </p>
  );
}

type EntryProps = {
  entry: MedicalHistoryLog;
  defaultOpen?: boolean;
  compact?: boolean;
};

function MedicalHistoryEntry({ entry, defaultOpen = false, compact }: EntryProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasAttachments = (entry.attachment_ids?.length ?? 0) > 0;

  return (
    <li className="relative pl-8">
      <span className="absolute left-0 top-3 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-primary bg-background">
        <span className="h-2 w-2 rounded-full bg-primary" />
      </span>

      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="rounded-lg border bg-card shadow-sm">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-start gap-2 rounded-lg p-3 text-left transition-colors hover:bg-muted/40"
            >
              <ChevronDown
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180"
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {entry.header_title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatTime(entry.created_at)}
                    </p>
                  </div>
                  <Badge
                    variant={statusVariant(entry.status)}
                    className="shrink-0 capitalize"
                  >
                    {entry.status}
                  </Badge>
                </div>
                <RoutePill entry={entry} />
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="space-y-2 border-t px-3 pb-3 pt-2 text-sm">
              {!compact && entry.notes && (
                <p className="text-muted-foreground">{entry.notes}</p>
              )}
              {!compact && hasAttachments && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Paperclip className="h-3.5 w-3.5" />
                  {entry.attachment_ids.length} attachment
                  {entry.attachment_ids.length !== 1 ? "s" : ""}
                </p>
              )}
              {!compact &&
                entry.form_data &&
                Object.keys(entry.form_data).length > 0 && (
                  <div className="rounded-md bg-muted/50 p-2 text-xs">
                    <p className="mb-1 font-medium text-foreground">
                      Diagnosis / form data
                    </p>
                    <p className="text-muted-foreground">
                      {Object.keys(entry.form_data).length} field
                      {Object.keys(entry.form_data).length !== 1 ? "s" : ""}{" "}
                      recorded
                    </p>
                  </div>
                )}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </li>
  );
}

type Props = {
  entries: MedicalHistoryLog[];
  compact?: boolean;
  collapsible?: boolean;
};

export function MedicalHistoryTimeline({
  entries,
  compact,
  collapsible = true,
}: Props) {
  if (!entries.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No diagnosis reports yet.
      </p>
    );
  }

  if (!collapsible) {
    return (
      <ul className="space-y-4">
        {entries.map((entry) => (
          <MedicalHistoryEntry
            key={entry.log_id}
            entry={entry}
            compact={compact}
            defaultOpen
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="relative">
      <div
        className="absolute left-[11px] top-2 bottom-2 w-px bg-border"
        aria-hidden
      />
      <ul className="space-y-3">
        {entries.map((entry, index) => (
          <MedicalHistoryEntry
            key={entry.log_id}
            entry={entry}
            compact={compact}
            defaultOpen={index === entries.length - 1}
          />
        ))}
      </ul>
    </div>
  );
}
