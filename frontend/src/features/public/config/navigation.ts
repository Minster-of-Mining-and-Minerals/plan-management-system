import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Brain,
  Building2,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  Pill,
  Radio,
  Shield,
  Stethoscope,
  Users,
  Video,
  Wallet,
  Siren,
  BedDouble,
  UserCircle,
  UserCog,
} from "lucide-react";

export type NavLink = { label: string; href: string; description?: string };

export type ModuleNavItem = NavLink & { icon: LucideIcon };

export const PRIMARY_NAV: NavLink[] = [
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Modules", href: "/modules" },
  { label: "AI Health", href: "/ai-health" },
  { label: "Solutions", href: "/hospital-solutions" },
  { label: "Security", href: "/security" },
  { label: "Insights", href: "/insights" },
];

export const MODULE_NAV_ITEMS: ModuleNavItem[] = [
  { label: "Patient Management", href: "/modules/patient-management", icon: Users, description: "Registration, records & care journeys" },
  { label: "EMR & Consultation", href: "/modules/emr", icon: Stethoscope, description: "Clinical documentation & workflows" },
  { label: "Laboratory", href: "/modules/laboratory", icon: FlaskConical, description: "Orders, results & LIS integration" },
  { label: "Pharmacy", href: "/modules/pharmacy", icon: Pill, description: "Dispensing, inventory & e-prescriptions" },
  { label: "Billing & Finance", href: "/modules/billing", icon: Wallet, description: "Revenue cycle & claims" },
  { label: "Radiology", href: "/modules/radiology", icon: Radio, description: "Imaging workflows & reporting" },
  { label: "Telemedicine", href: "/telemedicine", icon: Video, description: "Virtual care & remote monitoring" },
  { label: "AI Health Engine", href: "/ai-health", icon: Brain, description: "Intelligent clinical decision support" },
  { label: "Analytics", href: "/analytics", icon: LayoutDashboard, description: "Operational & clinical intelligence" },
  { label: "Emergency", href: "/modules/emergency", icon: Siren, description: "Triage & rapid response" },
  { label: "Inpatient", href: "/modules/inpatient", icon: BedDouble, description: "Ward management & bed flow" },
  { label: "Patient Portal", href: "/patient-experience", icon: UserCircle, description: "Self-service patient access" },
  { label: "Doctor Portal", href: "/doctor-experience", icon: UserCog, description: "Physician workspace & insights" },
];

export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "Modules", href: "/modules" },
      { label: "Services", href: "/services" },
      { label: "AI Health Engine", href: "/ai-health" },
      { label: "Analytics", href: "/analytics" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    title: "Experiences",
    links: [
      { label: "Patient Experience", href: "/patient-experience" },
      { label: "Doctor Experience", href: "/doctor-experience" },
      { label: "Hospital Solutions", href: "/hospital-solutions" },
      { label: "Telemedicine", href: "/telemedicine" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Partnership", href: "/partnership" },
      { label: "Insights", href: "/insights" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Request Demo", href: "/demo" },
      { label: "Enterprise Pricing", href: "/pricing" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export const TRUST_INDICATORS = [
  { label: "Hospitals & Health Systems", icon: Building2 },
  { label: "Clinical Intelligence", icon: Brain },
  { label: "Secure by Design", icon: Shield },
  { label: "Real-time Operations", icon: Activity },
  { label: "Patient-Centered Care", icon: HeartPulse },
];
