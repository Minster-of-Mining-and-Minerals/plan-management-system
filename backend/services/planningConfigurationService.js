"use strict";

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
};

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

  if (!effectiveUnit) {
    return { valid: false, message: "Target unit is required for number targets." };
  }

  return { valid: true, targetUnit: effectiveUnit };
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

  if (!isKnownTargetUnit(configUnits, resolved.targetUnit)) {
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
};
