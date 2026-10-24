"use strict";

const { Op } = require("sequelize");
const {
  GoldPriceConfiguration,
  GoldMeasurementUnit,
  User,
  SystemAuditLog,
} = require("../models");

/**
 * List all gold price configurations with optional filters.
 */
async function listPriceConfigurations(query = {}, user) {
  const where = {};

  if (query.is_active !== undefined && query.is_active !== "") {
    where.is_active = query.is_active === "true" || query.is_active === true;
  }

  if (query.gold_type && query.gold_type !== "all") {
    where.gold_type = query.gold_type;
  }

  if (query.karat && query.karat !== "all") {
    where.karat = query.karat;
  }

  if (query.quality_grade && query.quality_grade !== "all") {
    where.quality_grade = query.quality_grade;
  }

  if (query.search?.trim()) {
    const s = `%${query.search.trim()}%`;
    where[Op.or] = [
      { karat: { [Op.iLike]: s } },
      { quality_grade: { [Op.iLike]: s } },
      { gold_type: { [Op.iLike]: s } },
      { notes: { [Op.iLike]: s } },
    ];
  }

  const items = await GoldPriceConfiguration.findAll({
    where,
    include: [
      {
        model: GoldMeasurementUnit,
        as: "measurementUnit",
        attributes: ["unit_id", "name", "code", "symbol", "conversion_factor"],
      },
      {
        model: User,
        as: "createdBy",
        attributes: ["user_id", "full_name", "email"],
      },
    ],
    order: [
      ["effective_date", "DESC"],
      ["price_per_unit", "DESC"],
    ],
  });

  return items;
}

/**
 * Lookup the active official price configuration matching given criteria.
 */
async function getActivePriceConfiguration(params = {}) {
  const { gold_type, karat, quality_grade, measurement_unit_id } = params;

  const where = { is_active: true };

  if (karat && karat !== "all") {
    where.karat = karat;
  }

  if (gold_type && gold_type !== "all") {
    where[Op.or] = [{ gold_type }, { gold_type: "all" }];
  }

  if (quality_grade && quality_grade !== "all") {
    where.quality_grade = quality_grade;
  }

  if (measurement_unit_id) {
    where[Op.or] = [
      ...(where[Op.or] || []),
      { measurement_unit_id },
      { measurement_unit_id: null },
    ];
  }

  let match = await GoldPriceConfiguration.findOne({
    where,
    include: [
      {
        model: GoldMeasurementUnit,
        as: "measurementUnit",
        attributes: ["unit_id", "name", "code", "symbol", "conversion_factor"],
      },
    ],
    order: [["effective_date", "DESC"]],
  });

  // Fallback: match by karat alone if exact combo not found
  if (!match && karat) {
    match = await GoldPriceConfiguration.findOne({
      where: { karat, is_active: true },
      include: [
        {
          model: GoldMeasurementUnit,
          as: "measurementUnit",
          attributes: ["unit_id", "name", "code", "symbol", "conversion_factor"],
        },
      ],
      order: [["effective_date", "DESC"]],
    });
  }

  return match;
}

/**
 * Create a new gold price configuration.
 */
async function createPriceConfiguration(data, user) {
  const {
    gold_type = "all",
    karat,
    purity_percentage,
    quality_grade,
    measurement_unit_id,
    price_per_unit,
    min_price_per_unit,
    max_price_per_unit,
    currency = "ETB",
    effective_date = new Date().toISOString().slice(0, 10),
    is_active = true,
    notes,
  } = data;

  if (!karat || !karat.trim()) {
    const error = new Error("Karat / purity designation is required.");
    error.status = 400;
    throw error;
  }

  if (!quality_grade || !quality_grade.trim()) {
    const error = new Error("Quality grade is required.");
    error.status = 400;
    throw error;
  }

  const parsedPrice = parseFloat(price_per_unit);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    const error = new Error("Official price per unit must be a positive number.");
    error.status = 400;
    throw error;
  }

  const config = await GoldPriceConfiguration.create({
    gold_type: gold_type.trim(),
    karat: karat.trim(),
    purity_percentage: purity_percentage ? parseFloat(purity_percentage) : null,
    quality_grade: quality_grade.trim(),
    measurement_unit_id: measurement_unit_id || null,
    price_per_unit: parsedPrice,
    min_price_per_unit: min_price_per_unit ? parseFloat(min_price_per_unit) : null,
    max_price_per_unit: max_price_per_unit ? parseFloat(max_price_per_unit) : null,
    currency: currency.trim() || "ETB",
    effective_date,
    is_active: is_active ?? true,
    notes: notes?.trim() || null,
    created_by_id: user?.user_id || null,
    updated_by_id: user?.user_id || null,
  });

  if (user?.user_id) {
    await SystemAuditLog.create({
      module: "GOLD_PRICING",
      action: "CREATE",
      entity_id: config.price_config_id,
      entity_label: `${config.karat} - ${config.quality_grade}`,
      summary: `Created gold price config for ${config.karat} (${config.price_per_unit} ${config.currency})`,
      new_values: config.toJSON(),
      changed_by: user.user_id,
    }).catch((err) => console.error("Audit log error:", err.message));
  }

  return config;
}

/**
 * Update an existing gold price configuration.
 */
async function updatePriceConfiguration(id, data, user) {
  const config = await GoldPriceConfiguration.findByPk(id);
  if (!config) {
    const error = new Error("Gold price configuration not found.");
    error.status = 404;
    throw error;
  }

  const previousValues = config.toJSON();

  if (data.gold_type !== undefined) config.gold_type = data.gold_type.trim();
  if (data.karat !== undefined) config.karat = data.karat.trim();
  if (data.purity_percentage !== undefined)
    config.purity_percentage = data.purity_percentage ? parseFloat(data.purity_percentage) : null;
  if (data.quality_grade !== undefined) config.quality_grade = data.quality_grade.trim();
  if (data.measurement_unit_id !== undefined) config.measurement_unit_id = data.measurement_unit_id || null;
  if (data.price_per_unit !== undefined) {
    const parsedPrice = parseFloat(data.price_per_unit);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      const error = new Error("Price per unit must be a positive number.");
      error.status = 400;
      throw error;
    }
    config.price_per_unit = parsedPrice;
  }
  if (data.min_price_per_unit !== undefined)
    config.min_price_per_unit = data.min_price_per_unit ? parseFloat(data.min_price_per_unit) : null;
  if (data.max_price_per_unit !== undefined)
    config.max_price_per_unit = data.max_price_per_unit ? parseFloat(data.max_price_per_unit) : null;
  if (data.effective_date !== undefined) config.effective_date = data.effective_date;
  if (data.is_active !== undefined) config.is_active = Boolean(data.is_active);
  if (data.notes !== undefined) config.notes = data.notes?.trim() || null;

  config.updated_by_id = user?.user_id || null;
  await config.save();

  if (user?.user_id) {
    await SystemAuditLog.create({
      module: "GOLD_PRICING",
      action: "UPDATE",
      entity_id: config.price_config_id,
      entity_label: `${config.karat} - ${config.quality_grade}`,
      summary: `Updated gold price config for ${config.karat} (${config.price_per_unit} ${config.currency})`,
      previous_values: previousValues,
      new_values: config.toJSON(),
      changed_by: user.user_id,
    }).catch((err) => console.error("Audit log error:", err.message));
  }

  return config;
}

/**
 * Delete a gold price configuration.
 */
async function deletePriceConfiguration(id, user) {
  const config = await GoldPriceConfiguration.findByPk(id);
  if (!config) {
    const error = new Error("Gold price configuration not found.");
    error.status = 404;
    throw error;
  }

  await config.destroy();

  if (user?.user_id) {
    await SystemAuditLog.create({
      module: "GOLD_PRICING",
      action: "DELETE",
      entity_id: id,
      entity_label: `${config.karat} - ${config.quality_grade}`,
      summary: `Deleted gold price configuration ${config.karat}`,
      previous_values: config.toJSON(),
      changed_by: user.user_id,
    }).catch((err) => console.error("Audit log error:", err.message));
  }

  return { message: "Gold price configuration deleted successfully." };
}

module.exports = {
  listPriceConfigurations,
  getActivePriceConfiguration,
  createPriceConfiguration,
  updatePriceConfiguration,
  deletePriceConfiguration,
};
