import { PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
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

export const PURCHASING_CENTER_NAVIGATION: NavItem[] = [
  {
    title: "Dashboard",
    url: "/purchasing-center/dashboard",
    icon: LayoutDashboard,
    anyPermissions: ["PURCHASING_CENTER_DASHBOARD:VIEW"],
  },
  {
    title: "Users",
    url: "/purchasing-center/users",
    icon: Users2,
    anyPermissions: [
      "PURCHASING_CENTER_USERS:READ",
      "PURCHASING_CENTER_USERS:MANAGE",
      "PURCHASING_CENTER_ROLES:READ",
      "PURCHASING_CENTER_ROLES:MANAGE",
      "PURCHASING_CENTER_PERMISSION_GROUPS:READ",
      "PURCHASING_CENTER_PERMISSION_GROUPS:MANAGE",
      "PURCHASING_CENTER_PERMISSIONS:READ",
      "PURCHASING_CENTER_PERMISSIONS:MANAGE",
    ],
    children: [
      {
        title: "Users List",
        url: "/purchasing-center/users",
        icon: User2,
        anyPermissions: ["PURCHASING_CENTER_USERS:READ", "PURCHASING_CENTER_USERS:MANAGE"],
      },
      {
        title: "Role Management",
        url: "/purchasing-center/users/roles",
        icon: Shield,
        anyPermissions: ["PURCHASING_CENTER_ROLES:READ", "PURCHASING_CENTER_ROLES:MANAGE"],
      },
      {
        title: "Permission Group Management",
        url: "/purchasing-center/users/permission-groups",
        icon: Shield,
        anyPermissions: [
          "PURCHASING_CENTER_PERMISSION_GROUPS:READ",
          "PURCHASING_CENTER_PERMISSION_GROUPS:MANAGE",
        ],
      },
      {
        title: "Permission Management",
        url: "/purchasing-center/users/permissions",
        icon: Key,
        anyPermissions: [
          "PURCHASING_CENTER_PERMISSIONS:READ",
          "PURCHASING_CENTER_PERMISSIONS:MANAGE",
          "PURCHASING_CENTER_USERS:READ",
          "PURCHASING_CENTER_USERS:MANAGE",
        ],
      },
    ],
  },
  {
    title: "Settings & Branding",
    url: "/purchasing-center/settings",
    icon: Paintbrush,
    anyPermissions: ["PURCHASING_CENTER_BRANDING:READ", "PURCHASING_CENTER_BRANDING:MANAGE"],
  },
];
