export type PrescriptionCategory = {
  category_id: string;
  name: string;
  code: string;
  description?: string | null;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
};

export type PrescriptionTemplateItem = {
  item_id?: string;
  template_id?: string;
  item_name: string;
  strength?: string | null;
  route?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
  quantity?: string | null;
  notes?: string | null;
  sort_order?: number;
};

export type PrescriptionTemplate = {
  template_id: string;
  category_id: string;
  name: string;
  code: string;
  description?: string | null;
  template_type?: string | null;
  template_content?: string | null;
  has_template_signature: boolean;
  template_signature_file?: string | null;
  allow_user_signature_override: boolean;
  status: "active" | "archived";
  signature_type_label?: string;
  category?: Pick<PrescriptionCategory, "category_id" | "name" | "code">;
  items?: PrescriptionTemplateItem[];
  created_at?: string;
};

export type PrescriptionItem = PrescriptionTemplateItem & {
  prescription_item_id?: string;
  prescription_id?: string;
};

export type PrescriptionRecord = {
  prescription_id: string;
  appointment_id?: string | null;
  patient_id: string;
  prescriber_id: string;
  category_id?: string | null;
  template_id?: string | null;
  header_title?: string | null;
  signature_type: "template" | "user" | "none";
  rendered_html?: string | null;
  notes?: string | null;
  status: string;
  issued_at?: string | null;
  workflow_log_id?: string | null;
  created_at?: string;
  updated_at?: string;
  items?: PrescriptionItem[];
  category?: PrescriptionCategory;
  template?: PrescriptionTemplate;
  prescriber?: { user_id: string; full_name: string };
  patient?: { user_id: string; full_name: string; patientProfile?: { patient_code?: string } };
};

export type SignatureCapabilities = {
  user_signature_available: boolean;
  template_signature_available: boolean;
  allow_user_signature_override: boolean;
  default_signature_type: "template" | "user" | "none";
};

export type PrescriptionPreviewResult = {
  html: string;
  signature_type: string;
  can_use_user_signature: boolean;
  can_use_template_signature: boolean;
};
