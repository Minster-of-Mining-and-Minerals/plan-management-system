export interface GoldMeasurementUnit {
  unit_id: string;
  name: string;
  code: string;
  symbol: string;
  description?: string | null;
  conversion_factor: number | string;
  is_canonical_base: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AsmMiner {
  asm_id: string;
  full_name: string;
  national_id_number?: string | null;
  mining_license_number?: string | null;
  phone_number?: string | null;
  region?: string | null;
  zone_or_woreda?: string | null;
  kebele?: string | null;
  is_active: boolean;
  registered_center_id?: string | null;
  registered_by_id?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  registeredCenter?: {
    purchasing_center_id: string;
    name: string;
    code: string;
    description?: string | null;
  } | null;
  registeredBy?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface AsmSearchCandidatesResponse {
  exact_matches: AsmMiner[];
  potential_matches: AsmMiner[];
}

export interface GoldPurchase {
  purchase_id: string;
  purchase_reference: string;
  purchasing_center_id: string;
  seller_type: "company" | "asm";
  company_id?: string | null;
  asm_id?: string | null;
  seller_name_snapshot: string;
  seller_identifier_snapshot?: string | null;
  purchase_date: string;
  business_date: string;
  quantity: number | string;
  measurement_unit_id: string;
  unit_code_snapshot: string;
  conversion_factor_snapshot: number | string;
  quantity_in_canonical_unit: number | string;
  unit_price: number | string;
  total_amount: number | string;
  currency: string;
  notes?: string | null;
  status: "completed" | "cancelled";
  cancelled_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by_id?: string | null;
  created_by_id: string;
  created_at?: string;
  updated_at?: string;
  purchasingCenter?: {
    purchasing_center_id: string;
    name: string;
    code: string;
    description?: string | null;
  };
  companySeller?: {
    company_id: string;
    name: string;
    code: string;
    is_active: boolean;
    logo_path?: string | null;
  } | null;
  asmSeller?: {
    asm_id: string;
    full_name: string;
    national_id_number?: string | null;
    mining_license_number?: string | null;
    phone_number?: string | null;
    region?: string | null;
    zone_or_woreda?: string | null;
    kebele?: string | null;
    is_active: boolean;
  } | null;
  measurementUnit?: GoldMeasurementUnit | null;
  createdBy?: {
    user_id: string;
    full_name: string;
    email: string;
  };
  cancelledBy?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface UnitBreakdownItem {
  unit_id: string;
  code: string;
  name: string;
  symbol: string;
  total_quantity: number;
  purchase_count: number;
  conversion_factor?: number;
}

export interface SellerCategorySummary {
  purchase_count?: number;
  count?: number;
  total_canonical_quantity?: number;
  canonical_quantity?: number;
  total_amount?: number;
  amount?: number;
}

export interface DailyReportSummary {
  total_purchases: number;
  cancelled_purchases_count?: number;
  total_quantity_canonical: number;
  total_amount: number;
  currency: string;
  unit_breakdown: UnitBreakdownItem[];
  seller_breakdown: {
    company: SellerCategorySummary;
    asm: SellerCategorySummary;
  };
}

export interface DailyReportSubmission {
  report_id?: string;
  status: "unsubmitted" | "draft" | "submitted" | "reviewed";
  submitted_at?: string | null;
  submitted_by?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
  reviewed_at?: string | null;
  reviewed_by?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
  notes?: string | null;
  is_divergent: boolean;
}

export interface GoldDailyReportResponse {
  purchasing_center: {
    purchasing_center_id: string;
    name: string;
    code: string;
    description?: string | null;
    is_active: boolean;
  };
  business_date: string;
  summary: DailyReportSummary;
  submission: DailyReportSubmission;
  transactions: GoldPurchase[];
}

export interface GoldDailyReportRecord {
  report_id: string;
  purchasing_center_id: string;
  business_date: string;
  total_purchases: number;
  total_quantity_canonical: number | string;
  total_amount: number | string;
  unit_breakdown: UnitBreakdownItem[];
  seller_breakdown: {
    company: SellerCategorySummary;
    asm: SellerCategorySummary;
  };
  status: "draft" | "submitted" | "reviewed";
  submitted_by_id?: string | null;
  submitted_at?: string | null;
  reviewed_by_id?: string | null;
  reviewed_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  purchasingCenter?: {
    purchasing_center_id: string;
    name: string;
    code: string;
    description?: string | null;
  };
  submittedBy?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
  reviewedBy?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface PurchasingCenterDashboardData {
  purchasing_center: {
    purchasing_center_id: string;
    name: string;
    code: string;
    description?: string | null;
    is_active: boolean;
  };
  today: {
    business_date: string;
    purchases_count: number;
    canonical_quantity: number;
    amount: number;
    report_status: string;
    submitted_at?: string | null;
  };
  period_summary: {
    total_purchases: number;
    total_canonical_quantity: number;
    total_amount: number;
    currency: string;
    distinct_sellers: {
      total: number;
      companies: number;
      asm: number;
    };
    unit_breakdown: UnitBreakdownItem[];
    seller_distribution: {
      company: { count: number; canonical_quantity: number; amount: number };
      asm: { count: number; canonical_quantity: number; amount: number };
    };
  };
  daily_trends: Array<{
    date: string;
    count: number;
    canonical_quantity: number;
    amount: number;
  }>;
  recent_purchases: GoldPurchase[];
}

export interface CenterOversightSummary {
  purchasing_center_id: string;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  total_purchases: number;
  total_quantity_canonical: number;
  total_amount: number;
  today_purchases: number;
  today_quantity_canonical: number;
  today_amount: number;
  today_report_status: string;
  today_report_submitted_at?: string | null;
}

export interface FederalOversightDashboardData {
  overview: {
    total_centers: number;
    active_centers: number;
    inactive_centers: number;
    total_purchases: number;
    total_quantity_canonical: number;
    total_amount: number;
    currency: string;
  };
  today: {
    business_date: string;
    purchases_count: number;
    canonical_quantity: number;
    amount: number;
    submitted_reports_count: number;
    reporting_completion_rate: number;
  };
  seller_distribution: {
    company: { count: number; canonical_quantity: number; amount: number };
    asm: { count: number; canonical_quantity: number; amount: number };
  };
  centers: CenterOversightSummary[];
  recent_purchases: GoldPurchase[];
}

export interface CreateGoldPurchasePayload {
  purchasing_center_id?: string;
  seller_type: "company" | "asm";
  company_id?: string;
  asm_id?: string;
  quantity: number | string;
  measurement_unit_id: string;
  unit_price: number | string;
  business_date?: string;
  notes?: string;
}

export interface RegisterAsmMinerPayload {
  full_name: string;
  national_id_number?: string;
  mining_license_number?: string;
  phone_number?: string;
  region?: string;
  zone_or_woreda?: string;
  kebele?: string;
  notes?: string;
}

export interface CreateMeasurementUnitPayload {
  name: string;
  code: string;
  symbol: string;
  description?: string;
  conversion_factor: number | string;
  is_canonical_base?: boolean;
}
