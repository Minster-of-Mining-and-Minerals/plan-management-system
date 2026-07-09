import {
  Flag,
  Target,
  UserPlus,
  ShieldAlert,
  ClipboardList,
  Bell,
  RefreshCw,
  GitBranch,
  FileText,
  type LucideIcon,
} from "lucide-react";

export type NotificationCategory =
  | "plans"
  | "assignments"
  | "system"
  | "logs"
  | "issues"
  | "documents";
export type NotificationPriority = "low" | "normal" | "high";

export const NOTIFICATION_CATEGORY_OPTIONS: Array<{
  key: NotificationCategory;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "plans", label: "Plans", icon: Flag },
  { key: "assignments", label: "Assignments", icon: UserPlus },
  { key: "system", label: "System", icon: ShieldAlert },
  { key: "logs", label: "Logs", icon: ClipboardList },
  { key: "issues", label: "Issues", icon: ShieldAlert },
  { key: "documents", label: "Documents", icon: FileText },
];

export const NOTIFICATION_ICON_VARIANTS: Record<string, LucideIcon> = {
  bell: Bell,
  flag: Flag,
  target: Target,
  "user-plus": UserPlus,
  refresh: RefreshCw,
  "shield-alert": ShieldAlert,
  "clipboard-list": ClipboardList,
  "git-branch": GitBranch,
  file: FileText,
};

export const PRIORITY_STYLES: Record<
  NotificationPriority,
  { dot: string; border: string }
> = {
  low: { dot: "bg-muted-foreground", border: "" },
  normal: { dot: "bg-primary", border: "border-primary/40 bg-primary/5" },
  high: { dot: "bg-destructive", border: "border-destructive/40 bg-destructive/5" },
};
