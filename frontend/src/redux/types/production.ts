export interface GoldMeasurementUnit {
  unit_id: string;
  name: string;
  code: string;
  symbol: string;
  description?: string | null;
  conversion_factor: number | string;
  is_canonical_base?: boolean;
  is_active?: boolean;
}

export interface ProductionItemUnit {
  item_unit_id: string;
  production_item_id: string;
  unit_id: string;
  conversion_factor_to_base: number | string;
  is_default: boolean;
  is_active: boolean;
  measurementUnit?: GoldMeasurementUnit;
}

export interface ProductionItem {
  production_item_id: string;
  name: string;
  code: string;
  description?: string | null;
  category?: string | null;
  base_unit_id: string;
  default_reporting_unit_id?: string | null;
  is_active: boolean;
  baseUnit?: GoldMeasurementUnit;
  defaultReportingUnit?: GoldMeasurementUnit;
  supportedUnits?: ProductionItemUnit[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductionReportingFrequency {
  frequency_id: string;
  code: string;
  name: string;
  interval_days?: number | null;
  description?: string | null;
  calendar_basis: string;
  is_active: boolean;
}

export interface TargetPeriodNode {
  target_period_type: "year" | "half_year" | "quarter" | "month" | "day";
  period_label: string;
  period_start_date: string;
  period_end_date: string;
  target_quantity?: number | string;
  unit_id?: string;
  children?: TargetPeriodNode[];
}

export interface CompanyProductionTarget {
  target_id: string;
  assignment_id: string;
  parent_target_id?: string | null;
  version_number: number;
  target_period_type: "year" | "half_year" | "quarter" | "month" | "day";
  period_label: string;
  period_start_date: string;
  period_end_date: string;
  target_quantity: number | string;
  unit_id: string;
  target_quantity_base: number | string;
  status: "draft" | "published" | "superseded";
  revision_reason?: string | null;
  created_by?: string | null;
  unit?: GoldMeasurementUnit;
  children?: CompanyProductionTarget[];
  created_at?: string;
}

export interface CompanyProductionAssignment {
  assignment_id: string;
  company_id: string;
  production_item_id: string;
  reporting_frequency_id: string;
  target_allocation_depth: "annual" | "semi_annual" | "quarterly" | "monthly" | "daily";
  default_reporting_unit_id?: string | null;
  effective_from: string;
  effective_to?: string | null;
  requires_review: boolean;
  is_active: boolean;
  notes?: string | null;
  company?: {
    company_id: string;
    name: string;
    code: string;
  };
  productionItem?: ProductionItem;
  reportingFrequency?: ProductionReportingFrequency;
  defaultReportingUnit?: GoldMeasurementUnit;
  targets?: CompanyProductionTarget[];
  created_at?: string;
}

export interface CompanyProductionReport {
  report_id: string;
  company_id: string;
  assignment_id: string;
  production_item_id: string;
  report_date: string;
  period_label?: string | null;
  quantity_reported: number | string;
  reported_unit_id: string;
  normalized_quantity: number | string;
  status: "draft" | "submitted" | "approved" | "rejected";
  notes?: string | null;
  submitted_by?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_comments?: string | null;
  company?: {
    company_id: string;
    name: string;
    code: string;
  };
  productionItem?: ProductionItem;
  reportedUnit?: GoldMeasurementUnit;
  submittedByUser?: {
    user_id: string;
    full_name: string;
    email: string;
  };
  reviewedByUser?: {
    user_id: string;
    full_name: string;
    email: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ProductionPerformance {
  has_assignment: boolean;
  assignment_id?: string;
  company_id?: string;
  production_item?: {
    production_item_id: string;
    name: string;
    code: string;
    base_unit?: GoldMeasurementUnit;
  };
  period: {
    period_type: string;
    period_label: string;
    start_date: string;
    end_date: string;
  };
  display_unit?: {
    unit_id: string;
    name: string;
    code: string;
    symbol: string;
  };
  has_target: boolean;
  target_quantity: number | null;
  actual_quantity: number;
  remaining_quantity: number | null;
  achievement_percentage: number | null;
  is_overachieved: boolean;
  projected_estimate?: {
    is_estimate: boolean;
    label?: string;
    total_period_days: number;
    elapsed_days: number;
    expected_pace_to_date: number;
    pace_achievement_percentage: number | null;
    projected_period_end_actual: number;
  } | null;
  reporting_compliance?: {
    frequency: string;
    expected_reports: number;
    submitted_reports: number;
    missing_reports: number;
    compliance_rate: number;
  };
  report_count: number;
  target_version?: number | null;
}

export interface FederalProductionDashboard {
  kpis: {
    active_assignments: number;
    reporting_companies: number;
    active_production_items: number;
  };
  assignments: Array<{
    assignment_id: string;
    company: {
      company_id: string;
      name: string;
      code: string;
    };
    production_item: ProductionItem;
    reporting_frequency: ProductionReportingFrequency;
    target_allocation_depth: string;
    performance: ProductionPerformance;
  }>;
  recent_reports: CompanyProductionReport[];
}

export interface CompanyProductionDashboard {
  company_id: string;
  active_assignments_count: number;
  performances: Array<{
    assignment: CompanyProductionAssignment;
    performance: ProductionPerformance;
  }>;
  recent_reports: CompanyProductionReport[];
}
