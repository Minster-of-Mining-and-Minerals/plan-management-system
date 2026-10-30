export interface TargetUnit {
  id: string;
  label: string;
  symbol: string;
}

export type BreakdownMode = "quarterly" | "semi_annual" | "monthly" | "custom";

export interface CustomPeriod {
  label: string;
}

export interface PlanningConfigurationMeta {
  scope: "global" | "sector" | "draft";
  government_structure_id?: string | null;
  is_using_default: boolean;
  has_sector_override: boolean;
  owned_by_plan_version_id?: string | null;
  source_planning_configuration_id?: string | null;
}

export interface PlanningConfiguration {
  planning_configuration_id: string;
  government_structure_id?: string | null;
  min_duration_years: number;
  max_duration_years: number;
  draft_entity_label_singular: string;
  draft_entity_label_plural: string;
  create_action_label: string;
  planning_period_label: string;
  duration_label: string;
  start_year_label: string;
  end_year_label: string;
  target_units: TargetUnit[];
  breakdown_mode: BreakdownMode;
  custom_periods: CustomPeriod[];
  updated_at?: string;
  meta?: PlanningConfigurationMeta;
}

export type PlanningConfigurationQuery = {
  government_structure_id?: string;
};

export type UpdatePlanningConfigurationPayload = Partial<
  Omit<PlanningConfiguration, "planning_configuration_id" | "updated_at" | "meta">
> & {
  government_structure_id?: string | null;
};

export type RestorePlanningConfigurationPayload = {
  government_structure_id?: string | null;
};

/** Sentinel value for optional unit selection in forms (stored as null in the API). */
export const TARGET_UNIT_NONE_VALUE = "__none__";

export const DEFAULT_TARGET_UNITS: TargetUnit[] = [
  { id: "person", label: "Person", symbol: "persons" },
  { id: "km", label: "Kilometer", symbol: "km" },
  { id: "birr", label: "Birr", symbol: "ETB" },
  { id: "ton", label: "Ton", symbol: "t" },
  { id: "unit", label: "Unit", symbol: "units" },
];

export const DEFAULT_PLANNING_CONFIGURATION: PlanningConfiguration = {
  planning_configuration_id: "90000000-0000-4000-8000-000000000001",
  min_duration_years: 1,
  max_duration_years: 10,
  draft_entity_label_singular: "Plan Draft",
  draft_entity_label_plural: "Plan Drafts",
  create_action_label: "Create Plan Draft",
  planning_period_label: "Planning Period",
  duration_label: "Duration",
  start_year_label: "Start Date",
  end_year_label: "End Date",
  target_units: DEFAULT_TARGET_UNITS,
  breakdown_mode: "quarterly",
  custom_periods: [],
};

export function slugifyTargetUnitId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function resolveTargetUnitSymbol(
  units: TargetUnit[] | undefined,
  unitId?: string | null
): string {
  if (!unitId) return "";
  const list = units?.length ? units : DEFAULT_TARGET_UNITS;
  const query = unitId.toLowerCase().trim();
  const match = list.find(
    (u) =>
      u.id?.toLowerCase() === query ||
      u.label?.toLowerCase() === query ||
      u.symbol?.toLowerCase() === query
  );
  return match?.symbol || match?.label || unitId;
}

export function resolveTargetUnitLabel(
  units: TargetUnit[] | undefined,
  unitId?: string | null
): string {
  if (!unitId) return "";
  const list = units?.length ? units : DEFAULT_TARGET_UNITS;
  const query = unitId.toLowerCase().trim();
  const match = list.find(
    (u) =>
      u.id?.toLowerCase() === query ||
      u.label?.toLowerCase() === query ||
      u.symbol?.toLowerCase() === query
  );
  return match?.label || match?.symbol || unitId;
}
