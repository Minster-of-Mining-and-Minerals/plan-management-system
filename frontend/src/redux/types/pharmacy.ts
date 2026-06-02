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
  users?: PharmacyUserProfileApi[];
  created_at?: string;
  updated_at?: string;
};

/** Normalized row for pharmacy user tables (from API profile + nested user). */
export type PharmacyUserRow = {
  pharmacy_user_profile_id: string;
  user_id: string;
  pharmacy_id: string;
  full_name: string;
  email: string;
  phone_number?: string | null;
  is_active: boolean;
  portal_role: "admin" | "staff";
};

export type PharmacyUser = PharmacyUserRow & {
  pharmacy?: Pharmacy;
};

/** Nested shape returned on pharmacy detail `users` include. */
export type PharmacyUserProfileApi = {
  pharmacy_user_profile_id: string;
  user_id: string;
  pharmacy_id: string;
  portal_role: "admin" | "staff";
  is_active?: boolean;
  user?: {
    user_id: string;
    full_name: string;
    email: string;
    phone_number?: string | null;
    is_active: boolean;
  };
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
  pharmacy_forward?: SchedulePrescriptionForward | null;
  pharmacy_sends: {
    pharmacy_id: string;
    pharmacy_status: string;
    original_prescription_id: string;
  }[];
};

export type SchedulePrescriptionForward = {
  forward_id: string;
  prescription_id?: string;
  pharmacy_id: string;
  pharmacy_name?: string | null;
  pharmacy_code?: string | null;
  forward_status: string;
  sent_at: string;
  sent_by_name?: string | null;
  pharmacy_status?: string | null;
  pharmacy_prescription_id?: string;
  is_forwarded?: boolean;
  files?: {
    forward_file_id: string;
    attachment_id: string;
    file_name?: string;
    file_path?: string;
    added_at?: string;
  }[];
};

export type SchedulePrescriptionPharmacySend = {
  pharmacy_id: string;
  pharmacy_status: string;
};

export type SchedulePrescriptionForPharmacy = {
  prescription_id: string;
  header_title?: string | null;
  issued_at?: string | null;
  notes?: string | null;
  status: string;
  item_count: number;
  prescriber_name?: string | null;
  pharmacy_sends?: SchedulePrescriptionPharmacySend[];
  pharmacy_forward: SchedulePrescriptionForward | null;
};

export type ForwardPrescriptionsFromScheduleResult = {
  forwarded: {
    prescription_id: string;
    data: PharmacyPrescription;
    updated?: boolean;
  }[];
  failed: { prescription_id: string; message: string }[];
};

export type SchedulePrescriptionsForPharmacyResponse = {
  schedule_id: string;
  patient_id: string;
  appointment_id: string;
  has_any_forwarded?: boolean;
  prescriptions: SchedulePrescriptionForPharmacy[];
};

export type PharmacyDashboardUserStat = {
  user_id: string;
  full_name: string;
  email: string;
  portal_role: "admin" | "staff";
  is_active: boolean;
  workflow_updates: number;
  fulfillments: number;
  prescriptions_completed: number;
};

export type PharmacyDashboardStats = {
  summary: {
    total: number;
    receivedToday: number;
    completedToday: number;
    unavailableItems: number;
    teamTotal: number;
    teamActive: number;
  };
  byStatus: Record<PharmacyPrescriptionStatus, number>;
  byUser: PharmacyDashboardUserStat[];
  /** @deprecated use byStatus */
  pending?: number;
  queue?: number;
  completedToday?: number;
  unavailable?: number;
};
