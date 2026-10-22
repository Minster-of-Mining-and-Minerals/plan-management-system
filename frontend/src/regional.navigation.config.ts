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

export const REGIONAL_NAVIGATION: NavItem[] = [
  {
    title: "Dashboard",
    url: "/regional/dashboard",
    icon: LayoutDashboard,
    anyPermissions: ["REGIONAL_DASHBOARD:VIEW"],
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
    ],
    children: [
      {
        title: "Users List",
        url: "/regional/users",
        icon: User2,
        anyPermissions: ["REGIONAL_USERS:READ", "REGIONAL_USERS:MANAGE"],
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
