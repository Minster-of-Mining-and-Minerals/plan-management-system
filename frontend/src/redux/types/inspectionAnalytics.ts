export type InspectionLicenseType = "all" | "mining" | "exploration";
export type InspectionInterval = "day" | "week" | "month";
export type InspectionStatusType = "submitted" | "in_progress" | "todo" | "overdue" | string;

export interface InspectionSummary {
  total_inspections: number;
  completed_inspections: number;
  in_progress_inspections: number;
  pending_inspections: number;
  overdue_inspections: number;
  open_inspections: number;
  on_time_submissions: number;
  late_submissions: number;
  returned_inspections: number;
  companies_inspected: number;
  licenses_inspected: number;
  average_score: number | null;
  completion_rate: number;
  on_time_rate: number;
  overdue_rate: number;
}

export interface InspectionStatusItem {
  status: InspectionStatusType;
  label: string;
  count: number;
  percentage: number;
}

export interface InspectionCategoryItem {
  category: "mining" | "exploration" | string;
  label: string;
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  overdue: number;
  completion_rate: number;
}

export interface InspectionRegionItem {
  region_id: string;
  region_name: string;
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  overdue: number;
  completion_rate: number;
}

export interface InspectionTeamItem {
  team_id: string;
  team_name: string;
  team_code?: string;
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  overdue: number;
  completion_rate: number;
}

export interface InspectionTrendItem {
  period: string;
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  overdue: number;
  completion_rate: number;
}

export interface InspectionMetadata {
  api_version: string;
  generated_at: string;
  timezone: string;
  data_freshness: "live" | "cached" | "stale_fallback";
  is_stale: boolean;
  cached_at: string | null;
  stale_reason?: string | null;
  execution_time_ms: number;
}

export interface InspectionAnalyticsData {
  reporting_period: {
    from: string | null;
    to: string | null;
  };
  filters: {
    license_type: InspectionLicenseType;
    region_id: string | null;
    team_id: string | null;
    interval: InspectionInterval;
  };
  summary: InspectionSummary;
  by_status: InspectionStatusItem[];
  by_category: InspectionCategoryItem[];
  by_region: InspectionRegionItem[];
  by_team: InspectionTeamItem[];
  trends: InspectionTrendItem[];
  metadata: InspectionMetadata;
}

export interface InspectionAnalyticsParams {
  from?: string;
  to?: string;
  license_type?: InspectionLicenseType;
  region_id?: string;
  team_id?: string;
  interval?: InspectionInterval;
}

export interface InspectionAnalyticsResponse {
  success: boolean;
  data: InspectionAnalyticsData;
  code?: string;
  message?: string;
}

