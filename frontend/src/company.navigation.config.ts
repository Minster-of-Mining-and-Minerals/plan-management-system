import { PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
  Building2,
  Users2,
  User2,
  Shield,
  Key,
  Paintbrush,
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

export const COMPANY_NAVIGATION: NavItem[] = [
  {
    title: "Dashboard",
    url: "/company/dashboard",
    icon: LayoutDashboard,
    anyPermissions: ["COMPANY_DASHBOARD:VIEW"],
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
    ],
    children: [
      {
        title: "Users List",
        url: "/company/users",
        icon: User2,
        anyPermissions: ["COMPANY_USERS:READ", "COMPANY_USERS:MANAGE"],
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
    title: "Settings & Branding",
    url: "/company/settings",
    icon: Paintbrush,
    anyPermissions: ["COMPANY_BRANDING:READ", "COMPANY_BRANDING:MANAGE"],
  },
];
