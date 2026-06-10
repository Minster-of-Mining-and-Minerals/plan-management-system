export interface TargetUnit {
  id: string;
  label: string;
  symbol: string;
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
  updated_at?: string;
}

export type UpdatePlanningConfigurationPayload = Partial<
  Omit<PlanningConfiguration, "planning_configuration_id" | "updated_at">
>;

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
  const match = list.find((u) => u.id === unitId);
  return match?.symbol || match?.label || unitId;
}

export function resolveTargetUnitLabel(
  units: TargetUnit[] | undefined,
  unitId?: string | null
): string {
  if (!unitId) return "";
  const list = units?.length ? units : DEFAULT_TARGET_UNITS;
  return list.find((u) => u.id === unitId)?.label || unitId;
}
