export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rescheduled";

export type LabResultStatus = "pending" | "processing" | "ready" | "reviewed";

export type PrescriptionStatus = "active" | "completed" | "refill_requested";

export type NotificationType =
  | "appointment"
  | "prescription"
  | "lab"
  | "billing"
  | "general";

export type InvoiceStatus = "paid" | "pending" | "overdue" | "processing";

export interface DoctorInfo {
  id: string;
  name: string;
  specialty: string;
  department: string;
  avatarInitials: string;
  rating?: number;
}

export interface Appointment {
  id: string;
  doctor: DoctorInfo;
  date: string;
  time: string;
  type: string;
  location: string;
  status: AppointmentStatus;
  notes?: string;
}

export interface LabResult {
  id: string;
  name: string;
  category: string;
  orderedDate: string;
  resultDate?: string;
  status: LabResultStatus;
  doctor: string;
  abnormal?: boolean;
  summary?: string;
}

export interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  doctor: string;
  startDate: string;
  endDate?: string;
  status: PrescriptionStatus;
  refillsRemaining: number;
  instructions?: string;
}

export interface MedicalHistoryEvent {
  id: string;
  date: string;
  type: "visit" | "diagnosis" | "treatment" | "surgery" | "allergy" | "condition";
  title: string;
  description: string;
  provider?: string;
  severity?: "low" | "medium" | "high";
}

export interface PortalNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionLabel?: string;
}

export interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: InvoiceStatus;
  provider: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  age: number;
  avatarInitials: string;
  lastVisit?: string;
  conditions?: string[];
}

export interface TelemedicineSession {
  id: string;
  doctor: DoctorInfo;
  scheduledAt: string;
  duration: string;
  status: "upcoming" | "completed" | "cancelled";
  type: "video" | "chat";
}

export interface HealthInsight {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high";
}
