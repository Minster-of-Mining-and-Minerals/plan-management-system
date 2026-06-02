import {
  LayoutDashboard,
  Inbox,
  ClipboardList,
  CheckCircle2,
  Bell,
  User2,
} from "lucide-react";
import type { NavItem } from "@/navigation.config";

export const PHARMACY_NAVIGATION: NavItem[] = [
  {
    title: "Dashboard",
    url: "/pharmacy/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Received",
    url: "/pharmacy/prescriptions/received",
    icon: Inbox,
  },
  {
    title: "Dispensing Queue",
    url: "/pharmacy/prescriptions/queue",
    icon: ClipboardList,
  },
  {
    title: "Completed",
    url: "/pharmacy/prescriptions/completed",
    icon: CheckCircle2,
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
