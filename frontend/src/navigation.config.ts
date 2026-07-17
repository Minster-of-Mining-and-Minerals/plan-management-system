import { PermissionKey } from "@/lib/permissions";
import {
  LayoutDashboard,
  User2,
  Shield,
  Key,
  Palette,
  Settings2,
  HeartPulse,
  ClipboardList,
  Building2,
  BadgeCheck,
  CalendarCheck,
  Stethoscope,
  ImageIcon,
  Sparkles,
  Inbox,
  Pill,
  Store,
  Receipt,
  Wallet,
  ScrollText,
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
    title: "Departments",
    url: "/departments",
    icon: Building2,
    anyPermissions: ["DEPARTMENTS:READ", "DEPARTMENTS:CREATE", "DEPARTMENTS:UPDATE"],
  },
  {
    title: "Users",
    url: "/users/list",
    icon: User2,
    anyPermissions: [
      "USERS:READ",
      "ROLES:READ",
      "PERMISSIONS:READ",
      "PERMISSION_GROUPS:READ",
    ],
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
        title: "Permission Group Management",
        url: "/users/permission-groups",
        icon: Shield,
        allPermissions: ["PERMISSION_GROUPS:READ"],
      },
      {
        title: "Permission Management",
        url: "/users/permissions",
        icon: Key,
        allPermissions: ["PERMISSIONS:READ"],
      },
      {
        title: "User Titles",
        url: "/user-titles",
        icon: BadgeCheck,
        anyPermissions: ["USER_TITLES:READ", "USER_TITLES:CREATE", "USER_TITLES:UPDATE"],
      },
    ],
  },
  {
    title: "Patients",
    url: "/patients/list",
    icon: HeartPulse,
    anyPermissions: [
      "PATIENTS:READ",
      "PATIENTS:CREATE",
      "PATIENTS:UPDATE",
      "FORM_FIELDS:READ",
      "FORM_FIELDS:CREATE",
      "FORM_FIELDS:UPDATE",
      "FORM_FIELD_GROUPS:READ",
      "FORM_FIELD_GROUPS:CREATE",
    ],
    children: [
      {
        title: "Patient Registry",
        url: "/patients/list",
        icon: ClipboardList,
        anyPermissions: ["PATIENTS:READ", "PATIENTS:CREATE"],
      },
      {
        title: "Configure Patient Forms",
        url: "/patients/form-fields",
        icon: Settings2,
        anyPermissions: [
          "FORM_FIELDS:READ",
          "FORM_FIELDS:CREATE",
          "FORM_FIELDS:UPDATE",
          "FORM_FIELD_GROUPS:READ",
          "FORM_FIELD_GROUPS:CREATE",
          "FORM_FIELD_GROUPS:UPDATE",
        ],
      },
      {
        title: "Identification Slip",
        url: "/patients/slip-configuration",
        icon: ClipboardList,
        anyPermissions: ["PATIENTS:UPDATE", "PATIENTS:READ"],
      },
    ],
  },
  {
    title: "Appointments",
    url: "/appointments",
    icon: CalendarCheck,
    anyPermissions: ["PATIENTS:RECEIVE_APPOINTMENT"],
  },
  {
    title: "Workflow Inbox",
    url: "/workflow-inbox",
    icon: Inbox,
    allPermissions: ["WORKFLOW:READ", "PATIENTS:RECEIVE_PATIENT"],
  },
  {
    title: "Diagnosis",
    url: "/diagnosis-forms",
    icon: Stethoscope,
    anyPermissions: [
      "DIAGNOSIS_FORMS:READ",
      "DIAGNOSIS_FORMS:CREATE",
      "DIAGNOSIS_FORMS:UPDATE",
    ],
  },
  {
    title: "Medical Diagrams",
    url: "/medical-diagrams",
    icon: ImageIcon,
    anyPermissions: [
      "DIAGNOSIS_FORMS:READ",
      "DIAGNOSIS_FORMS:CREATE",
      "DIAGNOSIS_FORMS:UPDATE",
    ],
  },
  {
    title: "Clinical Suggestions",
    url: "/clinical-suggestions",
    icon: Sparkles,
    anyPermissions: [
      "CLINICAL_SUGGESTION:MANAGE",
      "CLINICAL_SUGGESTION:CREATE",
      "CLINICAL_SUGGESTION:UPDATE",
    ],
  },
  {
    title: "Prescriptions",
    url: "/prescriptions",
    icon: Pill,
    anyPermissions: [
      "PRESCRIPTION_TEMPLATE:VIEW",
      "PRESCRIPTION_CATEGORY:VIEW",
      "PRESCRIPTION_TEMPLATE:MANAGE",
    ],
  },
  {
    title: "Pharmacies",
    url: "/pharmacies",
    icon: Store,
    anyPermissions: [
      "PHARMACY:VIEW",
      "PHARMACY:MANAGE",
      "PHARMACY:CREATE",
      "PHARMACY:USER_MANAGE",
    ],
  },
  {
    title: "Billing Services",
    url: "/billing/services",
    icon: Receipt,
    anyPermissions: [
      "BILLING_SERVICE:VIEW",
      "BILLING_SERVICE:CREATE",
      "BILLING_SERVICE:UPDATE",
    ],
  },
  {
    title: "Cashier Desk",
    url: "/finance/cashier",
    icon: Wallet,
    anyPermissions: [
      "CASHIER_QUEUE:VIEW",
      "CASHIER_PAYMENT:CREATE",
      "CASHIER_SESSION:OPEN",
    ],
  },
  {
    title: "Daily Collections",
    url: "/finance/collections",
    icon: Receipt,
    anyPermissions: ["FINANCE_COLLECTIONS:VIEW"],
  },
  {
    title: "Receipt Templates",
    url: "/finance/receipt-templates",
    icon: Receipt,
    anyPermissions: [
      "RECEIPT_TEMPLATE:VIEW",
      "RECEIPT_TEMPLATE:CREATE",
      "RECEIPT_TEMPLATE:UPDATE",
    ],
  },
  {
    title: "Branding",
    url: "/branding",
    icon: Palette,
    allPermissions: ["BRANDING:READ"],
  },
  {
    title: "Audit Log",
    url: "/admin/audit-logs",
    icon: ScrollText,
    allPermissions: ["AUDIT_LOG:VIEW"],
  },
];
