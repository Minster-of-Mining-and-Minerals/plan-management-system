import { PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
  User2,
  Shield,
  Key,
  Palette,
  Settings2,
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
    title: "Users",
    url: "/users/list",
    icon: User2,
    anyPermissions: [
      "USERS:READ",
      "ROLES:READ",
      "PERMISSIONS:READ",
      "FORM_FIELDS:READ",
    ],
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
      {
        title: "Configure User Forms",
        url: "/users/form-fields",
        icon: Settings2,
        anyPermissions: ["FORM_FIELDS:READ", "FORM_FIELDS:CREATE", "USERS:UPDATE"],
      },
    ],
  },
  {
    title: "Branding",
    url: "/branding",
    icon: Palette,
    allPermissions: ["BRANDING:READ"],
  },
];
