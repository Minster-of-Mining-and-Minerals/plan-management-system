export type MedicalCertificateIncludeOptions = {
  diagnosis?: boolean;
  treatment?: boolean;
  prescription_reference?: boolean;
  lab_results?: boolean;
  procedure_notes?: boolean;
  referral?: boolean;
};

export type MedicalCertificateTemplate = {
  template_id: string;
  name: string;
  code: string;
  header_html: string;
  footer_html: string;
  html_content: string;
  stamp_image_file?: string | null;
  has_template_stamp: boolean;
  is_default: boolean;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type MedicalCertificatePlaceholder = {
  key: string;
  description: string;
};

export type MedicalCertificate = {
  certificate_id: string;
  certificate_number: string;
  patient_id: string;
  schedule_id?: string | null;
  appointment_id?: string | null;
  template_id: string;
  include_options: MedicalCertificateIncludeOptions;
  doctor_notes?: string | null;
  rendered_html: string;
  signature_type: string;
  verification_code?: string | null;
  issued_by?: string | null;
  created_at?: string;
  template?: MedicalCertificateTemplate;
  patient?: { user_id: string; full_name: string };
  issuer?: { user_id: string; full_name: string };
};

export type MedicalCertificatePreviewResult = {
  rendered_html: string;
  certificate_number: string;
  verification_code: string;
  include_options: MedicalCertificateIncludeOptions;
  patient_id: string;
  schedule_id: string | null;
  appointment_id: string | null;
  template_id: string | null;
  signature_type: string;
};

export const DEFAULT_CERTIFICATE_INCLUDE_OPTIONS: MedicalCertificateIncludeOptions =
  {
    diagnosis: true,
    treatment: true,
    prescription_reference: true,
    lab_results: false,
    procedure_notes: true,
    referral: true,
  };
