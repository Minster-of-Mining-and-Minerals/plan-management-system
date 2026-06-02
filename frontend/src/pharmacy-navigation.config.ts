import { LayoutDashboard, FileText, Bell, User2 } from "lucide-react";
import type { NavItem } from "@/navigation.config";

/** Pharmacy portal: Dashboard + Prescriptions + Notifications + Profile */
export const PHARMACY_NAVIGATION: NavItem[] = [
  {
    title: "Dashboard",
    url: "/pharmacy/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Prescriptions",
    url: "/pharmacy/prescriptions",
    icon: FileText,
  },
  {
    title: "Notifications",
    url: "/pharmacy/notifications",
    icon: Bell,
  },
  {
    title: "Profile",
    url: "/pharmacy/profile",
    icon: User2,
  },
];
