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
  department_allocations?: Array<{
    company_structure_id: string;
    target_quantity: number | string;
    name?: string;
    level?: number;
  }>;
  children?: TargetPeriodNode[];
}

export interface CompanyProductionTarget {
  target_id: string;
  assignment_id: string;
  parent_target_id?: string | null;
  company_structure_id?: string | null;
  version_number: number;
  target_period_type: "year" | "half_year" | "quarter" | "month" | "day";
  period_label: string;
  period_start_date: string;
  period_end_date: string;
  target_quantity: number | string;
  unit_id: string;
  target_quantity_base: number | string;
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "revision_requested"
    | "approved"
    | "rejected"
    | "published"
    | "superseded";
  submission_notes?: string | null;
  review_comments?: string | null;
  revision_reason?: string | null;
  created_by?: string | null;
  submitted_by?: { user_id: string; full_name: string; email: string } | string | null;
  submitted_at?: string | null;
  reviewed_by?: { user_id: string; full_name: string; email: string } | string | null;
  reviewed_at?: string | null;
  unit?: GoldMeasurementUnit;
  department?: { company_structure_id: string; name: string; level: number };
  department_allocations?: CompanyProductionTarget[];
  children?: CompanyProductionTarget[];
  created_at?: string;
}

export interface CompanyProductionTargetApprovalHistory {
  history_id: string;
  assignment_id: string;
  version_number: number;
  action: "submitted" | "under_review" | "revision_requested" | "approved" | "rejected";
  previous_status?: string | null;
  new_status: string;
  comments?: string | null;
  actor?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
  created_at: string;
}

export interface CompanyProductionReportingAssignment {
  assignment_responsibility_id: string;
  assignment_id: string;
  company_id: string;
  company_structure_id?: string | null;
  user_id?: string | null;
  role_id?: string | null;
  target_version_number?: number | null;
  is_active: boolean;
  notes?: string | null;
  department?: {
    company_structure_id: string;
    name: string;
    level: number;
  } | null;
  user?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
  role?: {
    role_id: string;
    name: string;
  } | null;
  created_at?: string;
}

export interface CompanyProductionAssignment {
  assignment_id: string;
  company_id: string;
  license_id?: string | null;
  production_item_id: string;
  reporting_frequency_id: string;
  target_allocation_depth: "annual" | "semi_annual" | "quarterly" | "monthly" | "daily";
  default_reporting_unit_id?: string | null;
  effective_from: string;
  effective_to?: string | null;
  requires_review: boolean;
  allow_past_reporting?: boolean;
  past_reporting_duration?: number | null;
  past_reporting_unit?: "days" | "months" | "quarters" | "semi_annual" | "years" | string | null;
  is_active: boolean;
  notes?: string | null;
  company?: {
    company_id: string;
    name: string;
    code: string;
  };
  license?: {
    license_id: string;
    license_number: string;
    license_name?: string | null;
    mineral_type?: string | null;
    region?: string | null;
    zone?: string | null;
    woreda?: string | null;
    location_details?: string | null;
    status: string;
    issued_date?: string | null;
    effective_start_date?: string | null;
    effective_end_date?: string | null;
    effective_year_from?: number | null;
    effective_year_to?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    boundary_geojson?: any;
    spatial_reference?: string | null;
    licenseType?: {
      name: string;
      code?: string;
    };
  } | null;
  productionItem?: ProductionItem;
  reportingFrequency?: ProductionReportingFrequency;
  defaultReportingUnit?: GoldMeasurementUnit;
  targets?: CompanyProductionTarget[];
  responsibilities?: CompanyProductionReportingAssignment[];
  approvalHistories?: CompanyProductionTargetApprovalHistory[];
  created_at?: string;
}

export interface CompanyProductionReport {
  report_id: string;
  company_id: string;
  assignment_id: string;
  license_id?: string | null;
  production_item_id: string;
  company_structure_id?: string | null;
  approved_target_version?: number | null;
  target_period_id?: string | null;
  reporting_frequency?: string | null;
  reporting_period_key?: string | null;
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
  license?: {
    license_id: string;
    license_number: string;
    license_name?: string | null;
    mineral_type?: string | null;
    region?: string | null;
    zone?: string | null;
    woreda?: string | null;
    status: string;
    effective_start_date?: string | null;
    effective_end_date?: string | null;
    licenseType?: {
      name: string;
      code?: string;
    };
  } | null;
  productionItem?: ProductionItem;
  reportedUnit?: GoldMeasurementUnit;
  department?: {
    company_structure_id: string;
    name: string;
    level: number;
  } | null;
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

export interface ProductionDetailBundle {
  assignment: CompanyProductionAssignment;
  approvedTarget?: CompanyProductionTarget | null;
  latestTarget?: CompanyProductionTarget | null;
  targetProposal?: {
    version_number: number;
    status: string;
    root: CompanyProductionTarget;
    annual_target: number;
    unit: GoldMeasurementUnit;
    submission_notes?: string | null;
    review_comments?: string | null;
    submitted_at?: string | null;
    submitted_by?: any;
    submitter?: any;
    reviewed_at?: string | null;
    reviewed_by?: any;
    reviewer?: any;
    periods: Array<CompanyProductionTarget & { department_allocations?: CompanyProductionTarget[] }>;
    all_targets: CompanyProductionTarget[];
  } | null;
  approvedTargetsTree?: any;
  approvalHistory: CompanyProductionTargetApprovalHistory[];
  responsibilities: CompanyProductionReportingAssignment[];
  licenseEligible: boolean;
  licenseIneligibilityReason?: string | null;
  isReportingUnlocked: boolean;
  recentReports: CompanyProductionReport[];
  allAmendments?: CompanyProductionTargetAmendment[];
  pendingAmendment?: CompanyProductionTargetAmendment | null;
  latestAmendment?: CompanyProductionTargetAmendment | null;
  amendmentComparison?: TargetAmendmentComparison | null;
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


export interface CompanyProductionTargetAmendment {
  amendment_id: string;
  assignment_id: string;
  amendment_reference: string;
  current_approved_version: number;
  proposed_version_number: number;
  current_annual_target: number | string;
  proposed_annual_target: number | string;
  amendment_reason: string;
  submission_notes?: string | null;
  review_comments?: string | null;
  effective_date?: string | null;
  status:
    | "amendment_draft"
    | "amendment_submitted"
    | "amendment_under_review"
    | "amendment_approved"
    | "amendment_rejected"
    | "amendment_revision_requested";
  submitted_by?: string | null;
  submitted_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  activated_at?: string | null;
  submitter?: {
    user_id: string;
    full_name: string;
    email: string;
  };
  reviewer?: {
    user_id: string;
    full_name: string;
    email: string;
  };
  assignment?: CompanyProductionAssignment;
  created_at?: string;
  updated_at?: string;
}

export interface PeriodComparisonItem {
  period_label: string;
  period_start_date: string;
  period_end_date: string;
  approved_quantity: number;
  proposed_quantity: number;
  difference: number;
  percentage_change: number;
  department_comparisons?: Array<{
    department_id?: string;
    department_name: string;
    approved_quantity: number;
    proposed_quantity: number;
    difference: number;
    percentage_change: number;
  }>;
}

export interface TargetAmendmentComparison {
  amendment: CompanyProductionTargetAmendment;
  assignment: CompanyProductionAssignment;
  approvedProposal?: any;
  proposedProposal?: any;
  annualComparison: {
    approved_annual: number;
    proposed_annual: number;
    difference: number;
    percentage_change: number;
  };
  periodComparisons: PeriodComparisonItem[];
}

export type ReportingPeriodClassification =
  | "CURRENT"
  | "AVAILABLE"
  | "AVAILABLE_PAST"
  | "COMPLETED"
  | "SUBMITTED"
  | "PENDING_APPROVAL"
  | "REJECTED"
  | "LOCKED_PAST"
  | "LOCKED_FUTURE"
  | "OUTSIDE_LICENSE_PERIOD"
  | "NO_APPROVED_TARGET"
  | "INACTIVE_ASSIGNMENT";

export interface ReportingHierarchyNode {
  id: string;
  level: "annual" | "half_year" | "quarter" | "month";
  label: string;
  periodCode?: string;
  monthKey?: string;
  startDate: string;
  endDate: string;
  targetQuantity: number;
  actualQuantity: number;
  remainingTarget?: number;
  achievementPct?: number;
  unitSymbol: string;
  targetPeriodId?: string | null;
  isReportingLevel?: boolean;
  requiresDailyMatrix?: boolean;
  classification: {
    status: ReportingPeriodClassification;
    isAccessible: boolean;
    reason?: string;
  };
  children: ReportingHierarchyNode[];
}

export interface TargetAlignedReportingHierarchyResponse {
  assignment: {
    assignment_id: string;
    company_id: string;
    license_id?: string | null;
    production_item_name?: string;
    license_number?: string;
    target_allocation_depth: string;
    reporting_frequency: string;
    unit_symbol: string;
    unit_name: string;
    allow_past_reporting?: boolean;
    past_reporting_duration?: number | null;
    past_reporting_unit?: string | null;
  };
  today: string;
  allowanceWindow: {
    allowPast: boolean;
    duration?: number;
    unit?: string;
    earliestAllowedDate?: string;
    explanation?: string;
  };
  approvedTargetVersion: number | null;
  hierarchy: ReportingHierarchyNode;
}

export interface DailyReportingMatrixDay {
  isPadding: boolean;
  dayNumber: number | null;
  date: string | null;
  isToday?: boolean;
  classification?: ReportingPeriodClassification;
  isAccessible?: boolean;
  reason?: string;
  report?: {
    report_id: string;
    quantity_reported: number;
    unit_symbol: string;
    status: string;
    notes?: string | null;
    submitted_by_name?: string;
    created_at?: string;
  } | null;
}

export interface DailyReportingMatrixWeek {
  weekNumber: number;
  days: DailyReportingMatrixDay[];
  weekActualTotal: number;
  reportedCount: number;
  availableCount: number;
  lockedCount: number;
}

export interface DailyReportingMatrixResponse {
  assignmentId: string;
  month: string;
  monthName: string;
  today: string;
  allowanceWindow: {
    allowPast: boolean;
    duration?: number;
    unit?: string;
    earliestAllowedDate?: string;
    explanation?: string;
  };
  unitSymbol: string;
  monthReportedTotal: number;
  weeks: DailyReportingMatrixWeek[];
}
