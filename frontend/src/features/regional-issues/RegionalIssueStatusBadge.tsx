"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { RegionalIssueStatus, RegionalEscalationStatus } from "@/redux/types/regionalIssue";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<RegionalIssueStatus, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_STYLES: Record<RegionalIssueStatus, string> = {
  submitted: "bg-amber-50 text-amber-800 border-amber-300",
  under_review: "bg-blue-50 text-blue-800 border-blue-300",
  accepted: "bg-teal-50 text-teal-800 border-teal-300",
  rejected: "bg-rose-50 text-rose-800 border-rose-300",
  resolved: "bg-emerald-50 text-emerald-800 border-emerald-300",
  closed: "bg-slate-100 text-slate-700 border-slate-300",
};

export function RegionalIssueStatusBadge({
  status,
  className,
}: {
  status: RegionalIssueStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium px-2 py-0.5 rounded-full text-xs", STATUS_STYLES[status] || "bg-gray-100 text-gray-700", className)}
    >
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}

const ESCALATION_LABELS: Record<RegionalEscalationStatus, string> = {
  none: "Internal (Region)",
  escalated: "Escalated to Federal",
  under_federal_review: "Under Federal Review",
  clarification_requested: "Clarification Requested",
  assistance_provided: "Assistance Provided",
  returned: "Returned to Region",
  closed: "Escalation Closed",
};

const ESCALATION_STYLES: Record<RegionalEscalationStatus, string> = {
  none: "bg-gray-50 text-gray-600 border-gray-200",
  escalated: "bg-purple-100 text-purple-800 border-purple-300 font-semibold",
  under_federal_review: "bg-indigo-100 text-indigo-800 border-indigo-300",
  clarification_requested: "bg-orange-100 text-orange-800 border-orange-300",
  assistance_provided: "bg-green-100 text-green-800 border-green-300",
  returned: "bg-red-100 text-red-800 border-red-300",
  closed: "bg-zinc-100 text-zinc-700 border-zinc-300",
};

export function RegionalEscalationStatusBadge({
  status,
  className,
}: {
  status: RegionalEscalationStatus;
  className?: string;
}) {
  if (status === "none") return null;

  return (
    <Badge
      variant="outline"
      className={cn("px-2 py-0.5 rounded-full text-xs shadow-xs", ESCALATION_STYLES[status] || "bg-gray-100", className)}
    >
      {ESCALATION_LABELS[status] || status}
    </Badge>
  );
}

