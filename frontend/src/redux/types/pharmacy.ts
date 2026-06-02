export type PharmacyStatus = "active" | "inactive";

export type Pharmacy = {
  pharmacy_id: string;
  pharmacy_name: string;
  pharmacy_code: string;
  license_number?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  contact_person?: string | null;
  logo?: string | null;
  status: PharmacyStatus;
  user_count?: number;
  users?: PharmacyUser[];
  created_at?: string;
  updated_at?: string;
};

export type PharmacyUser = {
  user_id: string;
  full_name: string;
  email: string;
  phone_number?: string | null;
  is_active: boolean;
  pharmacy_id: string;
  portal_role: "admin" | "staff";
  pharmacy?: Pharmacy;
};

export type PharmacyPrescriptionStatus =
  | "received"
  | "reviewing"
  | "preparing"
  | "partially_dispensed"
  | "dispensed"
  | "unavailable"
  | "rejected"
  | "completed";

export type PharmacyPrescriptionItem = {
  pharmacy_prescription_item_id: string;
  pharmacy_prescription_id: string;
  source_prescription_item_id?: string | null;
  item_name: string;
  strength?: string | null;
  route?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
  quantity?: string | null;
  notes?: string | null;
  sort_order: number;
  dispensed_quantity?: string | null;
  pharmacy_item_status: string;
  substitution_notes?: string | null;
  pharmacy_notes?: string | null;
};

export type PharmacyPrescription = {
  pharmacy_prescription_id: string;
  original_prescription_id: string;
  pharmacy_id: string;
  patient_id: string;
  prescriber_id: string;
  source_rendered_html?: string | null;
  source_notes?: string | null;
  source_header_title?: string | null;
  patient_snapshot?: Record<string, unknown> | null;
  prescriber_snapshot?: Record<string, unknown> | null;
  pharmacy_status: PharmacyPrescriptionStatus;
  pharmacy_notes?: string | null;
  sent_at?: string | null;
  received_at?: string | null;
  completed_at?: string | null;
  patient_name?: string | null;
  prescriber_name?: string | null;
  pharmacy_name?: string | null;
  items?: PharmacyPrescriptionItem[];
  patient?: { user_id: string; full_name: string };
  prescriber?: { user_id: string; full_name: string };
};

export type PatientPrescriptionForSend = {
  prescription_id: string;
  header_title?: string | null;
  issued_at?: string | null;
  notes?: string | null;
  pharmacy_sends: {
    pharmacy_id: string;
    pharmacy_status: string;
    original_prescription_id: string;
  }[];
};

export type PharmacyDashboardStats = {
  pending: number;
  queue: number;
  completedToday: number;
  unavailable: number;
};
