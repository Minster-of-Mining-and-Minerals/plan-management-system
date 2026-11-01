import { PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
  Building2,
  Users2,
  User2,
  Shield,
  Key,
  Paintbrush,
  Layers,
  ListTree,
  ClipboardCheck,
  Settings,
  Scale,
  Palette,
  BarChart3,
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

export const REGIONAL_NAVIGATION: NavItem[] = [
  {
    title: "Dashboard",
    url: "/regional/dashboard",
    icon: LayoutDashboard,
    anyPermissions: ["REGIONAL_DASHBOARD:VIEW"],
  },
  {
    title: "Plan Management",
    url: "/regional/plans",
    icon: ListTree,
    anyPermissions: [
      "REGIONAL_PLANS:READ",
      "REGIONAL_PLANS:MANAGE",
    ],
    children: [
      {
        title: "Plan Drafts",
        url: "/regional/plans",
        icon: ListTree,
        anyPermissions: [
          "REGIONAL_PLANS:READ",
          "REGIONAL_PLANS:MANAGE",
        ],
      },
      {
        title: "Plan Review",
        url: "/regional/plans/review",
        icon: ClipboardCheck,
        anyPermissions: [
          "REGIONAL_PLANS:REVIEW",
          "REGIONAL_PLANS:READ",
          "REGIONAL_PLANS:MANAGE",
        ],
      },
      {
        title: "Planning Configuration",
        url: "/regional/plans/configuration",
        icon: Settings,
        anyPermissions: [
          "REGIONAL_PLANNING_CONFIG:READ",
          "REGIONAL_PLANS:READ",
          "REGIONAL_PLANS:MANAGE",
        ],
      },
      {
        title: "Plan Rules",
        url: "/regional/plans/rules",
        icon: Scale,
        anyPermissions: [
          "REGIONAL_PLAN_RULES:READ",
          "REGIONAL_PLANS:UPDATE",
          "REGIONAL_PLANS:MANAGE",
        ],
      },
      {
        title: "Performance Colors",
        url: "/regional/plans/performance-colors",
        icon: Palette,
        anyPermissions: [
          "REGIONAL_PERFORMANCE_COLORS:READ",
          "REGIONAL_PLANS:READ",
          "REGIONAL_PLANS:MANAGE",
        ],
      },
    ],
  },
  {
    title: "National Reporting",
    url: "/regional/national-reporting",
    icon: BarChart3,
    anyPermissions: [
      "REGIONAL_NATIONAL_REPORTING:READ_ASSIGNED",
      "REGIONAL_NATIONAL_REPORTING:MANAGE",
      "REGIONAL_PLANS:READ",
    ],
  },
  {
    title: "Departments",
    url: "/regional/departments",
    icon: Building2,
    anyPermissions: ["REGIONAL_STRUCTURES:READ", "REGIONAL_STRUCTURES:MANAGE"],
  },
  {
    title: "Users",
    url: "/regional/users",
    icon: Users2,
    anyPermissions: [
      "REGIONAL_USERS:READ",
      "REGIONAL_USERS:MANAGE",
      "REGIONAL_ROLES:READ",
      "REGIONAL_ROLES:MANAGE",
      "REGIONAL_PERMISSION_GROUPS:READ",
      "REGIONAL_PERMISSION_GROUPS:MANAGE",
      "REGIONAL_PERMISSIONS:READ",
      "REGIONAL_PERMISSIONS:MANAGE",
      "USER_SESSION:VIEW",
    ],
    children: [
      {
        title: "Users List",
        url: "/regional/users",
        icon: User2,
        anyPermissions: ["REGIONAL_USERS:READ", "REGIONAL_USERS:MANAGE"],
      },
      {
        title: "User Sessions",
        url: "/regional/users/sessions",
        icon: Shield,
        anyPermissions: ["USER_SESSION:VIEW", "REGIONAL_USERS:READ"],
      },
      {
        title: "Role Management",
        url: "/regional/users/roles",
        icon: Shield,
        anyPermissions: ["REGIONAL_ROLES:READ", "REGIONAL_ROLES:MANAGE"],
      },
      {
        title: "Permission Group Management",
        url: "/regional/users/permission-groups",
        icon: Shield,
        anyPermissions: [
          "REGIONAL_PERMISSION_GROUPS:READ",
          "REGIONAL_PERMISSION_GROUPS:MANAGE",
        ],
      },
      {
        title: "Permission Management",
        url: "/regional/users/permissions",
        icon: Key,
        anyPermissions: [
          "REGIONAL_PERMISSIONS:READ",
          "REGIONAL_PERMISSIONS:MANAGE",
          "REGIONAL_USERS:READ",
          "REGIONAL_USERS:MANAGE",
        ],
      },
    ],
  },
  {
    title: "Settings & Branding",
    url: "/regional/settings",
    icon: Paintbrush,
    anyPermissions: ["REGIONAL_BRANDING:READ", "REGIONAL_BRANDING:MANAGE"],
  },
];
