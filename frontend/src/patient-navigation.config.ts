import { UserCircle, LayoutDashboard } from "lucide-react";
import type { NavItem } from "./navigation.config";

export const PATIENT_NAVIGATION: NavItem[] = [
  {
    title: "My Health",
    url: "/patient/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Profile",
    url: "/patient/profile",
    icon: UserCircle,
  },
];
