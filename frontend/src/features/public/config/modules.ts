import type { LucideIcon } from "lucide-react";
import {
  Brain,
  FlaskConical,
  LayoutDashboard,
  Pill,
  Radio,
  Siren,
  Stethoscope,
  Users,
  Video,
  Wallet,
  BedDouble,
  UserCircle,
  UserCog,
} from "lucide-react";

export type PlatformModule = {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  benefits: string[];
  workflow: string[];
  href: string;
};

export const PLATFORM_MODULES: PlatformModule[] = [
  {
    slug: "patient-management",
    title: "Patient Management",
    shortDescription: "Unified patient identity, registration, and longitudinal records.",
    description:
      "Manage the complete patient lifecycle from registration through follow-up with configurable forms, identification slips, and portal access.",
    icon: Users,
    features: ["Dynamic registration", "Patient portal", "Identification & barcode", "Care team visibility"],
    benefits: ["Reduce duplicate records", "Faster intake", "Better continuity of care"],
    workflow: ["Register", "Verify identity", "Assign care team", "Track journey"],
    href: "/modules/patient-management",
  },
  {
    slug: "emr",
    title: "EMR & Doctor Consultation",
    shortDescription: "Clinical documentation built for fast, accurate consultations.",
    description:
      "Structured EMR workflows with consultation timelines, voice notes, orders, and integrated diagnostics.",
    icon: Stethoscope,
    features: ["Consultation timeline", "Voice notes", "Clinical templates", "Order management"],
    benefits: ["Less documentation burden", "Standardized care", "Integrated orders"],
    workflow: ["Triage", "Consult", "Document", "Order & follow-up"],
    href: "/modules/emr",
  },
  {
    slug: "laboratory",
    title: "Laboratory System",
    shortDescription: "End-to-end lab orders, processing, and results delivery.",
    description: "Connect ordering physicians, lab technicians, and patients with real-time result visibility.",
    icon: FlaskConical,
    features: ["Lab orders", "Sample tracking", "Result validation", "Critical alerts"],
    benefits: ["Faster turnaround", "Reduced errors", "Audit-ready trails"],
    workflow: ["Order", "Collect sample", "Process", "Release results"],
    href: "/modules/laboratory",
  },
  {
    slug: "pharmacy",
    title: "Pharmacy System",
    shortDescription: "Dispensing, inventory, and e-prescription workflows.",
    description: "Manage formulary, dispensing, inventory levels, and patient medication history in one system.",
    icon: Pill,
    features: ["E-prescriptions", "Inventory control", "Drug interaction checks", "Dispense tracking"],
    benefits: ["Safer dispensing", "Stock optimization", "Pharmacy revenue visibility"],
    workflow: ["Prescribe", "Verify", "Dispense", "Reconcile inventory"],
    href: "/modules/pharmacy",
  },
  {
    slug: "billing",
    title: "Billing & Finance",
    shortDescription: "Revenue cycle, claims, and financial operations.",
    description: "Automate billing from clinical events through payment reconciliation and reporting.",
    icon: Wallet,
    features: ["Charge capture", "Claims & invoices", "Payment tracking", "Financial dashboards"],
    benefits: ["Improved cash flow", "Transparent pricing", "Enterprise reporting"],
    workflow: ["Capture services", "Generate claim", "Collect payment", "Analyze revenue"],
    href: "/modules/billing",
  },
  {
    slug: "radiology",
    title: "Radiology",
    shortDescription: "Imaging orders, reporting, and diagnostic workflows.",
    description: "Streamline radiology requests, image management, and structured reporting.",
    icon: Radio,
    features: ["Imaging orders", "PACS integration ready", "Structured reports", "Radiologist worklists"],
    benefits: ["Faster reads", "Integrated clinical context", "Quality assurance"],
    workflow: ["Order imaging", "Acquire study", "Report", "Deliver to care team"],
    href: "/modules/radiology",
  },
  {
    slug: "telemedicine",
    title: "Telemedicine",
    shortDescription: "Virtual visits and remote care delivery.",
    description: "Secure video consultations integrated with scheduling, EMR, and patient notifications.",
    icon: Video,
    features: ["Video visits", "Remote scheduling", "Digital intake", "Follow-up automation"],
    benefits: ["Expand access", "Reduce no-shows", "Hybrid care models"],
    workflow: ["Schedule", "Join visit", "Document encounter", "Follow-up"],
    href: "/telemedicine",
  },
  {
    slug: "ai-engine",
    title: "AI Health Engine",
    shortDescription: "Intelligent decision support across the care continuum.",
    description: "Risk scoring, predictive insights, and automation that augment clinical and operational teams.",
    icon: Brain,
    features: ["Risk scoring", "Predictive analytics", "Clinical suggestions", "Workflow automation"],
    benefits: ["Earlier interventions", "Operational efficiency", "Data-driven decisions"],
    workflow: ["Ingest data", "Analyze patterns", "Surface insights", "Act & measure"],
    href: "/ai-health",
  },
  {
    slug: "analytics",
    title: "Analytics & Intelligence",
    shortDescription: "Real-time KPIs for clinical and business operations.",
    description: "Dashboards for occupancy, patient flow, revenue, and quality metrics across the ecosystem.",
    icon: LayoutDashboard,
    features: ["Executive dashboards", "Clinical KPIs", "Revenue analytics", "Custom reports"],
    benefits: ["Single source of truth", "Proactive management", "Board-ready insights"],
    workflow: ["Collect events", "Aggregate metrics", "Visualize", "Optimize"],
    href: "/analytics",
  },
  {
    slug: "emergency",
    title: "Emergency System",
    shortDescription: "Triage, rapid response, and emergency department flow.",
    description: "Coordinate emergency intake, triage priorities, and resource allocation in critical moments.",
    icon: Siren,
    features: ["Triage scoring", "ED tracking board", "Resource alerts", "Handoff workflows"],
    benefits: ["Faster response", "Better prioritization", "Safer handoffs"],
    workflow: ["Arrive", "Triage", "Treat", "Admit or discharge"],
    href: "/modules/emergency",
  },
  {
    slug: "inpatient",
    title: "Inpatient Management",
    shortDescription: "Bed management, ward rounds, and inpatient care coordination.",
    description: "Track admissions, bed occupancy, nursing tasks, and discharge planning.",
    icon: BedDouble,
    features: ["Bed management", "Ward dashboards", "Care plans", "Discharge planning"],
    benefits: ["Optimized occupancy", "Clear ward visibility", "Shorter length of stay"],
    workflow: ["Admit", "Assign bed", "Daily rounds", "Discharge"],
    href: "/modules/inpatient",
  },
  {
    slug: "patient-portal",
    title: "Patient Portal",
    shortDescription: "Self-service access to health information and services.",
    description: "Appointments, prescriptions, lab results, and notifications in a secure patient experience.",
    icon: UserCircle,
    features: ["Appointments", "Results access", "Prescription history", "Secure messaging"],
    benefits: ["Higher engagement", "Reduced call volume", "Better adherence"],
    workflow: ["Sign in", "View records", "Book services", "Receive updates"],
    href: "/patient-experience",
  },
  {
    slug: "doctor-portal",
    title: "Doctor Portal",
    shortDescription: "Physician workspace with EMR, insights, and collaboration.",
    description: "A focused portal for clinicians with schedules, patient lists, analytics, and documentation tools.",
    icon: UserCog,
    features: ["Patient lists", "Schedule", "Clinical insights", "Team collaboration"],
    benefits: ["Less context switching", "Better productivity", "Informed decisions"],
    workflow: ["Review schedule", "See patients", "Document care", "Analyze outcomes"],
    href: "/doctor-experience",
  },
];

export function getModuleBySlug(slug: string): PlatformModule | undefined {
  return PLATFORM_MODULES.find((m) => m.slug === slug);
}

export const ECOSYSTEM_FLOW = [
  "Patient",
  "Appointment",
  "Consultation",
  "Laboratory",
  "Pharmacy",
  "Billing",
  "Analytics",
];

export const LANDING_STATS = [
  { value: "15+", label: "Integrated Modules" },
  { value: "99.9%", label: "Platform Uptime Target" },
  { value: "360°", label: "Care Visibility" },
  { value: "AI", label: "Powered Intelligence" },
];

export const CORE_SERVICES = [
  { title: "EMR", href: "/modules/emr" },
  { title: "Laboratory", href: "/modules/laboratory" },
  { title: "Pharmacy", href: "/modules/pharmacy" },
  { title: "Billing", href: "/modules/billing" },
  { title: "Telemedicine", href: "/telemedicine" },
  { title: "Analytics", href: "/analytics" },
  { title: "AI Health Engine", href: "/ai-health" },
  { title: "Emergency", href: "/modules/emergency" },
];
