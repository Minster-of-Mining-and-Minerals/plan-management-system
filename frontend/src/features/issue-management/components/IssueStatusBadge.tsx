import { Badge } from "@/components/ui/badge";
import { IssueStatus, ISSUE_STATUS_LABELS } from "@/redux/types/issue";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<IssueStatus, string> = {
  submitted: "bg-slate-100 text-slate-700 border-slate-200",
  under_review: "bg-blue-50 text-blue-700 border-blue-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  resolved: "bg-violet-50 text-violet-700 border-violet-200",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
};

interface IssueStatusBadgeProps {
  status: IssueStatus;
  className?: string;
}

export function IssueStatusBadge({ status, className }: IssueStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status], className)}>
      {ISSUE_STATUS_LABELS[status]}
    </Badge>
  );
}
