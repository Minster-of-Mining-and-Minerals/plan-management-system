/** Realistic HMS operational metrics — static demo data aligned with NOVACURE modules. */

export const HOSPITAL_KPI_DEFAULTS = {
  totalPatients: 1248,
  todayAppointments: 86,
  activeDoctors: 42,
  availableBeds: 38,
  pendingLabResults: 127,
  pharmacyAlerts: 9,
  emergencyCases: 7,
  revenueToday: 284500,
  admittedPatients: 156,
  activeDepartments: 12,
};

export const PATIENT_REGISTRATION_TREND = [
  { month: "Jan", registrations: 82, outpatient: 68, inpatient: 14 },
  { month: "Feb", registrations: 95, outpatient: 78, inpatient: 17 },
  { month: "Mar", registrations: 108, outpatient: 89, inpatient: 19 },
  { month: "Apr", registrations: 112, outpatient: 92, inpatient: 20 },
  { month: "May", registrations: 124, outpatient: 101, inpatient: 23 },
  { month: "Jun", registrations: 118, outpatient: 96, inpatient: 22 },
];

export const APPOINTMENT_VOLUME_WEEKLY = [
  { day: "Mon", scheduled: 94, completed: 88, cancelled: 6 },
  { day: "Tue", scheduled: 102, completed: 96, cancelled: 4 },
  { day: "Wed", scheduled: 98, completed: 91, cancelled: 7 },
  { day: "Thu", scheduled: 110, completed: 104, cancelled: 5 },
  { day: "Fri", scheduled: 105, completed: 99, cancelled: 6 },
  { day: "Sat", scheduled: 52, completed: 48, cancelled: 4 },
  { day: "Sun", scheduled: 28, completed: 26, cancelled: 2 },
];

export const DEPARTMENT_OVERVIEW = [
  {
    id: "cardiology",
    name: "Cardiology",
    queue: 14,
    activeStaff: 8,
    consultations: 32,
    pendingRequests: 5,
    load: 78,
  },
  {
    id: "er",
    name: "Emergency (ER)",
    queue: 11,
    activeStaff: 12,
    consultations: 48,
    pendingRequests: 9,
    load: 92,
  },
  {
    id: "pediatrics",
    name: "Pediatrics",
    queue: 9,
    activeStaff: 6,
    consultations: 24,
    pendingRequests: 3,
    load: 65,
  },
  {
    id: "laboratory",
    name: "Laboratory",
    queue: 22,
    activeStaff: 10,
    consultations: 0,
    pendingRequests: 127,
    load: 85,
  },
  {
    id: "radiology",
    name: "Radiology",
    queue: 8,
    activeStaff: 5,
    consultations: 0,
    pendingRequests: 18,
    load: 58,
  },
  {
    id: "pharmacy",
    name: "Pharmacy",
    queue: 16,
    activeStaff: 7,
    consultations: 0,
    pendingRequests: 34,
    load: 72,
  },
];

export const TOP_DOCTORS = [
  {
    name: "Dr. Selamawit Bekele",
    specialty: "Internal Medicine",
    todaySchedule: 14,
    completed: 11,
    queue: 3,
    rating: 4.9,
  },
  {
    name: "Dr. Yonas Haile",
    specialty: "Cardiology",
    todaySchedule: 12,
    completed: 10,
    queue: 2,
    rating: 4.8,
  },
  {
    name: "Dr. Hanna Mekonnen",
    specialty: "Pediatrics",
    todaySchedule: 10,
    completed: 8,
    queue: 2,
    rating: 4.9,
  },
  {
    name: "Dr. Dawit Alemu",
    specialty: "Family Medicine",
    todaySchedule: 16,
    completed: 14,
    queue: 2,
    rating: 4.7,
  },
];

export const LAB_OPERATIONS = {
  pending: 127,
  completedToday: 84,
  critical: 4,
  abnormal: 18,
  processing: 31,
  workflow: [
    { stage: "Sample collected", count: 42 },
    { stage: "In processing", count: 31 },
    { stage: "Awaiting review", count: 22 },
    { stage: "Published", count: 84 },
  ],
};

export const PHARMACY_OPERATIONS = {
  lowStock: 9,
  expiring30Days: 14,
  prescriptionsToday: 156,
  dispensedToday: 142,
  volumeByDay: [
    { day: "Mon", prescriptions: 148 },
    { day: "Tue", prescriptions: 162 },
    { day: "Wed", prescriptions: 155 },
    { day: "Thu", prescriptions: 171 },
    { day: "Fri", prescriptions: 156 },
    { day: "Sat", prescriptions: 72 },
    { day: "Sun", prescriptions: 38 },
  ],
};

export const REVENUE_BREAKDOWN = [
  { source: "Consultations", amount: 98500, fill: "hsl(var(--chart-1))" },
  { source: "Pharmacy", amount: 62400, fill: "hsl(var(--chart-2))" },
  { source: "Laboratory", amount: 48200, fill: "hsl(var(--chart-3))" },
  { source: "Radiology", amount: 35800, fill: "hsl(var(--chart-4))" },
  { source: "Admissions", amount: 39600, fill: "hsl(var(--chart-5))" },
];

export const PAYMENT_TREND = [
  { week: "W1", collected: 820000, outstanding: 124000 },
  { week: "W2", collected: 910000, outstanding: 98000 },
  { week: "W3", collected: 875000, outstanding: 142000 },
  { week: "W4", collected: 940000, outstanding: 86000 },
];

export const EMERGENCY_IPD = {
  emergencyQueue: 7,
  criticalPatients: 3,
  bedOccupancy: 87,
  icuOccupancy: 76,
  admissionsToday: 12,
  dischargesToday: 8,
  beds: { total: 180, occupied: 156, available: 24 },
  icu: { total: 24, occupied: 18, available: 6 },
};

export const RECENT_ACTIVITIES = [
  {
    id: "1",
    type: "patient",
    message: "New patient registered — Eden Mulugeta Berhanu",
    time: "12 min ago",
    module: "Patient Registry",
  },
  {
    id: "2",
    type: "lab",
    message: "Critical lab result flagged — Lipid Panel (LDL elevated)",
    time: "28 min ago",
    module: "Laboratory",
  },
  {
    id: "3",
    type: "prescription",
    message: "Prescription issued — Amlodipine 5mg for patient NC-20260522-0001",
    time: "45 min ago",
    module: "Pharmacy",
  },
  {
    id: "4",
    type: "admission",
    message: "Patient admitted to Ward B — post-operative monitoring",
    time: "1 hr ago",
    module: "IPD",
  },
  {
    id: "5",
    type: "billing",
    message: "Invoice INV-2026-0518 paid — ETB 1,250.00",
    time: "2 hr ago",
    module: "Billing",
  },
  {
    id: "6",
    type: "consultation",
    message: "Dr. Selamawit completed consultation — hypertension follow-up",
    time: "2 hr ago",
    module: "Consultations",
  },
  {
    id: "7",
    type: "department",
    message: "Department head assigned — Cardiology",
    time: "3 hr ago",
    module: "Departments",
  },
];

export const OPERATIONAL_NOTIFICATIONS = [
  {
    id: "n1",
    severity: "critical",
    title: "Critical lab alert",
    message: "4 results require immediate physician review",
    module: "Laboratory",
  },
  {
    id: "n2",
    severity: "warning",
    title: "Medication expiring",
    message: "14 items expire within 30 days — pharmacy restock needed",
    module: "Pharmacy",
  },
  {
    id: "n3",
    severity: "warning",
    title: "ER capacity",
    message: "Emergency queue at 92% load — consider surge staffing",
    module: "Emergency",
  },
  {
    id: "n4",
    severity: "info",
    title: "Doctor unavailable",
    message: "Dr. Bereket Solomon — on leave until Jun 2",
    module: "Staff",
  },
  {
    id: "n5",
    severity: "info",
    title: "Pending approvals",
    message: "6 insurance pre-authorizations awaiting admin review",
    module: "Billing",
  },
];

export const BED_OCCUPANCY_BY_WARD = [
  { ward: "General", occupancy: 82 },
  { ward: "Surgical", occupancy: 91 },
  { ward: "Maternity", occupancy: 74 },
  { ward: "ICU", occupancy: 76 },
  { ward: "Pediatric", occupancy: 68 },
];

export const formatETB = (amount: number) =>
  new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 0,
  }).format(amount);
