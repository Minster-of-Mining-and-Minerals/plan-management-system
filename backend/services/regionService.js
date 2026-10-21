"use strict";

const { Op } = require("sequelize");
const { Region, RegionalStructure, RegionalBrandingSetting, User, sequelize } = require("../models");

async function listRegions(query = {}) {
  const where = {};

  if (query.is_active !== undefined && query.is_active !== "") {
    where.is_active = query.is_active === "true" || query.is_active === true;
  }

  if (query.search && query.search.trim()) {
    const term = `%${query.search.trim()}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: term } },
      { code: { [Op.iLike]: term } },
      { description: { [Op.iLike]: term } },
    ];
  }

  const regions = await Region.findAll({
    where,
    order: [["name", "ASC"]],
    include: [
      {
        model: RegionalBrandingSetting,
        as: "branding",
        attributes: [
          "system_name_full",
          "system_name_short",
          "primary_color",
          "secondary_color",
          "accent_color",
          "logo_primary_path",
        ],
      },
    ],
  });

  // Calculate user and structure counts per region
  const regionIds = regions.map((r) => r.region_id);
  let structureCounts = new Map();
  let userCounts = new Map();

  if (regionIds.length > 0) {
    const [structRows] = await sequelize.query(`
      SELECT region_id, COUNT(*) as count 
      FROM regional_structures 
      WHERE region_id IN (:regionIds) AND deleted_at IS NULL 
      GROUP BY region_id;
    `, { replacements: { regionIds } });

    for (const row of structRows) {
      structureCounts.set(row.region_id, parseInt(row.count, 10));
    }

    const [userRows] = await sequelize.query(`
      SELECT region_id, COUNT(*) as count 
      FROM users 
      WHERE region_id IN (:regionIds) AND is_active = true 
      GROUP BY region_id;
    `, { replacements: { regionIds } });

    for (const row of userRows) {
      userCounts.set(row.region_id, parseInt(row.count, 10));
    }
  }

  return regions.map((region) => {
    const plain = region.toJSON ? region.toJSON() : { ...region };
    return {
      ...plain,
      structures_count: structureCounts.get(plain.region_id) || 0,
      active_users_count: userCounts.get(plain.region_id) || 0,
    };
  });
}

async function getRegionById(regionId) {
  const region = await Region.findByPk(regionId, {
    include: [
      {
        model: RegionalBrandingSetting,
        as: "branding",
      },
      {
        model: RegionalStructure,
        as: "structures",
        where: { is_active: true },
        required: false,
      },
    ],
  });

  if (!region) {
    const error = new Error("Region not found.");
    error.status = 404;
    throw error;
  }

  const plain = region.toJSON ? region.toJSON() : { ...region };
  const userCount = await User.count({
    where: { region_id: regionId, is_active: true },
  });

  return {
    ...plain,
    active_users_count: userCount,
  };
}

async function createRegion(payload) {
  const { name, code, description, logo_path } = payload;

  if (!name || !name.trim()) {
    const error = new Error("Region name is required.");
    error.status = 400;
    throw error;
  }

  if (!code || !code.trim()) {
    const error = new Error("Region code is required.");
    error.status = 400;
    throw error;
  }

  const cleanCode = code.trim().toUpperCase();
  const cleanName = name.trim();

  // Check unique code and name
  const existing = await Region.findOne({
    where: {
      [Op.or]: [
        { code: cleanCode },
        { name: { [Op.iLike]: cleanName } },
      ],
    },
  });

  if (existing) {
    const error = new Error(
      existing.code === cleanCode
        ? `A region with code '${cleanCode}' already exists.`
        : `A region with name '${cleanName}' already exists.`
    );
    error.status = 400;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    const region = await Region.create(
      {
        name: cleanName,
        code: cleanCode,
        description: description?.trim() || null,
        logo_path: logo_path || null,
        is_active: true,
      },
      { transaction: t }
    );

    // Seed default regional branding for this region
    await RegionalBrandingSetting.create(
      {
        region_id: region.region_id,
        system_name_full: `${cleanName} Mining Bureau PMS`,
        system_name_short: `${cleanCode} PMS`,
        system_tagline: `Regional Strategic Planning and Execution — ${cleanName}`,
        logo_primary_path: logo_path || "/logo-only.png",
        primary_color: "#0C4A6E",
        secondary_color: "#64748B",
        accent_color: "#CA8A04",
      },
      { transaction: t }
    );

    await t.commit();
    return getRegionById(region.region_id);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function updateRegion(regionId, payload) {
  const region = await Region.findByPk(regionId);
  if (!region) {
    const error = new Error("Region not found.");
    error.status = 404;
    throw error;
  }

  const { name, code, description, logo_path, is_active } = payload;
  const updates = {};

  if (name !== undefined) {
    const cleanName = name.trim();
    if (!cleanName) {
      const error = new Error("Region name cannot be empty.");
      error.status = 400;
      throw error;
    }
    const duplicate = await Region.findOne({
      where: {
        name: { [Op.iLike]: cleanName },
        region_id: { [Op.ne]: regionId },
      },
    });
    if (duplicate) {
      const error = new Error(`A region with name '${cleanName}' already exists.`);
      error.status = 400;
      throw error;
    }
    updates.name = cleanName;
  }

  if (code !== undefined) {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      const error = new Error("Region code cannot be empty.");
      error.status = 400;
      throw error;
    }
    const duplicate = await Region.findOne({
      where: {
        code: cleanCode,
        region_id: { [Op.ne]: regionId },
      },
    });
    if (duplicate) {
      const error = new Error(`A region with code '${cleanCode}' already exists.`);
      error.status = 400;
      throw error;
    }
    updates.code = cleanCode;
  }

  if (description !== undefined) {
    updates.description = description?.trim() || null;
  }

  if (logo_path !== undefined) {
    updates.logo_path = logo_path || null;
  }

  if (is_active !== undefined) {
    updates.is_active = Boolean(is_active);
  }

  await region.update(updates);
  return getRegionById(regionId);
}

async function setRegionActiveStatus(regionId, isActive) {
  const region = await Region.findByPk(regionId);
  if (!region) {
    const error = new Error("Region not found.");
    error.status = 404;
    throw error;
  }

  await region.update({ is_active: Boolean(isActive) });
  return getRegionById(regionId);
}

async function deleteRegion(regionId) {
  const region = await Region.findByPk(regionId);
  if (!region) {
    const error = new Error("Region not found.");
    error.status = 404;
    throw error;
  }

  // Safety check: check if any users exist in this region
  const userCount = await User.count({ where: { region_id: regionId } });
  if (userCount > 0) {
    const error = new Error(
      `Cannot delete region '${region.name}' because it has ${userCount} associated user account(s). Deactivate the region instead or reassign users.`
    );
    error.status = 400;
    throw error;
  }

  // Paranoid soft delete
  await region.destroy();
  return { success: true, message: `Region '${region.name}' deleted successfully.` };
}

module.exports = {
  listRegions,
  getRegionById,
  createRegion,
  updateRegion,
  setRegionActiveStatus,
  deleteRegion,
};
