"use strict";

const { Op } = require("sequelize");
const { GoldMeasurementUnit, GoldPurchase, SystemAuditLog } = require("../models");

/**
 * List all gold measurement units.
 * @param {Object} query - Filter options (is_active, search)
 */
async function listUnits(query = {}) {
  const where = {};
  if (query.is_active !== undefined) {
    where.is_active = query.is_active === "true" || query.is_active === true;
  }
  if (query.search) {
    const s = `%${query.search.trim()}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: s } },
      { code: { [Op.iLike]: s } },
      { symbol: { [Op.iLike]: s } },
    ];
  }

  return await GoldMeasurementUnit.findAll({
    where,
    order: [
      ["is_canonical_base", "DESC"],
      ["name", "ASC"],
    ],
  });
}

/**
 * Get a measurement unit by ID.
 * @param {string} unitId
 */
async function getUnitById(unitId) {
  const unit = await GoldMeasurementUnit.findByPk(unitId);
  if (!unit) {
    const error = new Error("Gold measurement unit not found.");
    error.status = 404;
    throw error;
  }
  return unit;
}

/**
 * Create a new gold measurement unit.
 * @param {Object} data
 * @param {string} userId - Actor user ID for audit
 */
async function createUnit(data, userId) {
  const { name, code, symbol, description, conversion_factor, is_canonical_base } = data;

  if (!name || !name.trim()) {
    const error = new Error("Unit name is required.");
    error.status = 400;
    throw error;
  }
  if (!code || !code.trim()) {
    const error = new Error("Unit code is required.");
    error.status = 400;
    throw error;
  }
  if (!symbol || !symbol.trim()) {
    const error = new Error("Unit symbol is required.");
    error.status = 400;
    throw error;
  }

  const factor = parseFloat(conversion_factor);
  if (isNaN(factor) || factor <= 0) {
    const error = new Error("Conversion factor must be a positive decimal number.");
    error.status = 400;
    throw error;
  }

  // Check unique name and code
  const existing = await GoldMeasurementUnit.findOne({
    where: {
      [Op.or]: [
        { code: code.trim().toLowerCase() },
        { name: name.trim() },
      ],
    },
  });
  if (existing) {
    const error = new Error(
      existing.code.toLowerCase() === code.trim().toLowerCase()
        ? `Unit code '${code}' is already registered.`
        : `Unit name '${name}' is already registered.`
    );
    error.status = 409;
    throw error;
  }

  // If is_canonical_base is requested, check if one already exists
  if (is_canonical_base) {
    const currentBase = await GoldMeasurementUnit.findOne({ where: { is_canonical_base: true } });
    if (currentBase) {
      const error = new Error(`Unit '${currentBase.name}' (${currentBase.code}) is already designated as the canonical base unit.`);
      error.status = 400;
      throw error;
    }
  }

  const unit = await GoldMeasurementUnit.create({
    name: name.trim(),
    code: code.trim().toLowerCase(),
    symbol: symbol.trim(),
    description: description ? description.trim() : null,
    conversion_factor: factor,
    is_canonical_base: Boolean(is_canonical_base),
    is_active: true,
  });

  if (userId) {
    await SystemAuditLog.create({
      module: "GOLD_UNITS",
      action: "CREATE",
      entity_id: unit.unit_id,
      entity_label: `${unit.name} (${unit.code})`,
      summary: `Created gold measurement unit ${unit.name} with conversion factor ${factor}`,
      new_values: unit.toJSON(),
      changed_by: userId,
    }).catch((err) => console.error("Audit log error:", err.message));
  }

  return unit;
}

/**
 * Update an existing measurement unit.
 * @param {string} unitId
 * @param {Object} data
 * @param {string} userId - Actor user ID for audit
 */
async function updateUnit(unitId, data, userId) {
  const unit = await getUnitById(unitId);

  // Check if unit is already used in historical gold purchases
  const purchaseCount = await GoldPurchase.count({
    where: { measurement_unit_id: unitId },
  });

  if (data.code && data.code.trim().toLowerCase() !== unit.code.toLowerCase()) {
    if (purchaseCount > 0) {
      const error = new Error("Cannot change unit code for a unit with recorded purchase history.");
      error.status = 400;
      throw error;
    }
    const duplicate = await GoldMeasurementUnit.findOne({
      where: {
        code: data.code.trim().toLowerCase(),
        unit_id: { [Op.ne]: unitId },
      },
    });
    if (duplicate) {
      const error = new Error(`Unit code '${data.code}' is already registered.`);
      error.status = 409;
      throw error;
    }
    unit.code = data.code.trim().toLowerCase();
  }

  if (data.conversion_factor !== undefined) {
    const factor = parseFloat(data.conversion_factor);
    if (isNaN(factor) || factor <= 0) {
      const error = new Error("Conversion factor must be a positive decimal number.");
      error.status = 400;
      throw error;
    }
    // Prevent unsafe modification of conversion factor if unit has recorded transactions
    if (purchaseCount > 0 && Math.abs(parseFloat(unit.conversion_factor) - factor) > 0.000001) {
      const error = new Error("Cannot change conversion factor for a measurement unit with recorded gold purchases.");
      error.status = 400;
      throw error;
    }
    unit.conversion_factor = factor;
  }

  if (data.name) {
    const duplicate = await GoldMeasurementUnit.findOne({
      where: {
        name: data.name.trim(),
        unit_id: { [Op.ne]: unitId },
      },
    });
    if (duplicate) {
      const error = new Error(`Unit name '${data.name}' is already in use.`);
      error.status = 409;
      throw error;
    }
    unit.name = data.name.trim();
  }

  if (data.symbol) unit.symbol = data.symbol.trim();
  if (data.description !== undefined) unit.description = data.description ? data.description.trim() : null;

  const previousValues = unit.toJSON();
  await unit.save();

  if (userId) {
    await SystemAuditLog.create({
      module: "GOLD_UNITS",
      action: "UPDATE",
      entity_id: unit.unit_id,
      entity_label: `${unit.name} (${unit.code})`,
      summary: `Updated gold measurement unit ${unit.name}`,
      previous_values: previousValues,
      new_values: unit.toJSON(),
      changed_by: userId,
    }).catch((err) => console.error("Audit log error:", err.message));
  }

  return unit;
}

/**
 * Toggle unit active status (activate / deactivate).
 * @param {string} unitId
 * @param {boolean} isActive
 * @param {string} userId
 */
async function toggleUnitStatus(unitId, isActive, userId) {
  const unit = await getUnitById(unitId);

  if (unit.is_canonical_base && !isActive) {
    const error = new Error("The canonical base unit cannot be deactivated.");
    error.status = 400;
    throw error;
  }

  const previousValues = unit.toJSON();
  unit.is_active = isActive;
  await unit.save();

  if (userId) {
    await SystemAuditLog.create({
      module: "GOLD_UNITS",
      action: isActive ? "ACTIVATE" : "DEACTIVATE",
      entity_id: unit.unit_id,
      entity_label: `${unit.name} (${unit.code})`,
      summary: `${isActive ? "Activated" : "Deactivated"} gold measurement unit ${unit.name}`,
      previous_values: previousValues,
      new_values: unit.toJSON(),
      changed_by: userId,
    }).catch((err) => console.error("Audit log error:", err.message));
  }

  return unit;
}

module.exports = {
  listUnits,
  getUnitById,
  createUnit,
  updateUnit,
  toggleUnitStatus,
};
