export interface NationalReportingRequirement {
  requirement_id: string;
  code: string;
  title: string;
  description?: string | null;
  category: string;
  expected_unit: string;
  unit_category: string;
  frequency: string;
  requires_numeric: boolean;
  requires_narrative: boolean;
  requires_evidence: boolean;
  validation_rules?: Record<string, any> | null;
  effective_start_date?: string | null;
  effective_end_date?: string | null;
  submission_deadline_days?: number | null;
  is_active: boolean;
  version_number: number;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  assignedRegionsCount?: number;
  assignments?: NationalReportingAssignment[];
  periods?: ReportingPeriod[];
  creator?: {
    user_id: string;
    full_name: string;
    email: string;
  } | null;
}

export interface ReportingPeriod {
  period_index: number;
  period_label: string;
  start_date: string;
  end_date: string;
  name?: string;
  period_name?: string;
  planning_year?: number | null;
  status?: "unmapped" | "potential" | "confirmed" | "ready_to_publish" | "published" | "clarification_requested" | "unreported" | string;
  submission_status?: string | null;
  planned_target?: number | null;
  reported_actual?: number | null;
  local_unit?: string | null;
  standardized_target?: number | null;
  standardized_actual?: number | null;
  standardized_unit?: string | null;
  achievement_rate?: number | null;
  achievement_percent?: number | null;
  publication_reference?: string | null;
  published_record_id?: string | null;
  published_at?: string | null;
  reporting_method_used?: "node_mapping" | "form_based" | string | null;
  submission_method?: "node_mapping" | "form_based" | string | null;
  narrative?: string | null;
  is_locked?: boolean;
  lock_state?: "open" | "upcoming" | "closed_deadline_passed" | "unlocked_override" | "manually_locked" | string;
  lock_reason?: string | null;
  deadline_date?: string | null;
  is_manually_unlocked?: boolean;
  lock_override?: {
    is_unlocked: boolean;
    reason?: string | null;
    unlocked_until?: string | null;
    unlocked_by?: string | null;
    unlocked_at?: string | null;
  } | null;
}

export interface NationalReportingAssignment {
  assignment_id: string;
  requirement_id: string;
  region_id: string;
  is_mandatory: boolean;
  effective_start_date?: string | null;
  effective_end_date?: string | null;
  frequency_override?: string | null;
  status: "active" | "suspended" | "withdrawn";
  notes?: string | null;
  lock_overrides?: Record<string, {
    is_unlocked: boolean;
    reason?: string | null;
    unlocked_until?: string | null;
    unlocked_by?: string | null;
    unlocked_at?: string | null;
  }> | null;
  assigned_by?: string | null;
  assigned_at: string;
  requirement?: NationalReportingRequirement;
  region?: {
    region_id: string;
    name: string;
    code: string;
    form_reporting_active?: boolean;
    national_reporting_method?: string;
  };
  mappings?: RegionalRequirementMapping[];
  publishedRecords?: NationalPublishedRecord[];
  workflowStatus?: "unmapped" | "potential" | "confirmed" | "ready_to_publish" | "published" | "partially_published";
  activeMapping?: RegionalRequirementMapping | null;
  isValidated?: boolean;
  latestPublishedRecord?: NationalPublishedRecord | null;
  recurringPeriods?: ReportingPeriod[];
  annualRange?: {
    startDate: string;
    endDate: string;
    frequency: string;
  };
  isFormReportingActive?: boolean;
  nodeMappingAvailable?: boolean;
}

export interface SubmissionVersionItem extends NationalPublishedRecord {
  is_latest: boolean;
  version_label: string;
  diff?: {
    previous_version: string;
    target_diff?: number | null;
    actual_diff?: number | null;
    achievement_diff?: number | null;
    narrative_changed?: boolean;
  } | null;
}

export interface SubmissionVersionHistoryResponse {
  requirement_id: string;
  region_id: string;
  reporting_year?: number | null;
  reporting_period_label?: string | null;
  total_versions: number;
  versions: SubmissionVersionItem[];
}

export interface RegionalRequirementMapping {
  mapping_id: string;
  assignment_id: string;
  region_id: string;
  regional_plan_version_id?: string | null;
  regional_plan_node_id: string;
  stage: "potential" | "confirmed" | "archived";
  local_unit: string;
  unit_conversion_factor: number;
  contribution_ratio: number;
  confirmed_period_version_id?: string | null;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  notes?: string | null;
  planNode?: {
    regional_plan_node_id: string;
    title: string;
    target_unit?: string | null;
    period_target?: number | null;
    period_actual?: number | null;
    period_actual_status?: string | null;
    annual_target?: number | null;
    annual_actual?: number | null;
    annual_actual_status?: string | null;
    narration?: string | null;
  };
  planVersion?: {
    regional_plan_version_id: string;
    draft_name: string;
    version_kind: string;
    planning_year?: number;
  };
  confirmedPeriodVersion?: {
    regional_plan_version_id: string;
    draft_name: string;
    period_label?: string;
    planning_year?: number;
    sequence_index?: number;
  };
}

export interface NationalPublishedRecord {
  published_record_id: string;
  publication_reference: string;
  requirement_id: string;
  assignment_id: string;
  mapping_id?: string | null;
  region_id: string;
  regional_plan_node_id?: string | null;
  regional_plan_version_id?: string | null;
  submission_method?: "node_mapping" | "form_based";
  reporting_year: number;
  reporting_period_label: string;
  reporting_period_id?: string | null;
  planned_target?: number | null;
  reported_actual?: number | null;
  local_unit: string;
  standardized_target?: number | null;
  standardized_actual?: number | null;
  standardized_unit: string;
  achievement_percent?: number | null;
  narrative?: string | null;
  evidence_attachments?: any[];
  regional_validated_by?: string | null;
  regional_validated_at?: string | null;
  published_by?: string | null;
  published_at: string;
  revision_number: number;
  superseded_by_id?: string | null;
  hash_sha256?: string | null;
  status: "published" | "superseded" | "clarification_requested";
  clarification_notes?: string | null;
  snapshot_data: {
    publicationReference: string;
    publicationTimestamp: string;
    requirement: {
      id: string;
      code: string;
      title: string;
      category: string;
      expectedUnit: string;
      frequency: string;
    };
    region: {
      id: string;
      name: string;
      code: string;
    };
    planContext?: {
      planDraftName?: string;
      reportingYear?: number;
      periodLabel?: string;
    };
    nodeProvenance?: {
      title?: string;
      localUnit?: string;
    };
    measurements?: {
      plannedTarget?: number | null;
      reportedActual?: number | null;
      localUnit?: string;
      standardizedTarget?: number | null;
      standardizedActual?: number | null;
      standardizedUnit?: string;
      achievementPercent?: number | null;
    };
    regionalValidation?: {
      validatedAt?: string | null;
      validatedBy?: {
        name?: string;
        email?: string;
      } | null;
    };
    narrative?: string | null;
    evidenceAttachments?: any[];
  };
  requirement?: NationalReportingRequirement;
  region?: {
    region_id: string;
    name: string;
    code: string;
  };
  publishedByUser?: {
    user_id: string;
    full_name: string;
    email: string;
  };
  validatedByUser?: {
    user_id: string;
    full_name: string;
    email: string;
  };
}

export interface NationalDashboardSummary {
  filters: {
    reporting_year: number;
    reporting_period_label?: string | null;
    region_id?: string | null;
  };
  kpis: {
    totalRequirementsCount: number;
    totalAssignmentsCount: number;
    totalAssignedRegionsCount: number;
    mappedAssignmentsCount: number;
    confirmedAssignmentsCount: number;
    totalPublishedSubmissions: number;
    missingSubmissionsCount: number;
    overallNationalComplianceRate: number;
    openWindowsCount?: number;
    lockedWindowsCount?: number;
    overriddenWindowsCount?: number;
    totalWindowsCount?: number;
  };
  categoryBreakdown?: Array<{
    category: string;
    assignmentsCount: number;
    publishedCount: number;
    complianceRate: number;
  }>;
  regionalCompliance: Array<{
    regionId: string;
    regionName: string;
    regionCode: string;
    assignedRequirementsCount: number;
    publishedSubmissionsCount: number;
    missingSubmissionsCount: number;
    complianceRate: number;
    status: "complete" | "partial" | "pending";
  }>;
  requirementSummaries: Array<{
    requirementId: string;
    code: string;
    title: string;
    category: string;
    expectedUnit: string;
    frequency: string;
    assignedRegionsCount: number;
    submittedRegionsCount: number;
    isCompleteData: boolean;
    dataCompletenessPercent: number;
    nationalTotalTarget?: number | null;
    nationalTotalActual?: number | null;
    achievementRate?: number | null;
    submissions: Array<{
      publishedRecordId: string;
      regionName: string;
      localUnit: string;
      reportedActual?: number | null;
      standardizedActual?: number | null;
      achievementPercent?: number | null;
      publishedAt: string;
    }>;
  }>;
}

export type UnitsCatalog = Record<
  string,
  {
    base: string;
    units: string[];
  }
>;

export interface RegionNationalReportingConfig {
  region_id: string;
  name: string;
  code: string;
  node_mapping_available: boolean;
  form_reporting_active: boolean;
  form_reporting_start_date?: string | null;
  form_reporting_end_date?: string | null;
  form_reporting_notes?: string | null;
  is_form_reporting_effective: boolean;
  national_reporting_method?: string;
  effective_method?: string;
}

export interface DirectFormSubmissionPayload {
  requirementId?: string;
  assignmentId?: string;
  reportingYear: number;
  reportingPeriodLabel: string;
  plannedTarget?: number | null;
  reportedActual?: number | null;
  localUnit?: string | null;
  narrative?: string | null;
  evidenceAttachments?: any[];
}

export interface TogglePeriodLockPayload {
  assignmentId: string;
  periodLabel: string;
  isUnlocked: boolean;
  reason?: string;
  unlockedUntil?: string | null;
}

