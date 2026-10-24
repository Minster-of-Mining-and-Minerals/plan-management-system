"use strict";

const { Op } = require("sequelize");
const {
  ProductionItem,
  ProductionItemUnit,
  ProductionReportingFrequency,
  GoldMeasurementUnit,
  CompanyProductionAssignment,
  sequelize,
} = require("../../models");
const { roundDecimal } = require("./productionDecimalUtils");

/**
 * List production items with optional filtering.
 */
async function listProductionItems(query = {}) {
  const where = {};
  if (query.is_active !== undefined) {
    where.is_active = query.is_active === "true" || query.is_active === true;
  }
  if (query.category) {
    where.category = query.category;
  }
  if (query.search) {
    const s = `%${query.search.trim()}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: s } },
      { code: { [Op.iLike]: s } },
      { category: { [Op.iLike]: s } },
    ];
  }

  const items = await ProductionItem.findAll({
    where,
    include: [
      {
        model: GoldMeasurementUnit,
        as: "baseUnit",
      },
      {
        model: GoldMeasurementUnit,
        as: "defaultReportingUnit",
      },
      {
        model: ProductionItemUnit,
        as: "supportedUnits",
        include: [
          {
            model: GoldMeasurementUnit,
            as: "measurementUnit",
          },
        ],
      },
    ],
    order: [["name", "ASC"]],
  });

  return items;
}

/**
 * Get a production item by ID.
 */
async function getProductionItemById(itemId) {
  const item = await ProductionItem.findByPk(itemId, {
    include: [
      {
        model: GoldMeasurementUnit,
        as: "baseUnit",
      },
      {
        model: GoldMeasurementUnit,
        as: "defaultReportingUnit",
      },
      {
        model: ProductionItemUnit,
        as: "supportedUnits",
        include: [
          {
            model: GoldMeasurementUnit,
            as: "measurementUnit",
          },
        ],
      },
    ],
  });

  if (!item) {
    const err = new Error("Production item not found.");
    err.status = 404;
    throw err;
  }
  return item;
}

/**
 * Create a new production item.
 */
async function createProductionItem(data, userId) {
  const {
    name,
    code,
    description,
    category,
    base_unit_id,
    default_reporting_unit_id,
    supported_units, // Array of { unit_id, conversion_factor_to_base, is_default }
  } = data;

  if (!name || !name.trim()) {
    const err = new Error("Production item name is required.");
    err.status = 400;
    throw err;
  }
  if (!code || !code.trim()) {
    const err = new Error("Production item code is required.");
    err.status = 400;
    throw err;
  }
  if (!base_unit_id) {
    const err = new Error("Base measurement unit is required.");
    err.status = 400;
    throw err;
  }

  // Validate base unit exists
  const baseUnit = await GoldMeasurementUnit.findByPk(base_unit_id);
  if (!baseUnit) {
    const err = new Error("Specified base measurement unit not found.");
    err.status = 404;
    throw err;
  }

  const existing = await ProductionItem.findOne({
    where: {
      [Op.or]: [{ name: name.trim() }, { code: code.trim() }],
    },
  });
  if (existing) {
    const err = new Error("A production item with this name or code already exists.");
    err.status = 409;
    throw err;
  }

  const createdItemId = await sequelize.transaction(async (t) => {
    const item = await ProductionItem.create(
      {
        name: name.trim(),
        code: code.trim().toLowerCase(),
        description: description ? description.trim() : null,
        category: category ? category.trim() : null,
        base_unit_id,
        default_reporting_unit_id: default_reporting_unit_id || base_unit_id,
        is_active: data.is_active !== undefined ? data.is_active : true,
      },
      { transaction: t }
    );

    // Always include base unit as supported unit with factor 1.0
    const unitsToInsert = [];
    unitsToInsert.push({
      production_item_id: item.production_item_id,
      unit_id: base_unit_id,
      conversion_factor_to_base: 1.0,
      is_default: !default_reporting_unit_id || default_reporting_unit_id === base_unit_id,
      is_active: true,
    });

    if (Array.isArray(supported_units)) {
      for (const su of supported_units) {
        if (su.unit_id && su.unit_id !== base_unit_id) {
          // If conversion_factor_to_base not explicitly provided, calculate from GoldMeasurementUnit conversion_factor
          let factor = Number(su.conversion_factor_to_base);
          if (!factor || factor <= 0) {
            const targetUnit = await GoldMeasurementUnit.findByPk(su.unit_id);
            if (targetUnit && baseUnit.conversion_factor > 0) {
              factor = Number(targetUnit.conversion_factor) / Number(baseUnit.conversion_factor);
            } else {
              factor = 1.0;
            }
          }
          unitsToInsert.push({
            production_item_id: item.production_item_id,
            unit_id: su.unit_id,
            conversion_factor_to_base: factor,
            is_default: su.is_default || su.unit_id === default_reporting_unit_id,
            is_active: su.is_active !== undefined ? su.is_active : true,
          });
        }
      }
    }

    if (unitsToInsert.length > 0) {
      await ProductionItemUnit.bulkCreate(unitsToInsert, { transaction: t });
    }

    return item.production_item_id;
  });

  return await getProductionItemById(createdItemId);
}

/**
 * Update an existing production item.
 */
async function updateProductionItem(itemId, data, userId) {
  const item = await ProductionItem.findByPk(itemId);
  if (!item) {
    const err = new Error("Production item not found.");
    err.status = 404;
    throw err;
  }

  if (data.name && data.name.trim() !== item.name) {
    const existing = await ProductionItem.findOne({
      where: {
        name: data.name.trim(),
        production_item_id: { [Op.ne]: itemId },
      },
    });
    if (existing) {
      const err = new Error(`Production item with name '${data.name}' already exists.`);
      err.status = 409;
      throw err;
    }
    item.name = data.name.trim();
  }

  if (data.description !== undefined) item.description = data.description ? data.description.trim() : null;
  if (data.category !== undefined) item.category = data.category ? data.category.trim() : null;
  if (data.default_reporting_unit_id !== undefined) item.default_reporting_unit_id = data.default_reporting_unit_id;
  if (data.is_active !== undefined) item.is_active = !!data.is_active;

  await sequelize.transaction(async (t) => {
    await item.save({ transaction: t });

    // If supported_units provided, update them
    if (Array.isArray(data.supported_units)) {
      await ProductionItemUnit.destroy({
        where: { production_item_id: itemId },
        transaction: t,
      });

      const baseUnit = await GoldMeasurementUnit.findByPk(item.base_unit_id);
      const unitsToInsert = [];

      // Ensure base unit is included
      unitsToInsert.push({
        production_item_id: itemId,
        unit_id: item.base_unit_id,
        conversion_factor_to_base: 1.0,
        is_default: !item.default_reporting_unit_id || item.default_reporting_unit_id === item.base_unit_id,
        is_active: true,
      });

      for (const su of data.supported_units) {
        if (su.unit_id && su.unit_id !== item.base_unit_id) {
          let factor = Number(su.conversion_factor_to_base);
          if (!factor || factor <= 0) {
            const targetUnit = await GoldMeasurementUnit.findByPk(su.unit_id);
            if (targetUnit && baseUnit && baseUnit.conversion_factor > 0) {
              factor = Number(targetUnit.conversion_factor) / Number(baseUnit.conversion_factor);
            } else {
              factor = 1.0;
            }
          }
          unitsToInsert.push({
            production_item_id: itemId,
            unit_id: su.unit_id,
            conversion_factor_to_base: factor,
            is_default: su.is_default || su.unit_id === item.default_reporting_unit_id,
            is_active: su.is_active !== undefined ? su.is_active : true,
          });
        }
      }

      await ProductionItemUnit.bulkCreate(unitsToInsert, { transaction: t });
    }
  });

  return await getProductionItemById(itemId);
}

/**
 * Delete / deactivate a production item.
 */
async function deleteProductionItem(itemId) {
  const item = await ProductionItem.findByPk(itemId);
  if (!item) {
    const err = new Error("Production item not found.");
    err.status = 404;
    throw err;
  }

  // Check if item is assigned to any company
  const assignmentCount = await CompanyProductionAssignment.count({
    where: { production_item_id: itemId },
  });
  if (assignmentCount > 0) {
    const err = new Error("Cannot delete a production item that is assigned to companies. Deactivate it instead.");
    err.status = 400;
    throw err;
  }

  await item.destroy();
  return { message: "Production item deleted successfully." };
}

/**
 * Convert quantity from one measurement unit to another for a given production item.
 */
async function convertQuantity({ quantity, fromUnitId, toUnitId, productionItemId }) {
  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty < 0) {
    const err = new Error("Invalid quantity specified.");
    err.status = 400;
    throw err;
  }

  if (fromUnitId === toUnitId) {
    return {
      convertedQuantity: roundDecimal(numQty, 4),
      conversionFactor: 1.0,
    };
  }

  // Fetch supported units for the item
  const supportedUnits = await ProductionItemUnit.findAll({
    where: { production_item_id: productionItemId },
    include: [{ model: GoldMeasurementUnit, as: "measurementUnit" }],
  });

  const fromUnit = supportedUnits.find((u) => u.unit_id === fromUnitId);
  const toUnit = supportedUnits.find((u) => u.unit_id === toUnitId);

  if (!fromUnit || !toUnit) {
    // If not in supported units, check global measurement registry
    const gFrom = await GoldMeasurementUnit.findByPk(fromUnitId);
    const gTo = await GoldMeasurementUnit.findByPk(toUnitId);
    if (!gFrom || !gTo) {
      const err = new Error("Incompatible or unregistered measurement units.");
      err.status = 400;
      throw err;
    }
    const factor = Number(gFrom.conversion_factor) / Number(gTo.conversion_factor);
    return {
      convertedQuantity: roundDecimal(numQty * factor, 4),
      conversionFactor: roundDecimal(factor, 6),
    };
  }

  // Convert from fromUnit to item base unit, then from item base unit to toUnit
  // fromUnit.conversion_factor_to_base: 1 fromUnit = factor * baseUnit
  // toUnit.conversion_factor_to_base: 1 toUnit = factor * baseUnit
  const baseQty = numQty * Number(fromUnit.conversion_factor_to_base);
  const targetFactor = Number(toUnit.conversion_factor_to_base);
  if (!targetFactor || targetFactor <= 0) {
    const err = new Error("Invalid conversion factor configured for target unit.");
    err.status = 400;
    throw err;
  }

  const convertedQuantity = baseQty / targetFactor;
  const effectiveFactor = Number(fromUnit.conversion_factor_to_base) / targetFactor;

  return {
    convertedQuantity: roundDecimal(convertedQuantity, 4),
    conversionFactor: roundDecimal(effectiveFactor, 6),
  };
}

/**
 * List all reporting frequencies.
 */
async function listFrequencies() {
  return await ProductionReportingFrequency.findAll({
    order: [["interval_days", "ASC"]],
  });
}

/**
 * Create or update reporting frequency.
 */
async function createFrequency(data) {
  const { code, name, interval_days, description, calendar_basis } = data;
  if (!code || !name) {
    const err = new Error("Frequency code and name are required.");
    err.status = 400;
    throw err;
  }

  const existing = await ProductionReportingFrequency.findOne({ where: { code } });
  if (existing) {
    const err = new Error(`Frequency with code '${code}' already exists.`);
    err.status = 409;
    throw err;
  }

  return await ProductionReportingFrequency.create({
    code: code.trim().toLowerCase(),
    name: name.trim(),
    interval_days: interval_days ? parseInt(interval_days, 10) : null,
    description: description ? description.trim() : null,
    calendar_basis: calendar_basis || "gregorian",
    is_active: true,
  });
}

/**
 * Update a reporting frequency.
 */
async function updateFrequency(frequencyId, data) {
  const freq = await ProductionReportingFrequency.findByPk(frequencyId);
  if (!freq) {
    const err = new Error("Reporting frequency not found.");
    err.status = 404;
    throw err;
  }

  if (data.name !== undefined) freq.name = data.name.trim();
  if (data.interval_days !== undefined) freq.interval_days = data.interval_days ? parseInt(data.interval_days, 10) : null;
  if (data.description !== undefined) freq.description = data.description ? data.description.trim() : null;
  if (data.calendar_basis !== undefined) freq.calendar_basis = data.calendar_basis;
  if (data.is_active !== undefined) freq.is_active = !!data.is_active;

  await freq.save();
  return freq;
}

/**
 * Dynamically generate target period structures for a calendar or fiscal year.
 * Handles:
 * - 'annual': Only root annual period
 * - 'semi_annual': Root annual + H1, H2
 * - 'quarterly': Root annual + Q1, Q2, Q3, Q4
 * - 'monthly': Root annual + 12 months with correct leap-year / day counts
 */
function generateTargetPeriods({
  year,
  allocationDepth = "quarterly",
  startDate = null,
  endDate = null,
  calendarBasis = "gregorian",
}) {
  const targetYear = parseInt(year, 10) || new Date().getFullYear();
  const yearStart = startDate || `${targetYear}-01-01`;
  const yearEnd = endDate || `${targetYear}-12-31`;

  const rootPeriod = {
    target_period_type: "year",
    period_label: String(targetYear),
    period_start_date: yearStart,
    period_end_date: yearEnd,
    children: [],
  };

  if (allocationDepth === "annual") {
    return [rootPeriod];
  }

  if (allocationDepth === "semi_annual") {
    rootPeriod.children = [
      {
        target_period_type: "half_year",
        period_label: `${targetYear}-H1`,
        period_start_date: `${targetYear}-01-01`,
        period_end_date: `${targetYear}-06-30`,
        children: [],
      },
      {
        target_period_type: "half_year",
        period_label: `${targetYear}-H2`,
        period_start_date: `${targetYear}-07-01`,
        period_end_date: `${targetYear}-12-31`,
        children: [],
      },
    ];
    return [rootPeriod];
  }

  if (allocationDepth === "quarterly") {
    rootPeriod.children = [
      {
        target_period_type: "quarter",
        period_label: `${targetYear}-Q1`,
        period_start_date: `${targetYear}-01-01`,
        period_end_date: `${targetYear}-03-31`,
        children: [],
      },
      {
        target_period_type: "quarter",
        period_label: `${targetYear}-Q2`,
        period_start_date: `${targetYear}-04-01`,
        period_end_date: `${targetYear}-06-30`,
        children: [],
      },
      {
        target_period_type: "quarter",
        period_label: `${targetYear}-Q3`,
        period_start_date: `${targetYear}-07-01`,
        period_end_date: `${targetYear}-09-30`,
        children: [],
      },
      {
        target_period_type: "quarter",
        period_label: `${targetYear}-Q4`,
        period_start_date: `${targetYear}-10-01`,
        period_end_date: `${targetYear}-12-31`,
        children: [],
      },
    ];
    return [rootPeriod];
  }

  if (allocationDepth === "monthly") {
    const months = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = m < 10 ? `0${m}` : `${m}`;
      // Calculate last day of month in UTC
      const lastDay = new Date(Date.UTC(targetYear, m, 0)).getUTCDate();
      months.push({
        target_period_type: "month",
        period_label: `${targetYear}-${monthStr}`,
        period_start_date: `${targetYear}-${monthStr}-01`,
        period_end_date: `${targetYear}-${monthStr}-${lastDay < 10 ? "0" + lastDay : lastDay}`,
        children: [],
      });
    }
    rootPeriod.children = months;
    return [rootPeriod];
  }

  return [rootPeriod];
}

module.exports = {
  listProductionItems,
  getProductionItemById,
  createProductionItem,
  updateProductionItem,
  deleteProductionItem,
  convertQuantity,
  listFrequencies,
  createFrequency,
  updateFrequency,
  generateTargetPeriods,
};
