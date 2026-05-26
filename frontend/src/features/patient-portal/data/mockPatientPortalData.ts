import type {
  Appointment,
  DoctorInfo,
  FamilyMember,
  HealthInsight,
  Invoice,
  LabResult,
  MedicalHistoryEvent,
  PortalNotification,
  Prescription,
  TelemedicineSession,
} from "../types";

export const MOCK_DOCTORS: DoctorInfo[] = [
  {
    id: "d1",
    name: "Dr. Selamawit Bekele",
    specialty: "Internal Medicine",
    department: "General Medicine",
    avatarInitials: "SB",
    rating: 4.9,
  },
  {
    id: "d2",
    name: "Dr. Yonas Haile",
    specialty: "Cardiology",
    department: "Heart Center",
    avatarInitials: "YH",
    rating: 4.8,
  },
  {
    id: "d3",
    name: "Dr. Hanna Mekonnen",
    specialty: "Laboratory Medicine",
    department: "Diagnostics",
    avatarInitials: "HM",
    rating: 4.7,
  },
  {
    id: "d4",
    name: "Dr. Dawit Alemu",
    specialty: "Family Medicine",
    department: "Outpatient",
    avatarInitials: "DA",
    rating: 4.9,
  },
];

export const MOCK_UPCOMING_APPOINTMENTS: Appointment[] = [
  {
    id: "a1",
    doctor: MOCK_DOCTORS[0],
    date: "2026-05-28",
    time: "10:30 AM",
    type: "Follow-up Consultation",
    location: "NovaCure Main Campus — Room 204",
    status: "confirmed",
    notes: "Bring recent blood pressure readings.",
  },
  {
    id: "a2",
    doctor: MOCK_DOCTORS[1],
    date: "2026-06-05",
    time: "2:00 PM",
    type: "Cardiology Review",
    location: "Heart Center — Suite 12",
    status: "scheduled",
  },
];

export const MOCK_PAST_APPOINTMENTS: Appointment[] = [
  {
    id: "a3",
    doctor: MOCK_DOCTORS[3],
    date: "2026-04-12",
    time: "9:00 AM",
    type: "Annual Wellness Visit",
    location: "Outpatient Clinic A",
    status: "completed",
  },
  {
    id: "a4",
    doctor: MOCK_DOCTORS[0],
    date: "2026-03-20",
    time: "11:15 AM",
    type: "Hypertension Follow-up",
    location: "NovaCure Main Campus — Room 204",
    status: "completed",
  },
  {
    id: "a5",
    doctor: MOCK_DOCTORS[2],
    date: "2026-02-08",
    time: "8:30 AM",
    type: "Lab Review",
    location: "Diagnostics Wing",
    status: "completed",
  },
];

export const MOCK_LAB_RESULTS: LabResult[] = [
  {
    id: "l1",
    name: "Complete Blood Count (CBC)",
    category: "Hematology",
    orderedDate: "2026-05-20",
    resultDate: "2026-05-22",
    status: "ready",
    doctor: "Dr. Selamawit Bekele",
    summary: "All values within normal range.",
  },
  {
    id: "l2",
    name: "Lipid Panel",
    category: "Chemistry",
    orderedDate: "2026-05-20",
    resultDate: "2026-05-22",
    status: "ready",
    doctor: "Dr. Yonas Haile",
    abnormal: true,
    summary: "LDL slightly elevated — lifestyle counseling recommended.",
  },
  {
    id: "l3",
    name: "HbA1c",
    category: "Diabetes Monitoring",
    orderedDate: "2026-04-10",
    resultDate: "2026-04-12",
    status: "reviewed",
    doctor: "Dr. Selamawit Bekele",
    summary: "6.1% — pre-diabetic range, continue monitoring.",
  },
  {
    id: "l4",
    name: "Thyroid Function (TSH)",
    category: "Endocrinology",
    orderedDate: "2026-05-25",
    status: "processing",
    doctor: "Dr. Dawit Alemu",
  },
];

export const MOCK_LAB_DETAIL: Record<string, { tests: { name: string; value: string; unit: string; range: string; flag?: string }[] }> = {
  l1: {
    tests: [
      { name: "WBC", value: "6.2", unit: "10³/µL", range: "4.0–11.0" },
      { name: "RBC", value: "4.8", unit: "10⁶/µL", range: "4.2–5.4" },
      { name: "Hemoglobin", value: "14.2", unit: "g/dL", range: "12.0–16.0" },
      { name: "Platelets", value: "245", unit: "10³/µL", range: "150–400" },
    ],
  },
  l2: {
    tests: [
      { name: "Total Cholesterol", value: "198", unit: "mg/dL", range: "<200" },
      { name: "LDL", value: "142", unit: "mg/dL", range: "<100", flag: "High" },
      { name: "HDL", value: "48", unit: "mg/dL", range: ">40" },
      { name: "Triglycerides", value: "155", unit: "mg/dL", range: "<150", flag: "Borderline" },
    ],
  },
};

export const MOCK_PRESCRIPTIONS: Prescription[] = [
  {
    id: "p1",
    medication: "Amlodipine",
    dosage: "5 mg",
    frequency: "Once daily",
    doctor: "Dr. Selamawit Bekele",
    startDate: "2025-11-01",
    status: "active",
    refillsRemaining: 2,
    instructions: "Take in the morning with water.",
  },
  {
    id: "p2",
    medication: "Atorvastatin",
    dosage: "20 mg",
    frequency: "Once daily at bedtime",
    doctor: "Dr. Yonas Haile",
    startDate: "2026-01-15",
    status: "active",
    refillsRemaining: 1,
    instructions: "Avoid grapefruit juice.",
  },
  {
    id: "p3",
    medication: "Vitamin D3",
    dosage: "1000 IU",
    frequency: "Once daily",
    doctor: "Dr. Dawit Alemu",
    startDate: "2025-08-20",
    endDate: "2026-02-20",
    status: "completed",
    refillsRemaining: 0,
  },
];

export const MOCK_MEDICAL_HISTORY: MedicalHistoryEvent[] = [
  {
    id: "h1",
    date: "2026-04-12",
    type: "visit",
    title: "Annual Wellness Visit",
    description: "Routine physical examination, vitals stable.",
    provider: "Dr. Dawit Alemu",
  },
  {
    id: "h2",
    date: "2026-03-20",
    type: "diagnosis",
    title: "Essential Hypertension — Stage 1",
    description: "Blood pressure consistently 138/88. Lifestyle modification plan initiated.",
    provider: "Dr. Selamawit Bekele",
    severity: "medium",
  },
  {
    id: "h3",
    date: "2026-01-15",
    type: "treatment",
    title: "Statin Therapy Started",
    description: "Atorvastatin 20mg prescribed for elevated LDL.",
    provider: "Dr. Yonas Haile",
  },
  {
    id: "h4",
    date: "2024-06-10",
    type: "surgery",
    title: "Appendectomy",
    description: "Laparoscopic appendectomy — uncomplicated recovery.",
    provider: "Dr. Bereket Solomon",
    severity: "high",
  },
  {
    id: "h5",
    date: "2020-01-01",
    type: "allergy",
    title: "Penicillin Allergy",
    description: "Documented rash reaction. Avoid penicillin-class antibiotics.",
    severity: "high",
  },
  {
    id: "h6",
    date: "2025-06-01",
    type: "condition",
    title: "Pre-diabetes (HbA1c monitoring)",
    description: "Ongoing lifestyle management and quarterly lab monitoring.",
    provider: "Dr. Selamawit Bekele",
    severity: "medium",
  },
];

export const MOCK_NOTIFICATIONS: PortalNotification[] = [
  {
    id: "n1",
    type: "appointment",
    title: "Appointment Reminder",
    message: "Follow-up with Dr. Selamawit Bekele on May 28 at 10:30 AM.",
    timestamp: "2026-05-25T08:00:00",
    read: false,
    actionLabel: "View appointment",
  },
  {
    id: "n2",
    type: "lab",
    title: "Lab Results Ready",
    message: "Your Lipid Panel results are available for review.",
    timestamp: "2026-05-22T14:30:00",
    read: false,
    actionLabel: "View results",
  },
  {
    id: "n3",
    type: "prescription",
    title: "Refill Reminder",
    message: "Amlodipine has 2 refills remaining. Request refill before June 1.",
    timestamp: "2026-05-20T09:00:00",
    read: true,
  },
  {
    id: "n4",
    type: "billing",
    title: "Invoice Available",
    message: "Invoice #INV-2026-0412 for ETB 1,250.00 is ready.",
    timestamp: "2026-05-18T11:00:00",
    read: true,
    actionLabel: "View invoice",
  },
  {
    id: "n5",
    type: "general",
    title: "Welcome to NovaCure Patient Portal",
    message: "Your digital health journey starts here. Explore appointments, labs, and more.",
    timestamp: "2026-05-01T10:00:00",
    read: true,
  },
];

export const MOCK_INVOICES: Invoice[] = [
  {
    id: "INV-2026-0518",
    date: "2026-05-18",
    description: "Cardiology Consultation — Dr. Yonas Haile",
    amount: 1250,
    status: "pending",
    provider: "NovaCure Heart Center",
  },
  {
    id: "INV-2026-0412",
    date: "2026-04-12",
    description: "Annual Wellness Visit + Labs",
    amount: 2800,
    status: "paid",
    provider: "NovaCure Main Campus",
  },
  {
    id: "INV-2026-0320",
    date: "2026-03-20",
    description: "Hypertension Follow-up",
    amount: 850,
    status: "paid",
    provider: "NovaCure General Medicine",
  },
  {
    id: "INV-2026-0115",
    date: "2026-01-15",
    description: "Insurance Co-pay — Cardiology",
    amount: 450,
    status: "processing",
    provider: "Nyala Insurance / NovaCure",
  },
];

export const MOCK_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: "f1",
    name: "Sara Tadesse",
    relationship: "Spouse",
    age: 32,
    avatarInitials: "ST",
    lastVisit: "2026-04-05",
    conditions: ["Asthma"],
  },
  {
    id: "f2",
    name: "Liya Tadesse",
    relationship: "Daughter",
    age: 8,
    avatarInitials: "LT",
    lastVisit: "2026-03-15",
    conditions: ["Seasonal allergies"],
  },
  {
    id: "f3",
    name: "Tadesse Bekele",
    relationship: "Parent",
    age: 68,
    avatarInitials: "TB",
    lastVisit: "2026-05-10",
    conditions: ["Hypertension", "Type 2 Diabetes"],
  },
];

export const MOCK_TELEMEDICINE: TelemedicineSession[] = [
  {
    id: "t1",
    doctor: MOCK_DOCTORS[0],
    scheduledAt: "2026-05-30T15:00:00",
    duration: "30 min",
    status: "upcoming",
    type: "video",
  },
  {
    id: "t2",
    doctor: MOCK_DOCTORS[1],
    scheduledAt: "2026-04-28T10:00:00",
    duration: "25 min",
    status: "completed",
    type: "video",
  },
  {
    id: "t3",
    doctor: MOCK_DOCTORS[3],
    scheduledAt: "2026-03-10T14:00:00",
    duration: "15 min",
    status: "completed",
    type: "chat",
  },
];

export const MOCK_HEALTH_INSIGHTS: HealthInsight[] = [
  {
    id: "i1",
    title: "Blood Pressure Trend",
    description: "Your readings improved 8% over the last 30 days. Keep up daily monitoring.",
    category: "Vitals",
    priority: "low",
  },
  {
    id: "i2",
    title: "Medication Adherence",
    description: "94% adherence this month. Set a reminder for evening Atorvastatin.",
    category: "Medications",
    priority: "medium",
  },
  {
    id: "i3",
    title: "LDL Cholesterol",
    description: "Slightly elevated. Consider dietary changes discussed with your cardiologist.",
    category: "Lab Results",
    priority: "high",
  },
];

export const MOCK_HEALTH_SUMMARY = {
  bloodPressure: "128/82 mmHg",
  heartRate: "72 bpm",
  weight: "74 kg",
  bmi: "23.4",
  lastUpdated: "2026-05-22",
};

export const MOCK_VITALS_CHART = [
  { day: "Mon", systolic: 132, diastolic: 86 },
  { day: "Tue", systolic: 128, diastolic: 82 },
  { day: "Wed", systolic: 130, diastolic: 84 },
  { day: "Thu", systolic: 126, diastolic: 80 },
  { day: "Fri", systolic: 128, diastolic: 82 },
  { day: "Sat", systolic: 124, diastolic: 78 },
  { day: "Sun", systolic: 128, diastolic: 82 },
];

export const MOCK_INSURANCE = {
  provider: "Nyala Insurance",
  policyNumber: "NYL-10001",
  groupNumber: "GRP-A1",
  coverageType: "Employer",
  policyHolder: "Amanuel Tadesse Bekele",
  validUntil: "2026-12-31",
};

export const MOCK_EMERGENCY_CONTACTS = [
  {
    name: "Sara Tadesse",
    relationship: "Spouse",
    phone: "0912345678",
    address: "Bole, Addis Ababa",
  },
];

export const MOCK_AI_SYMPTOMS = [
  { id: "s1", label: "Headache", category: "Neurological" },
  { id: "s2", label: "Fatigue", category: "General" },
  { id: "s3", label: "Chest discomfort", category: "Cardiac" },
  { id: "s4", label: "Shortness of breath", category: "Respiratory" },
  { id: "s5", label: "Fever", category: "General" },
  { id: "s6", label: "Dizziness", category: "Neurological" },
];

export const MOCK_AI_RECOMMENDATIONS = [
  {
    title: "Hydration & Rest",
    text: "Based on reported fatigue, ensure adequate hydration and 7–8 hours of sleep.",
    confidence: "Demo",
  },
  {
    title: "Schedule Follow-up",
    text: "If symptoms persist beyond 48 hours, book a consultation with your primary care physician.",
    confidence: "Demo",
  },
];

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 0,
  }).format(amount);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
