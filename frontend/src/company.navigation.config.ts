import { PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
  Building2,
  Users2,
  User2,
  Shield,
  Key,
  Paintbrush,
  Factory,
  FileBadge,
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

export type NavCategory = {
  category: string;
  items: NavItem[];
};

export const COMPANY_CATEGORIZED_NAVIGATION: NavCategory[] = [
  {
    category: "OVERVIEW",
    items: [
      {
        title: "Dashboard",
        url: "/company/dashboard",
        icon: LayoutDashboard,
        anyPermissions: ["COMPANY_DASHBOARD:VIEW"],
      },
    ],
  },
  {
    category: "LICENSE & PRODUCTION",
    items: [
      {
        title: "Licenses",
        url: "/company/licenses",
        icon: FileBadge,
        anyPermissions: [
          "COMPANY_PRODUCTION:READ",
          "COMPANY_DASHBOARD:VIEW",
        ],
      },
      {
        title: "Productions",
        url: "/company/productions",
        icon: Factory,
        anyPermissions: [
          "COMPANY_PRODUCTION:READ",
          "COMPANY_PRODUCTION_REPORTS:READ",
          "COMPANY_DASHBOARD:VIEW",
        ],
      },
    ],
  },
  {
    category: "ORGANIZATION",
    items: [
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
            title: "Permission Groups",
            url: "/company/users/permission-groups",
            icon: Shield,
            anyPermissions: [
              "COMPANY_PERMISSION_GROUPS:READ",
              "COMPANY_PERMISSION_GROUPS:MANAGE",
            ],
          },
          {
            title: "Permissions",
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
    ],
  },
  {
    category: "ADMINISTRATION",
    items: [
      {
        title: "Settings",
        url: "/company/settings",
        icon: Paintbrush,
        anyPermissions: ["COMPANY_BRANDING:READ", "COMPANY_BRANDING:MANAGE"],
      },
    ],
  },
];

// Flat navigation export for backward compatibility
export const COMPANY_NAVIGATION: NavItem[] = COMPANY_CATEGORIZED_NAVIGATION.flatMap(
  (c) => c.items
);
