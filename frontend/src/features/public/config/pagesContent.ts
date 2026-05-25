import {
  Brain,
  Building2,
  Globe,
  HeartHandshake,
  Layers,
  LineChart,
  Shield,
  Sparkles,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";
import type { FeatureItem } from "../components/FeatureGrid";
import type { MarketingPageContent } from "../templates/MarketingPageLayout";

const aboutFeatures: FeatureItem[] = [
  {
    title: "Unified Ecosystem",
    description: "One platform connecting clinical, operational, and financial workflows.",
    icon: Layers,
  },
  {
    title: "AI-Augmented Care",
    description: "Intelligent insights that support — not replace — clinical judgment.",
    icon: Brain,
  },
  {
    title: "Enterprise Scale",
    description: "Built for hospitals, networks, and national health programs.",
    icon: Building2,
  },
];

export const ABOUT_PAGE: MarketingPageContent = {
  eyebrow: "About NovaCure",
  title: "Connecting intelligence in digital health",
  description:
    "NovaCure is an enterprise healthcare ecosystem designed to unify patient care, clinical operations, and intelligent analytics across every touchpoint.",
  features: aboutFeatures,
};

export const SERVICES_PAGE: MarketingPageContent = {
  eyebrow: "Services",
  title: "End-to-end digital health services",
  description:
    "From patient intake to analytics — modular services that deploy individually or as a complete ecosystem.",
  features: [
    { title: "Clinical Services", description: "EMR, consultation, orders, and care pathways.", icon: Stethoscope },
    { title: "Diagnostic Services", description: "Laboratory, radiology, and results management.", icon: Sparkles },
    { title: "Virtual Care", description: "Telemedicine integrated with scheduling and EMR.", icon: Video },
    { title: "Revenue Cycle", description: "Billing, claims, and financial operations.", icon: LineChart },
    { title: "Intelligence", description: "AI engine and executive analytics.", icon: Brain },
    { title: "Security", description: "Enterprise identity, audit, and compliance.", icon: Shield },
  ],
};

export const HOSPITAL_SOLUTIONS_PAGE: MarketingPageContent = {
  eyebrow: "Hospital Solutions",
  title: "Digital transformation for health systems",
  description:
    "Deploy NovaCure across departments with phased rollouts, integration support, and enterprise governance.",
  features: [
    { title: "Multi-facility", description: "Centralized governance with local flexibility.", icon: Building2 },
    { title: "Department Modules", description: "ED, inpatient, outpatient, lab, pharmacy, and more.", icon: Layers },
    { title: "Partner Network", description: "Referrals and shared care across organizations.", icon: HeartHandshake },
  ],
};

export const TELEMEDICINE_PAGE: MarketingPageContent = {
  eyebrow: "Telemedicine",
  title: "Virtual care integrated with your EMR",
  description:
    "Secure video visits, digital intake, and automated follow-ups — connected to the full NovaCure ecosystem.",
  features: [
    { title: "Video Consultations", description: "HD visits with waiting room and session notes.", icon: Video },
    { title: "Remote Monitoring", description: "Extend care beyond the facility walls.", icon: Globe },
    { title: "Hybrid Scheduling", description: "In-person and virtual appointments in one calendar.", icon: Users },
  ],
};

export const ANALYTICS_PAGE: MarketingPageContent = {
  eyebrow: "Analytics & Intelligence",
  title: "Operational and clinical intelligence",
  description:
    "Real-time dashboards for occupancy, patient flow, revenue, quality metrics, and predictive forecasting.",
  features: [
    { title: "Executive Dashboards", description: "Board-ready KPIs and trend analysis.", icon: LineChart },
    { title: "Clinical Metrics", description: "Outcomes, throughput, and quality indicators.", icon: Stethoscope },
    { title: "Predictive Models", description: "Forecast demand and identify bottlenecks early.", icon: Brain },
  ],
};

export const AI_HEALTH_PAGE: MarketingPageContent = {
  eyebrow: "AI Health Engine",
  title: "Intelligence embedded in every workflow",
  description:
    "Risk scoring, clinical decision support, and automation — designed for healthcare environments.",
  features: [
    { title: "Decision Support", description: "Context-aware suggestions at the point of care.", icon: Brain },
    { title: "Risk Scoring", description: "Identify high-risk patients and operational issues.", icon: Shield },
    { title: "Automation", description: "Intelligent routing, alerts, and workflow handoffs.", icon: Sparkles },
  ],
};

export const PATIENT_EXPERIENCE_PAGE: MarketingPageContent = {
  eyebrow: "Patient Experience",
  title: "Modern patient portal and engagement",
  description:
    "Appointments, results, prescriptions, and notifications in a secure, mobile-friendly experience.",
  features: [
    { title: "Self-Service", description: "Book appointments and access records anytime.", icon: Users },
    { title: "Results & Rx", description: "Lab results and prescription history on demand.", icon: Stethoscope },
    { title: "Notifications", description: "Timely updates across the care journey.", icon: Sparkles },
  ],
};

export const DOCTOR_EXPERIENCE_PAGE: MarketingPageContent = {
  eyebrow: "Doctor Experience",
  title: "A physician workspace built for focus",
  description:
    "EMR, schedules, patient insights, voice notes, and analytics — without context switching.",
  features: [
    { title: "Unified EMR", description: "Documentation, orders, and timeline in one view.", icon: Stethoscope },
    { title: "Patient Insights", description: "360° history, labs, and medications.", icon: Brain },
    { title: "Productivity", description: "Voice notes and structured templates.", icon: Sparkles },
  ],
};

export const SECURITY_PAGE: MarketingPageContent = {
  eyebrow: "Security & Compliance",
  title: "Medical-grade security architecture",
  description:
    "Encryption, RBAC, audit logs, and compliance-ready infrastructure for healthcare organizations.",
  features: [
    { title: "Encryption", description: "Data protected in transit and at rest.", icon: Shield },
    { title: "Access Control", description: "Granular roles and permission groups.", icon: Users },
    { title: "Auditability", description: "Complete activity trails for compliance.", icon: LineChart },
  ],
};

export const PRICING_PAGE: MarketingPageContent = {
  eyebrow: "Enterprise Pricing",
  title: "Flexible licensing for health systems",
  description:
    "Module-based or enterprise-wide licensing with implementation support. Contact us for a tailored proposal.",
  ctaTitle: "Get an enterprise quote",
  ctaDescription: "Tell us about your facilities, modules, and timeline — we'll design a plan that fits.",
};

export const PARTNERSHIP_PAGE: MarketingPageContent = {
  eyebrow: "Partnership",
  title: "Build the future of digital health together",
  description:
    "Technology partners, integrators, and health networks — join the NovaCure ecosystem.",
  ctaTitle: "Explore partnership opportunities",
  ctaDescription: "Connect with our partnerships team to discuss integration and go-to-market.",
};

export const CAREERS_PAGE: MarketingPageContent = {
  eyebrow: "Careers",
  title: "Join the NovaCure mission",
  description:
    "Help transform healthcare through intelligent, enterprise-grade digital platforms.",
};

export const INSIGHTS_PAGE: MarketingPageContent = {
  eyebrow: "Insights",
  title: "Healthcare technology perspectives",
  description:
    "Thought leadership on digital health, AI in medicine, and enterprise hospital transformation.",
};

export const FAQ_ITEMS = [
  {
    q: "Is NovaCure a single product or a platform?",
    a: "NovaCure is a modular ecosystem. Deploy individual modules (EMR, lab, pharmacy, etc.) or the full platform with shared identity, data, and analytics.",
  },
  {
    q: "Can we integrate with existing systems?",
    a: "Yes. NovaCure is designed for phased adoption alongside existing EMR, LIS, and financial systems through standard integration patterns.",
  },
  {
    q: "How is AI used in NovaCure?",
    a: "The AI Health Engine provides decision support, risk scoring, and operational forecasting. It augments clinicians and administrators — it does not replace clinical judgment.",
  },
  {
    q: "Is the platform secure for healthcare data?",
    a: "Security is foundational: encryption, role-based access, audit logs, and compliance-oriented architecture for healthcare regulations.",
  },
  {
    q: "How do we get started?",
    a: "Request a demo to see modules relevant to your organization. We support phased rollouts aligned to your priorities and infrastructure.",
  },
];

export const INSIGHT_POSTS = [
  {
    title: "The connected hospital: beyond EMR silos",
    excerpt: "Why modular ecosystems outperform monolithic systems in modern health networks.",
    date: "2026",
  },
  {
    title: "AI in clinical workflows: augmentation, not automation",
    excerpt: "Design principles for trustworthy AI in regulated healthcare environments.",
    date: "2026",
  },
  {
    title: "Patient portals that patients actually use",
    excerpt: "Engagement patterns from enterprise patient experience deployments.",
    date: "2025",
  },
];

export const CAREER_ROLES = [
  { title: "Senior Full-Stack Engineer", team: "Platform Engineering", location: "Remote / Hybrid" },
  { title: "Healthcare Solutions Architect", team: "Professional Services", location: "Global" },
  { title: "Clinical Product Manager", team: "Product", location: "Remote" },
];
