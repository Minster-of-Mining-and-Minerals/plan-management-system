import {
  LayoutDashboard,
  Calendar,
  FlaskConical,
  Pill,
  FileHeart,
  Video,
  Bell,
  Users,
  CreditCard,
  Sparkles,
  UserCircle,
} from "lucide-react";
import type { NavItem } from "./navigation.config";

export const PATIENT_NAVIGATION: NavItem[] = [
  {
    title: "Dashboard",
    url: "/patient/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Appointments",
    url: "/patient/appointments",
    icon: Calendar,
  },
  {
    title: "Lab Results",
    url: "/patient/lab-results",
    icon: FlaskConical,
  },
  {
    title: "Prescriptions",
    url: "/patient/prescriptions",
    icon: Pill,
  },
  {
    title: "Medical History",
    url: "/patient/medical-history",
    icon: FileHeart,
  },
  {
    title: "Telemedicine",
    url: "/patient/telemedicine",
    icon: Video,
  },
  {
    title: "Notifications",
    url: "/patient/notifications",
    icon: Bell,
  },
  {
    title: "Family Health",
    url: "/patient/family",
    icon: Users,
  },
  {
    title: "Billing",
    url: "/patient/billing",
    icon: CreditCard,
  },
  {
    title: "AI Health",
    url: "/patient/ai-health",
    icon: Sparkles,
  },
  {
    title: "Profile",
    url: "/patient/profile",
    icon: UserCircle,
  },
];
