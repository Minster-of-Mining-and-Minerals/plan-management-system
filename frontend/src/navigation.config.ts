import { PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
  User2,
  Shield,
  Key,
  Building2,
  ListTree
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
    title: "Structures",
    url: "/structures",
    icon: Building2,
    anyPermissions: ["STRUCTURES:READ"],
  },
  {
    title: "Users",
    url: "/users/list",
    icon: User2,
    anyPermissions: ["USERS:READ", "ROLES:READ", "PERMISSIONS:READ"],
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
        title: "Permission Management",
        url: "/users/permissions",
        icon: Key,
        allPermissions: ["PERMISSIONS:READ"],
      },
    ],
  },

];
