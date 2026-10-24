import { PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
  Users2,
  User2,
  Shield,
  Key,
  Paintbrush,
  Coins,
  FileText,
  PlusCircle,
  FileCheck2,
  Calendar,
  History,
  HardHat,
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
    anyPermissions: [
      "PURCHASING_CENTER_DASHBOARD:VIEW",
      "GOLD_PURCHASES:READ",
      "PURCHASING_CENTERS:READ",
    ],
  },
  {
    title: "Gold Purchases",
    url: "/purchasing-center/purchases",
    icon: Coins,
    anyPermissions: [
      "GOLD_PURCHASES:READ",
      "GOLD_PURCHASES:CREATE",
      "GOLD_PURCHASES:MANAGE",
    ],
    children: [
      {
        title: "Purchase Register",
        url: "/purchasing-center/purchases",
        icon: FileText,
        anyPermissions: ["GOLD_PURCHASES:READ", "GOLD_PURCHASES:MANAGE"],
      },
      {
        title: "Record Gold Purchase",
        url: "/purchasing-center/purchases/new",
        icon: PlusCircle,
        anyPermissions: ["GOLD_PURCHASES:CREATE", "GOLD_PURCHASES:MANAGE"],
      },
    ],
  },
  {
    title: "Daily & Historical Reports",
    url: "/purchasing-center/reports",
    icon: FileCheck2,
    anyPermissions: [
      "GOLD_REPORTS:READ",
      "GOLD_REPORTS:GENERATE",
      "GOLD_REPORTS:SUBMIT",
      "GOLD_REPORTS:MANAGE",
    ],
    children: [
      {
        title: "Daily Report",
        url: "/purchasing-center/reports/daily",
        icon: Calendar,
        anyPermissions: [
          "GOLD_REPORTS:READ",
          "GOLD_REPORTS:GENERATE",
          "GOLD_REPORTS:SUBMIT",
          "GOLD_REPORTS:MANAGE",
        ],
      },
      {
        title: "Historical Reports",
        url: "/purchasing-center/reports",
        icon: History,
        anyPermissions: ["GOLD_REPORTS:READ", "GOLD_REPORTS:MANAGE"],
      },
    ],
  },
  {
    title: "ASM Sellers Registry",
    url: "/purchasing-center/sellers/asm",
    icon: HardHat,
    anyPermissions: [
      "ASM:READ",
      "ASM:CREATE",
      "ASM:UPDATE",
      "ASM:MANAGE",
      "GOLD_PURCHASES:CREATE",
    ],
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
