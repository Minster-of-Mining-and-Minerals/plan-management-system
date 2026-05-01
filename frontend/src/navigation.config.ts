import { PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  User2,
  Shield,
  Key,
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
    title: "Feedbacks",
    url: "/feedbacks",
    icon: ClipboardCheck,
    anyPermissions: ["FEEDBACK:READ"],
  },
  {
    title: "My Complaints",
    url: "/my-complaints",
    icon: ClipboardCheck,
    anyPermissions: ["COMPLAINT:READ_OWN"],
  },
  {
    title: "Compliants",
    url: "/compliants",
    icon: ClipboardCheck,
    anyPermissions: ["COMPLAINT:READ_ALL"],
  },
  {
    title: "Base Data",
    url: "/basedata",
    icon: FileText,
    allPermissions: [
      "SECTOR:READ",
      "SECTOR:UPDATE",
      "COMPLAINT_CATEGORIES:READ",
      "COMPLAINT_CATEGORIES:UPDATE",
    ],
  },
  {
    title: "Users",
    url: "/users",
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
        title: "Permission Management",
        url: "/users/permissions",
        icon: Key,
        allPermissions: ["PERMISSIONS:READ"],
      },
    ],
  },
];
