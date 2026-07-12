export type BillingServiceCategory = {
  category_id: string;
  name: string;
  code: string;
  description?: string | null;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
};

export type BillingService = {
  service_id: string;
  category_id?: string | null;
  department_id?: string | null;
  name: string;
  code?: string | null;
  unit_price: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: "active" | "inactive";
  effective_date?: string | null;
  category_name?: string | null;
  department_name?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BillingServiceListResponse = {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  results: BillingService[];
};

export type AppointmentBillingEntry = {
  entry_id: string;
  account_id: string;
  appointment_id: string;
  service_id?: string | null;
  service_name: string;
  service_code?: string | null;
  category_name?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  quantity: number;
  unit_price: number;
  original_unit_price?: number | null;
  tax_percent: number;
  line_subtotal: number;
  discount_type?: string | null;
  discount_value?: number | null;
  discount_amount: number;
  line_tax_amount: number;
  line_total: number;
  currency: string;
  note?: string | null;
  status: string;
  has_price_override?: boolean;
  override_reason?: string | null;
  added_by_name?: string | null;
  added_by_department?: string | null;
  created_at: string;
};

export type AppointmentBillingSummary = {
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
};

export type AppointmentBillingContext = {
  account: {
    account_id: string;
    appointment_id: string;
    patient_id: string;
    status: string;
    subtotal: number;
    discount_total: number;
    tax_total: number;
    grand_total: number;
    currency: string;
  };
  entries: AppointmentBillingEntry[];
  summary: AppointmentBillingSummary;
};
