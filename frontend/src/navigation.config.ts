import { PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
  User2,
  Shield,
  KeyRound,
  Key,
  Building2,
  ListTree,
  Scale,
  Palette,
  Settings,
  Paintbrush,
  History,
  AlertCircle,
  StickyNote,
  ClipboardCheck,
  FileText,
  Files,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: any;
  anyPermissions?: PermissionKey[];
  allPermissions?: PermissionKey[];
  onlyPermissions?: PermissionKey[];
  children?: NavItem[];
};

export const NAVIGATION: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    anyPermissions: ["DASHBOARD:VIEW"],
  },
  {
    title: "Sector Structures",
    url: "/government-structures",
    icon: Building2,
    anyPermissions: ["GOVERNMENT_STRUCTURES:READ"],
  },
  {
    title: "Plan Management",
    url: "/plans",
    icon: ListTree,
    anyPermissions: [
      "PLANS:READ",
      "PLAN:VIEW_ASSIGNED_REVIEW",
      "PLAN_RULES:READ",
      "PERFORMANCE_COLOR_THRESHOLDS:READ",
    ],
    children: [
      {
        title: "Plan Drafts",
        url: "/plans",
        icon: ListTree,
        allPermissions: ["PLANS:READ"],
      },
      {
        title: "Plan Review",
        url: "/plans/review",
        icon: ClipboardCheck,
        allPermissions: ["PLAN:VIEW_ASSIGNED_REVIEW"],
      },
      {
        title: "Planning Configuration",
        url: "/plans/configuration",
        icon: Settings,
        allPermissions: ["PLANS:UPDATE"],
      },
      {
        title: "Plan Rules",
        url: "/plans/rules",
        icon: Scale,
        allPermissions: ["PLAN_RULES:READ"],
      },
      {
        title: "Performance Colors",
        url: "/plans/performance-colors",
        icon: Palette,
        allPermissions: ["PERFORMANCE_COLOR_THRESHOLDS:READ"],
      }
    ],
  },
  {
    title: "Documents",
    url: "/documents",
    icon: Files,
    anyPermissions: [
      "DOCUMENTS:READ",
      "DOCUMENTS:MANAGE",
      "NOTES:VIEW",
      "NOTES:MANAGE",
    ],
    children: [
      {
        title: "Documents",
        url: "/documents",
        icon: FileText,
        anyPermissions: ["DOCUMENTS:READ", "DOCUMENTS:MANAGE"],
      },
      {
        title: "Notes",
        url: "/settings/notes",
        icon: StickyNote,
        anyPermissions: ["NOTES:VIEW", "NOTES:MANAGE"],
      },
    ],
  },
  {
    title: "Issue Management",
    url: "/issues",
    icon: AlertCircle,
    anyPermissions: [
      "ISSUES:READ",
      "ISSUES:READ_ALL",
      "ISSUE_CATEGORIES:READ",
    ],
    children: [
      {
        title: "Issues",
        url: "/issues",
        icon: AlertCircle,
        anyPermissions: ["ISSUES:READ", "ISSUES:READ_ALL"],
      },
      {
        title: "Issue Categories",
        url: "/issues/categories",
        icon: Settings,
        allPermissions: ["ISSUE_CATEGORIES:READ"],
      },
      {
        title: "Form Containers",
        url: "/issues/form-config",
        icon: Settings,
        allPermissions: ["FORM_CONFIG_CONTAINERS:READ"],
      },
    ],
  },
  {
    title: "Users",
    url: "/users/list",
    icon: User2,
    anyPermissions: ["USERS:READ", "ROLES:READ", "PERMISSIONS:READ", "PERMISSION_GROUPS:READ", "SPECIAL_PERMISSION_GROUPS:READ"],
    children: [
      {
        title: "Users List",
        url: "/users/list",
        icon: User2,
        allPermissions: ["USERS:READ"],
      },
      {
        title: "Role Management",
        url: "/users/roles",
        icon: Shield,
        allPermissions: ["ROLES:READ"],
      },
      {
        title: "Permission Group Management",
        url: "/users/permission-groups",
        icon: Shield,
        allPermissions: ["PERMISSION_GROUPS:READ"],
      },
      {
        title: "Special Permission Groups",
        url: "/users/special-permission-groups",
        icon: KeyRound,
        allPermissions: ["SPECIAL_PERMISSION_GROUPS:READ"],
      },
      {
        title: "Permission Management",
        url: "/users/permissions",
        icon: Key,
        allPermissions: ["PERMISSIONS:READ"],
      },
    ],
  },
  {
    title: "Settings",
    url: "/settings/branding",
    icon: Settings,
    anyPermissions: [
      "BRANDING_SETTINGS:READ",
      "SYSTEM_AUDIT_LOGS:READ",
      "SYSTEM_SETTINGS:READ",
    ],
    children: [
      {
        title: "Branding",
        url: "/settings/branding",
        icon: Paintbrush,
        allPermissions: ["BRANDING_SETTINGS:READ"],
      },
      {
        title: "System",
        url: "/settings/system",
        icon: Settings,
        allPermissions: ["SYSTEM_SETTINGS:READ"],
      },
      {
        title: "Audit Logs",
        url: "/settings/audit-logs",
        icon: History,
        allPermissions: ["SYSTEM_AUDIT_LOGS:READ"],
      },
    ],
  },
];
