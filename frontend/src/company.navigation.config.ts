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
    anyPermissions: ["COMPANY_DASHBOARD:VIEW", "COMPANIES:READ", "COMPANIES:MANAGE"],
  },
  {
    title: "Plan Management",
    url: "/company/plans",
    icon: Layers,
    anyPermissions: [
      "COMPANY_PLANS:READ",
      "COMPANY_PLANS:MANAGE",
      "COMPANIES:READ",
      "COMPANIES:MANAGE",
    ],
    children: [
      {
        title: "All Plans",
        url: "/company/plans",
        icon: Layers,
        anyPermissions: [
          "COMPANY_PLANS:READ",
          "COMPANY_PLANS:MANAGE",
          "COMPANIES:READ",
          "COMPANIES:MANAGE",
        ],
      },
      {
        title: "Plan Dashboard",
        url: "/company/plans/dashboard",
        icon: LayoutDashboard,
        anyPermissions: [
          "COMPANY_PLANS:READ",
          "COMPANY_PLANS:MANAGE",
          "COMPANIES:READ",
          "COMPANIES:MANAGE",
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
          "COMPANIES:READ",
          "COMPANIES:MANAGE",
        ],
      },
      {
        title: "Configuration",
        url: "/company/plans/configuration",
        icon: Paintbrush,
        anyPermissions: [
          "COMPANY_PLANNING_CONFIG:READ",
          "COMPANY_PLANS:READ",
          "COMPANY_PLANS:MANAGE",
          "COMPANIES:READ",
          "COMPANIES:MANAGE",
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
      "COMPANIES:READ",
      "COMPANIES:MANAGE",
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
          "COMPANIES:READ",
          "COMPANIES:MANAGE",
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
          "COMPANIES:MANAGE",
        ],
      },
      {
        title: "Report History",
        url: "/company/production/reports",
        icon: ClipboardList,
        anyPermissions: [
          "COMPANY_PRODUCTION_REPORTS:READ",
          "COMPANY_PRODUCTION_REPORTS:MANAGE",
          "COMPANIES:READ",
          "COMPANIES:MANAGE",
        ],
      },
    ],
  },
  {
    title: "Departments",
    url: "/company/departments",
    icon: Building2,
    anyPermissions: ["COMPANY_STRUCTURES:READ", "COMPANY_STRUCTURES:MANAGE", "COMPANIES:READ", "COMPANIES:MANAGE"],
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
      "COMPANIES:READ",
      "COMPANIES:MANAGE",
    ],
    children: [
      {
        title: "Users List",
        url: "/company/users",
        icon: User2,
        anyPermissions: ["COMPANY_USERS:READ", "COMPANY_USERS:MANAGE", "COMPANIES:READ", "COMPANIES:MANAGE"],
      },
      {
        title: "Role Management",
        url: "/company/users/roles",
        icon: Shield,
        anyPermissions: ["COMPANY_ROLES:READ", "COMPANY_ROLES:MANAGE", "COMPANIES:READ", "COMPANIES:MANAGE"],
      },
      {
        title: "Permission Group Management",
        url: "/company/users/permission-groups",
        icon: Shield,
        anyPermissions: [
          "COMPANY_PERMISSION_GROUPS:READ",
          "COMPANY_PERMISSION_GROUPS:MANAGE",
          "COMPANIES:READ",
          "COMPANIES:MANAGE",
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
          "COMPANIES:READ",
          "COMPANIES:MANAGE",
        ],
      },
    ],
  },
  {
    title: "Settings & Branding",
    url: "/company/settings",
    icon: Paintbrush,
    anyPermissions: ["COMPANY_BRANDING:READ", "COMPANY_BRANDING:MANAGE", "COMPANIES:READ", "COMPANIES:MANAGE"],
  },
];
