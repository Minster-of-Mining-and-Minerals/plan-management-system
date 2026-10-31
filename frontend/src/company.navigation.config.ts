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
  Factory,
  FilePlus2,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  anyPermissions?: PermissionKey[];
  allPermissions?: PermissionKey[];
  onlyPermissions?: PermissionKey[];
  children?: NavItem[];
};

export const COMPANY_NAVIGATION: NavItem[] = [
  {
    title: "Dashboard",
    url: "/company/dashboard",
    icon: LayoutDashboard,
    anyPermissions: ["COMPANY_DASHBOARD:VIEW"],
  },
  {
    title: "Plan Management",
    url: "/company/plans",
    icon: Layers,
    anyPermissions: [
      "COMPANY_PLANS:READ",
      "COMPANY_PLANS:MANAGE",
    ],
    children: [
      {
        title: "Plans",
        url: "/company/plans",
        icon: Layers,
        anyPermissions: [
          "COMPANY_PLANS:READ",
          "COMPANY_PLANS:MANAGE",
        ],
      },
      {
        title: "Plan Rules",
        url: "/company/plans/rules",
        icon: Shield,
        anyPermissions: [
          "COMPANY_PLAN_RULES:READ",
          "COMPANY_PLANS:UPDATE",
          "COMPANY_PLANS:MANAGE",
        ],
      },
      {
        title: "Planning Configuration",
        url: "/company/plans/configuration",
        icon: Paintbrush,
        anyPermissions: [
          "COMPANY_PLANNING_CONFIG:READ",
          "COMPANY_PLANS:READ",
          "COMPANY_PLANS:MANAGE",
        ],
      },
    ],
  },
  {
    title: "Production Reporting",
    url: "/company/production",
    icon: Factory,
    anyPermissions: [
      "COMPANY_PRODUCTION:READ",
      "COMPANY_PRODUCTION_REPORTS:READ",
      "COMPANY_PRODUCTION_REPORTS:CREATE",
      "COMPANY_DASHBOARD:VIEW",
    ],
    children: [
      {
        title: "Production Dashboard",
        url: "/company/production",
        icon: LayoutDashboard,
        anyPermissions: [
          "COMPANY_PRODUCTION:READ",
          "COMPANY_PRODUCTION_REPORTS:READ",
          "COMPANY_DASHBOARD:VIEW",
        ],
      },
      {
        title: "Submit Daily Report",
        url: "/company/production/submit",
        icon: FilePlus2,
        anyPermissions: [
          "COMPANY_PRODUCTION_REPORTS:CREATE",
          "COMPANY_PRODUCTION_REPORTS:UPDATE",
          "COMPANY_PRODUCTION_REPORTS:MANAGE",
        ],
      },
      {
        title: "Report History",
        url: "/company/production/reports",
        icon: ClipboardList,
        anyPermissions: [
          "COMPANY_PRODUCTION_REPORTS:READ",
          "COMPANY_PRODUCTION_REPORTS:MANAGE",
        ],
      },
    ],
  },
  {
    title: "Departments",
    url: "/company/departments",
    icon: Building2,
    anyPermissions: ["COMPANY_STRUCTURES:READ", "COMPANY_STRUCTURES:MANAGE"],
  },
  {
    title: "Users",
    url: "/company/users",
    icon: Users2,
    anyPermissions: [
      "COMPANY_USERS:READ",
      "COMPANY_USERS:MANAGE",
      "COMPANY_ROLES:READ",
      "COMPANY_ROLES:MANAGE",
      "COMPANY_PERMISSION_GROUPS:READ",
      "COMPANY_PERMISSION_GROUPS:MANAGE",
      "COMPANY_PERMISSIONS:READ",
      "COMPANY_PERMISSIONS:MANAGE",
      "USER_SESSION:VIEW",
    ],
    children: [
      {
        title: "Users List",
        url: "/company/users",
        icon: User2,
        anyPermissions: ["COMPANY_USERS:READ", "COMPANY_USERS:MANAGE"],
      },
      {
        title: "User Sessions",
        url: "/company/users/sessions",
        icon: Shield,
        anyPermissions: ["USER_SESSION:VIEW", "COMPANY_USERS:READ"],
      },
      {
        title: "Role Management",
        url: "/company/users/roles",
        icon: Shield,
        anyPermissions: ["COMPANY_ROLES:READ", "COMPANY_ROLES:MANAGE"],
      },
      {
        title: "Permission Group Management",
        url: "/company/users/permission-groups",
        icon: Shield,
        anyPermissions: [
          "COMPANY_PERMISSION_GROUPS:READ",
          "COMPANY_PERMISSION_GROUPS:MANAGE",
        ],
      },
      {
        title: "Permission Management",
        url: "/company/users/permissions",
        icon: Key,
        anyPermissions: [
          "COMPANY_PERMISSIONS:READ",
          "COMPANY_PERMISSIONS:MANAGE",
          "COMPANY_USERS:READ",
          "COMPANY_USERS:MANAGE",
        ],
      },
    ],
  },
  {
    title: "Settings",
    url: "/company/settings",
    icon: Paintbrush,
    anyPermissions: ["COMPANY_BRANDING:READ", "COMPANY_BRANDING:MANAGE"],
  },
];
