export interface PerformanceColorThreshold {
  performance_color_threshold_id: string;
  label: string;
  min_percentage: number;
  max_percentage: number;
  color_hex: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePerformanceColorThresholdPayload {
  label: string;
  min_percentage: number;
  max_percentage: number;
  color_hex: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdatePerformanceColorThresholdPayload {
  label?: string;
  min_percentage?: number;
  max_percentage?: number;
  color_hex?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface GetPerformanceColorThresholdsQueryParams {
  is_active?: boolean;
}

export interface ResolvedPerformanceColor {
  percentage: number;
  threshold: PerformanceColorThreshold | null;
  color_hex: string;
  label: string;
}
