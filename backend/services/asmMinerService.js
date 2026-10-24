"use strict";

const { Op } = require("sequelize");
const { AsmMiner, PurchasingCenter, User, GoldPurchase, SystemAuditLog } = require("../models");

/**
 * Search existing ASM miners before registration to detect duplicate candidates.
 * Checks exact matches on reliable identifiers (national_id, mining_license)
 * and fuzzy matches on phone and name.
 *
 * @param {Object} criteria
 * @returns {Promise<{ exact_matches: Array, potential_matches: Array }>}
 */
async function searchCandidates(criteria = {}) {
  const { national_id_number, mining_license_number, phone_number, full_name, search } = criteria;
  const exactMatches = [];
  const potentialMatches = [];

  const trimmedNationalId = national_id_number ? national_id_number.trim() : null;
  const trimmedLicense = mining_license_number ? mining_license_number.trim() : null;
  const trimmedPhone = phone_number ? phone_number.trim() : null;
  const trimmedName = full_name ? full_name.trim() : null;
  const trimmedSearch = search ? search.trim() : null;

  // 1. Check exact reliable identifier matches
  const exactOrConditions = [];
  if (trimmedNationalId) {
    exactOrConditions.push({ national_id_number: trimmedNationalId });
  }
  if (trimmedLicense) {
    exactOrConditions.push({ mining_license_number: trimmedLicense });
  }

  if (exactOrConditions.length > 0) {
    const foundExact = await AsmMiner.findAll({
      where: {
        [Op.or]: exactOrConditions,
      },
      include: [
        {
          model: PurchasingCenter,
          as: "registeredCenter",
          attributes: ["purchasing_center_id", "name", "code"],
        },
      ],
    });
    exactMatches.push(...foundExact);
  }

  // 2. Check potential matches on phone, name, or general search term
  const exactIds = new Set(exactMatches.map((m) => m.asm_id));
  const potentialOrConditions = [];

  if (trimmedPhone) {
    potentialOrConditions.push({ phone_number: trimmedPhone });
  }
  if (trimmedName && trimmedName.length >= 3) {
    potentialOrConditions.push({ full_name: { [Op.iLike]: `%${trimmedName}%` } });
  }
  if (trimmedSearch && trimmedSearch.length >= 2) {
    potentialOrConditions.push(
      { full_name: { [Op.iLike]: `%${trimmedSearch}%` } },
      { phone_number: { [Op.iLike]: `%${trimmedSearch}%` } },
      { national_id_number: { [Op.iLike]: `%${trimmedSearch}%` } },
      { mining_license_number: { [Op.iLike]: `%${trimmedSearch}%` } }
    );
  }

  if (potentialOrConditions.length > 0) {
    const foundPotential = await AsmMiner.findAll({
      where: {
        [Op.or]: potentialOrConditions,
      },
      include: [
        {
          model: PurchasingCenter,
          as: "registeredCenter",
          attributes: ["purchasing_center_id", "name", "code"],
        },
      ],
      limit: 20,
    });

    for (const item of foundPotential) {
      if (!exactIds.has(item.asm_id)) {
        potentialMatches.push(item);
      }
    }
  }

  return {
    exact_matches: exactMatches,
    potential_matches: potentialMatches,
  };
}

/**
 * List ASM miners with pagination and filtering.
 * Shared across all purchasing centers and federal administration.
 *
 * @param {Object} query
 */
async function listMiners(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  const where = {};
  if (query.is_active !== undefined && query.is_active !== "") {
    where.is_active = query.is_active === "true" || query.is_active === true;
  }
  if (query.region) {
    where.region = query.region;
  }

  if (query.search) {
    const s = `%${query.search.trim()}%`;
    where[Op.or] = [
      { full_name: { [Op.iLike]: s } },
      { national_id_number: { [Op.iLike]: s } },
      { mining_license_number: { [Op.iLike]: s } },
      { phone_number: { [Op.iLike]: s } },
      { zone_or_woreda: { [Op.iLike]: s } },
      { kebele: { [Op.iLike]: s } },
    ];
  }

  const { rows, count } = await AsmMiner.findAndCountAll({
    where,
    include: [
      {
        model: PurchasingCenter,
        as: "registeredCenter",
        attributes: ["purchasing_center_id", "name", "code"],
      },
      {
        model: User,
        as: "registeredBy",
        attributes: ["user_id", "full_name", "email"],
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  return {
    items: rows,
    total: count,
    page,
    limit,
    total_pages: Math.ceil(count / limit),
  };
}

/**
 * Get an ASM miner by ID.
 * @param {string} asmId
 */
async function getMinerById(asmId) {
  const miner = await AsmMiner.findByPk(asmId, {
    include: [
      {
        model: PurchasingCenter,
        as: "registeredCenter",
        attributes: ["purchasing_center_id", "name", "code", "description"],
      },
      {
        model: User,
        as: "registeredBy",
        attributes: ["user_id", "full_name", "email"],
      },
    ],
  });

  if (!miner) {
    const error = new Error("Artisanal and Small-Scale Miner (ASM) not found.");
    error.status = 404;
    throw error;
  }

  return miner;
}

/**
 * Register a new ASM miner.
 * Enforces uniqueness of national ID and mining license when provided.
 *
 * @param {Object} data
 * @param {Object} actor - Authenticated user context
 */
async function registerMiner(data, actor) {
  const {
    full_name,
    national_id_number,
    mining_license_number,
    phone_number,
    region,
    zone_or_woreda,
    kebele,
    notes,
  } = data;

  if (!full_name || !full_name.trim()) {
    const error = new Error("Full name of the ASM miner is required.");
    error.status = 400;
    throw error;
  }

  const trimmedNationalId = national_id_number && national_id_number.trim() ? national_id_number.trim() : null;
  const trimmedLicense = mining_license_number && mining_license_number.trim() ? mining_license_number.trim() : null;
  const trimmedPhone = phone_number && phone_number.trim() ? phone_number.trim() : null;

  // Uniqueness check for national ID
  if (trimmedNationalId) {
    const existing = await AsmMiner.findOne({
      where: { national_id_number: trimmedNationalId },
    });
    if (existing) {
      const error = new Error(`An ASM miner with National ID '${trimmedNationalId}' is already registered (${existing.full_name}).`);
      error.status = 409;
      throw error;
    }
  }

  // Uniqueness check for mining license
  if (trimmedLicense) {
    const existing = await AsmMiner.findOne({
      where: { mining_license_number: trimmedLicense },
    });
    if (existing) {
      const error = new Error(`An ASM miner with Mining License '${trimmedLicense}' is already registered (${existing.full_name}).`);
      error.status = 409;
      throw error;
    }
  }

  // Derive origin purchasing center if registered from center workspace
  const registeredCenterId = actor?.purchasing_center_id || null;
  const registeredById = actor?.user_id || null;

  const miner = await AsmMiner.create({
    full_name: full_name.trim(),
    national_id_number: trimmedNationalId,
    mining_license_number: trimmedLicense,
    phone_number: trimmedPhone,
    region: region ? region.trim() : null,
    zone_or_woreda: zone_or_woreda ? zone_or_woreda.trim() : null,
    kebele: kebele ? kebele.trim() : null,
    notes: notes ? notes.trim() : null,
    is_active: true,
    registered_center_id: registeredCenterId,
    registered_by_id: registeredById,
  });

  if (actor?.user_id) {
    await SystemAuditLog.create({
      module: "ASM_MINERS",
      action: "CREATE",
      entity_id: miner.asm_id,
      entity_label: miner.full_name,
      summary: `Registered new ASM miner ${miner.full_name}${registeredCenterId ? ` at center ${registeredCenterId}` : " via Federal Admin"}`,
      new_values: miner.toJSON(),
      changed_by: actor.user_id,
    }).catch((err) => console.error("Audit log error:", err.message));
  }

  return await getMinerById(miner.asm_id);
}

/**
 * Update an existing ASM miner.
 * @param {string} asmId
 * @param {Object} data
 * @param {Object} actor
 */
async function updateMiner(asmId, data, actor) {
  const miner = await getMinerById(asmId);

  const trimmedNationalId = data.national_id_number !== undefined
    ? (data.national_id_number && data.national_id_number.trim() ? data.national_id_number.trim() : null)
    : miner.national_id_number;

  const trimmedLicense = data.mining_license_number !== undefined
    ? (data.mining_license_number && data.mining_license_number.trim() ? data.mining_license_number.trim() : null)
    : miner.mining_license_number;

  if (trimmedNationalId && trimmedNationalId !== miner.national_id_number) {
    const existing = await AsmMiner.findOne({
      where: {
        national_id_number: trimmedNationalId,
        asm_id: { [Op.ne]: asmId },
      },
    });
    if (existing) {
      const error = new Error(`An ASM miner with National ID '${trimmedNationalId}' is already registered (${existing.full_name}).`);
      error.status = 409;
      throw error;
    }
    miner.national_id_number = trimmedNationalId;
  } else if (data.national_id_number !== undefined) {
    miner.national_id_number = trimmedNationalId;
  }

  if (trimmedLicense && trimmedLicense !== miner.mining_license_number) {
    const existing = await AsmMiner.findOne({
      where: {
        mining_license_number: trimmedLicense,
        asm_id: { [Op.ne]: asmId },
      },
    });
    if (existing) {
      const error = new Error(`An ASM miner with Mining License '${trimmedLicense}' is already registered (${existing.full_name}).`);
      error.status = 409;
      throw error;
    }
    miner.mining_license_number = trimmedLicense;
  } else if (data.mining_license_number !== undefined) {
    miner.mining_license_number = trimmedLicense;
  }

  if (data.full_name) miner.full_name = data.full_name.trim();
  if (data.phone_number !== undefined) miner.phone_number = data.phone_number ? data.phone_number.trim() : null;
  if (data.region !== undefined) miner.region = data.region ? data.region.trim() : null;
  if (data.zone_or_woreda !== undefined) miner.zone_or_woreda = data.zone_or_woreda ? data.zone_or_woreda.trim() : null;
  if (data.kebele !== undefined) miner.kebele = data.kebele ? data.kebele.trim() : null;
  if (data.notes !== undefined) miner.notes = data.notes ? data.notes.trim() : null;

  const previousValues = miner.toJSON();
  await miner.save();

  if (actor?.user_id) {
    await SystemAuditLog.create({
      module: "ASM_MINERS",
      action: "UPDATE",
      entity_id: miner.asm_id,
      entity_label: miner.full_name,
      summary: `Updated ASM miner ${miner.full_name}`,
      previous_values: previousValues,
      new_values: miner.toJSON(),
      changed_by: actor.user_id,
    }).catch((err) => console.error("Audit log error:", err.message));
  }

  return await getMinerById(asmId);
}

/**
 * Toggle active status of an ASM miner.
 * @param {string} asmId
 * @param {boolean} isActive
 * @param {Object} actor
 */
async function toggleMinerStatus(asmId, isActive, actor) {
  const miner = await getMinerById(asmId);
  const previousValues = miner.toJSON();

  miner.is_active = isActive;
  await miner.save();

  if (actor?.user_id) {
    await SystemAuditLog.create({
      module: "ASM_MINERS",
      action: isActive ? "ACTIVATE" : "DEACTIVATE",
      entity_id: miner.asm_id,
      entity_label: miner.full_name,
      summary: `${isActive ? "Activated" : "Deactivated"} ASM miner ${miner.full_name}`,
      previous_values: previousValues,
      new_values: miner.toJSON(),
      changed_by: actor.user_id,
    }).catch((err) => console.error("Audit log error:", err.message));
  }

  return await getMinerById(asmId);
}

module.exports = {
  searchCandidates,
  listMiners,
  getMinerById,
  registerMiner,
  updateMiner,
  toggleMinerStatus,
};
