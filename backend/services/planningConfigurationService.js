"use strict";

const { v4: uuidv4 } = require("uuid");
const { PlanningConfiguration } = require("../models");

const DEFAULT_PLANNING_CONFIG_ID = "90000000-0000-4000-8000-000000000001";

const DEFAULT_PLANNING_CONFIG = {
  planning_configuration_id: DEFAULT_PLANNING_CONFIG_ID,
  government_structure_id: null,
  min_duration_years: 1,
  max_duration_years: 10,
  draft_entity_label_singular: "Plan Draft",
  draft_entity_label_plural: "Plan Drafts",
  create_action_label: "Create Plan Draft",
  planning_period_label: "Planning Period",
  duration_label: "Duration",
  start_year_label: "Start Date",
  end_year_label: "End Date",
  target_units: [
    { id: "person", label: "Person", symbol: "persons" },
    { id: "km", label: "Kilometer", symbol: "km" },
    { id: "birr", label: "Birr", symbol: "ETB" },
    { id: "ton", label: "Ton", symbol: "t" },
    { id: "unit", label: "Unit", symbol: "units" },
  ],
  breakdown_mode: "quarterly",
  custom_periods: [],
};

const QUARTERLY_PERIOD_LABELS = ["Q1", "Q2", "Q3", "Q4"];
const SEMI_ANNUAL_PERIOD_LABELS = ["H1", "H2"];

function normalizeCustomPeriods(periods) {
  if (!Array.isArray(periods)) {
    return { valid: false, message: "Custom periods must be an array." };
  }

  if (periods.length < 1) {
    return { valid: false, message: "At least one custom period is required." };
  }

  if (periods.length > 12) {
    return { valid: false, message: "Custom periods cannot exceed 12 entries." };
  }

  const normalized = [];
  const seen = new Set();

  for (const entry of periods) {
    const label = String(entry?.label || "").trim();
    if (!label) {
      return { valid: false, message: "Each custom period must have a label." };
    }
    const key = label.toLowerCase();
    if (seen.has(key)) {
      return { valid: false, message: `Duplicate custom period label: ${label}` };
    }
    seen.add(key);
    normalized.push({ label });
  }

  return { valid: true, periods: normalized };
}

function resolvePeriodLabels(config) {
  const mode = config?.breakdown_mode ?? DEFAULT_PLANNING_CONFIG.breakdown_mode;
  return resolvePeriodLabelsForMode(mode, config?.custom_periods ?? []);
}

function resolvePeriodLabelsForMode(mode, customPeriods = []) {
  if (mode === "semi_annual") {
    return [...SEMI_ANNUAL_PERIOD_LABELS];
  }
  if (mode === "custom") {
    const normalized = normalizeCustomPeriods(customPeriods);
    if (!normalized.valid) {
      return [];
    }
    return normalized.periods.map((p) => p.label);
  }
  return [...QUARTERLY_PERIOD_LABELS];
}

function validateBreakdownConfiguration(breakdownMode, customPeriods) {
  if (!["quarterly", "semi_annual", "custom"].includes(breakdownMode)) {
    return { valid: false, message: "Invalid breakdown mode." };
  }
  if (breakdownMode === "custom") {
    return normalizeCustomPeriods(customPeriods);
  }
  return { valid: true, periods: [] };
}

function slugifyUnitId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeTargetUnits(units) {
  if (!Array.isArray(units)) {
    return { valid: false, message: "Target units must be an array." };
  }

  if (units.length === 0) {
    return { valid: false, message: "At least one target unit is required." };
  }

  const normalized = [];
  const seen = new Set();

  for (const entry of units) {
    const label = String(entry?.label || "").trim();
    const id = slugifyUnitId(entry?.id || label);
    const symbol = String(entry?.symbol || label).trim();

    if (!label || !id) {
      return { valid: false, message: "Each target unit must have a label." };
    }

    if (seen.has(id)) {
      return { valid: false, message: `Duplicate target unit id: ${id}` };
    }

    seen.add(id);
    normalized.push({ id, label, symbol: symbol || label });
  }

  return { valid: true, units: normalized };
}

function resolveTargetUnitLabel(units, unitId) {
  if (!unitId) return "";
  const list = Array.isArray(units) ? units : DEFAULT_PLANNING_CONFIG.target_units;
  const match = list.find((u) => u.id === unitId);
  return match?.symbol || match?.label || unitId;
}

function isKnownTargetUnit(units, unitId) {
  if (!unitId) return false;
  const list = Array.isArray(units) ? units : DEFAULT_PLANNING_CONFIG.target_units;
  return list.some((u) => u.id === unitId);
}

function resolveNodeTargetUnit({ weightMode, targetUnit, parent, isSelectionLevel }) {
  if (weightMode !== "number") {
    return { valid: true, targetUnit: null };
  }

  const effectiveUnit = isSelectionLevel ? targetUnit : parent?.target_unit ?? targetUnit ?? null;

  return { valid: true, targetUnit: effectiveUnit ?? null };
}

function validateNodeTargetUnit({ weightMode, targetUnit, weight, requiresWeight, parent, isSelectionLevel, configUnits }) {
  if (!requiresWeight || !weight || weight <= 0) {
    return { valid: true, targetUnit: weightMode === "number" ? null : null };
  }

  if (weightMode !== "number") {
    return { valid: true, targetUnit: null };
  }

  const resolved = resolveNodeTargetUnit({
    weightMode,
    targetUnit,
    parent,
    isSelectionLevel,
  });

  if (!resolved.valid) {
    return resolved;
  }

  if (resolved.targetUnit && !isKnownTargetUnit(configUnits, resolved.targetUnit)) {
    return { valid: false, message: "Selected target unit is not configured." };
  }

  return resolved;
}

function pickPlanningConfigPayload(record) {
  const plain = record.get ? record.get({ plain: true }) : record;
  return {
    planning_configuration_id: plain.planning_configuration_id,
    government_structure_id: plain.government_structure_id,
    min_duration_years: plain.min_duration_years,
    max_duration_years: plain.max_duration_years,
    draft_entity_label_singular: plain.draft_entity_label_singular,
    draft_entity_label_plural: plain.draft_entity_label_plural,
    create_action_label: plain.create_action_label,
    planning_period_label: plain.planning_period_label,
    duration_label: plain.duration_label,
    start_year_label: plain.start_year_label,
    end_year_label: plain.end_year_label,
    target_units: plain.target_units ?? DEFAULT_PLANNING_CONFIG.target_units,
    breakdown_mode: plain.breakdown_mode ?? DEFAULT_PLANNING_CONFIG.breakdown_mode,
    custom_periods: plain.custom_periods ?? DEFAULT_PLANNING_CONFIG.custom_periods,
    updated_at: plain.updated_at,
  };
}

async function getOrCreateGlobalPlanningConfig(transaction = null) {
  let record = await PlanningConfiguration.findByPk(DEFAULT_PLANNING_CONFIG_ID, {
    transaction,
  });
  if (!record) {
    const now = new Date();
    record = await PlanningConfiguration.create(
      {
        ...DEFAULT_PLANNING_CONFIG,
        created_at: now,
        updated_at: now,
      },
      { transaction }
    );
  }
  return record;
}

async function getSectorPlanningConfigRecord(governmentStructureId, transaction = null) {
  if (!governmentStructureId) return null;
  return PlanningConfiguration.findOne({
    where: { government_structure_id: governmentStructureId },
    transaction,
  });
}

async function resolveEffectivePlanningConfig(governmentStructureId, transaction = null) {
  const globalRecord = await getOrCreateGlobalPlanningConfig(transaction);
  const global = pickPlanningConfigPayload(globalRecord);

  if (!governmentStructureId) {
    return {
      effective: global,
      global,
      override: null,
      scope: "global",
      government_structure_id: null,
      is_using_default: true,
    };
  }

  const overrideRecord = await getSectorPlanningConfigRecord(
    governmentStructureId,
    transaction
  );

  if (overrideRecord) {
    const override = pickPlanningConfigPayload(overrideRecord);
    return {
      effective: override,
      global,
      override,
      scope: "sector",
      government_structure_id: governmentStructureId,
      is_using_default: false,
    };
  }

  return {
    effective: { ...global, government_structure_id: governmentStructureId },
    global,
    override: null,
    scope: "global",
    government_structure_id: governmentStructureId,
    is_using_default: true,
  };
}

function buildPlanningConfigResponse(resolved) {
  const effective = resolved.effective || DEFAULT_PLANNING_CONFIG;
  return {
    ...effective,
    meta: {
      scope: resolved.scope,
      government_structure_id: resolved.government_structure_id ?? null,
      is_using_default: Boolean(resolved.is_using_default),
      has_sector_override: Boolean(resolved.override),
    },
  };
}

async function applyPlanningConfigUpdates(record, body, transaction = null) {
  const nextMin = body.min_duration_years ?? record.min_duration_years;
  const nextMax = body.max_duration_years ?? record.max_duration_years;

  if (nextMin > nextMax) {
    const error = new Error("Minimum duration cannot exceed maximum duration.");
    error.status = 400;
    throw error;
  }

  let nextTargetUnits = record.target_units ?? DEFAULT_PLANNING_CONFIG.target_units;
  if (body.target_units !== undefined) {
    const normalized = normalizeTargetUnits(body.target_units);
    if (!normalized.valid) {
      const error = new Error(normalized.message);
      error.status = 400;
      throw error;
    }
    nextTargetUnits = normalized.units;
  }

  const nextBreakdownMode =
    body.breakdown_mode ?? record.breakdown_mode ?? DEFAULT_PLANNING_CONFIG.breakdown_mode;
  let nextCustomPeriods = record.custom_periods ?? DEFAULT_PLANNING_CONFIG.custom_periods;
  if (body.breakdown_mode !== undefined || body.custom_periods !== undefined) {
    const breakdownValidation = validateBreakdownConfiguration(
      nextBreakdownMode,
      body.custom_periods ?? nextCustomPeriods
    );
    if (!breakdownValidation.valid) {
      const error = new Error(breakdownValidation.message);
      error.status = 400;
      throw error;
    }
    if (nextBreakdownMode === "custom") {
      nextCustomPeriods = breakdownValidation.periods;
    }
  }

  await record.update(
    {
      min_duration_years: nextMin,
      max_duration_years: nextMax,
      draft_entity_label_singular:
        body.draft_entity_label_singular ?? record.draft_entity_label_singular,
      draft_entity_label_plural:
        body.draft_entity_label_plural ?? record.draft_entity_label_plural,
      create_action_label: body.create_action_label ?? record.create_action_label,
      planning_period_label: body.planning_period_label ?? record.planning_period_label,
      duration_label: body.duration_label ?? record.duration_label,
      start_year_label: body.start_year_label ?? record.start_year_label,
      end_year_label: body.end_year_label ?? record.end_year_label,
      target_units: nextTargetUnits,
      breakdown_mode: nextBreakdownMode,
      custom_periods: nextCustomPeriods,
    },
    { transaction }
  );

  return record;
}

async function updateGlobalPlanningConfig(body, transaction = null) {
  const record = await getOrCreateGlobalPlanningConfig(transaction);
  await applyPlanningConfigUpdates(record, body, transaction);
  return record;
}

async function upsertSectorPlanningConfig(governmentStructureId, body, transaction = null) {
  const globalRecord = await getOrCreateGlobalPlanningConfig(transaction);
  let record = await getSectorPlanningConfigRecord(governmentStructureId, transaction);

  if (!record) {
    const now = new Date();
    const globalPlain = pickPlanningConfigPayload(globalRecord);
    record = await PlanningConfiguration.create(
      {
        planning_configuration_id: uuidv4(),
        government_structure_id: governmentStructureId,
        min_duration_years: globalPlain.min_duration_years,
        max_duration_years: globalPlain.max_duration_years,
        draft_entity_label_singular: globalPlain.draft_entity_label_singular,
        draft_entity_label_plural: globalPlain.draft_entity_label_plural,
        create_action_label: globalPlain.create_action_label,
        planning_period_label: globalPlain.planning_period_label,
        duration_label: globalPlain.duration_label,
        start_year_label: globalPlain.start_year_label,
        end_year_label: globalPlain.end_year_label,
        target_units: globalPlain.target_units,
        breakdown_mode: globalPlain.breakdown_mode,
        custom_periods: globalPlain.custom_periods,
        created_at: now,
        updated_at: now,
      },
      { transaction }
    );
  }

  await applyPlanningConfigUpdates(record, body, transaction);
  return record;
}

async function restoreGlobalPlanningConfig(transaction = null) {
  const record = await getOrCreateGlobalPlanningConfig(transaction);
  await record.update(
    {
      min_duration_years: DEFAULT_PLANNING_CONFIG.min_duration_years,
      max_duration_years: DEFAULT_PLANNING_CONFIG.max_duration_years,
      draft_entity_label_singular: DEFAULT_PLANNING_CONFIG.draft_entity_label_singular,
      draft_entity_label_plural: DEFAULT_PLANNING_CONFIG.draft_entity_label_plural,
      create_action_label: DEFAULT_PLANNING_CONFIG.create_action_label,
      planning_period_label: DEFAULT_PLANNING_CONFIG.planning_period_label,
      duration_label: DEFAULT_PLANNING_CONFIG.duration_label,
      start_year_label: DEFAULT_PLANNING_CONFIG.start_year_label,
      end_year_label: DEFAULT_PLANNING_CONFIG.end_year_label,
      target_units: DEFAULT_PLANNING_CONFIG.target_units,
      breakdown_mode: DEFAULT_PLANNING_CONFIG.breakdown_mode,
      custom_periods: DEFAULT_PLANNING_CONFIG.custom_periods,
    },
    { transaction }
  );
  return record;
}

async function restoreSectorPlanningConfig(governmentStructureId, transaction = null) {
  const record = await getSectorPlanningConfigRecord(governmentStructureId, transaction);
  if (record) {
    await record.destroy({ transaction });
  }
  return getOrCreateGlobalPlanningConfig(transaction);
}

function computeEndYear(startYear, durationYears) {
  return startYear + durationYears - 1;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function toDateOnlyString(year, month, day) {
  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }
  return { year, month, day };
}

function computePlanningPeriodEnd(startDate, durationYears) {
  const parsed = parseDateOnly(startDate);
  if (!parsed) return null;

  const endYear = parsed.year + durationYears - 1;
  const endDay = Math.min(parsed.day, daysInMonth(endYear, parsed.month));

  return {
    planning_end_date: toDateOnlyString(endYear, parsed.month, endDay),
    end_year: endYear,
    end_month: parsed.month,
    start_year: parsed.year,
    start_month: parsed.month,
  };
}

function validatePlanningStartDate(startDate) {
  const parsed = parseDateOnly(startDate);
  if (!parsed) {
    return "Planning start date must be a valid date (YYYY-MM-DD).";
  }
  if (parsed.year < 2000 || parsed.year > 2100) {
    return "Planning start year must be between 2000 and 2100.";
  }
  return null;
}

function validatePlanningDuration(durationYears, config) {
  const min = config.min_duration_years ?? 1;
  const max = config.max_duration_years ?? 10;
  if (!Number.isInteger(durationYears) || durationYears < min || durationYears > max) {
    return `Planning duration must be between ${min} and ${max} year(s).`;
  }
  return null;
}

function validateYearRange(startYear, endYear, endMonth = 12) {
  if (startYear < 2000 || startYear > 2100) {
    return "Start year must be between 2000 and 2100.";
  }
  if (endYear < startYear) {
    return "End year cannot be before start year.";
  }
  if (endYear > 2100 || (endYear === 2100 && endMonth > 12)) {
    return "Planning end date must be at most 2100.";
  }
  return null;
}

module.exports = {
  DEFAULT_PLANNING_CONFIG_ID,
  DEFAULT_PLANNING_CONFIG,
  pickPlanningConfigPayload,
  getOrCreateGlobalPlanningConfig,
  getSectorPlanningConfigRecord,
  resolveEffectivePlanningConfig,
  buildPlanningConfigResponse,
  updateGlobalPlanningConfig,
  upsertSectorPlanningConfig,
  restoreGlobalPlanningConfig,
  restoreSectorPlanningConfig,
  computeEndYear,
  computePlanningPeriodEnd,
  parseDateOnly,
  validatePlanningStartDate,
  validatePlanningDuration,
  validateYearRange,
  normalizeTargetUnits,
  resolveTargetUnitLabel,
  isKnownTargetUnit,
  resolveNodeTargetUnit,
  validateNodeTargetUnit,
  normalizeCustomPeriods,
  resolvePeriodLabels,
  resolvePeriodLabelsForMode,
  validateBreakdownConfiguration,
  QUARTERLY_PERIOD_LABELS,
  SEMI_ANNUAL_PERIOD_LABELS,
};
