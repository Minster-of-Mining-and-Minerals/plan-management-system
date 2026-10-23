"use strict";

const { Op } = require("sequelize");
const {
  PurchasingCenter,
  PurchasingCenterBrandingSetting,
  User,
  sequelize,
} = require("../models");

async function listPurchasingCenters(query = {}) {
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

  const centers = await PurchasingCenter.findAll({
    where,
    order: [["name", "ASC"]],
    include: [
      {
        model: PurchasingCenterBrandingSetting,
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

  const centerIds = centers.map((c) => c.purchasing_center_id);
  let userCounts = new Map();

  if (centerIds.length > 0) {
    const [userRows] = await sequelize.query(`
      SELECT purchasing_center_id, COUNT(*) as count 
      FROM users 
      WHERE purchasing_center_id IN (:centerIds) AND is_active = true 
      GROUP BY purchasing_center_id;
    `, { replacements: { centerIds } });

    for (const row of userRows) {
      userCounts.set(row.purchasing_center_id, parseInt(row.count, 10));
    }
  }

  return centers.map((c) => {
    const plain = c.toJSON ? c.toJSON() : { ...c };
    return {
      ...plain,
      active_users_count: userCounts.get(plain.purchasing_center_id) || 0,
    };
  });
}

async function getPurchasingCenterById(purchasingCenterId) {
  const center = await PurchasingCenter.findByPk(purchasingCenterId, {
    include: [
      {
        model: PurchasingCenterBrandingSetting,
        as: "branding",
      },
    ],
  });

  if (!center) {
    const error = new Error("Purchasing Center not found.");
    error.status = 404;
    throw error;
  }

  const plain = center.toJSON ? center.toJSON() : { ...center };
  const userCount = await User.count({
    where: { purchasing_center_id: purchasingCenterId, is_active: true },
  });

  return {
    ...plain,
    active_users_count: userCount,
  };
}

async function createPurchasingCenter(payload) {
  const { name, code, description, logo_path } = payload;

  if (!name || !name.trim()) {
    const error = new Error("Purchasing Center name is required.");
    error.status = 400;
    throw error;
  }

  if (!code || !code.trim()) {
    const error = new Error("Purchasing Center code is required.");
    error.status = 400;
    throw error;
  }

  const trimmedName = name.trim();
  const trimmedCode = code.trim().toUpperCase();

  // Check unique name and code
  const existingName = await PurchasingCenter.findOne({
    where: { name: { [Op.iLike]: trimmedName } },
  });
  if (existingName) {
    const error = new Error("A purchasing center with this name already exists.");
    error.status = 409;
    throw error;
  }

  const existingCode = await PurchasingCenter.findOne({
    where: { code: { [Op.iLike]: trimmedCode } },
  });
  if (existingCode) {
    const error = new Error("A purchasing center with this code already exists.");
    error.status = 409;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    const createdCenter = await PurchasingCenter.create(
      {
        name: trimmedName,
        code: trimmedCode,
        description: description?.trim() || null,
        logo_path: logo_path || null,
        is_active: true,
      },
      { transaction: t }
    );

    // Initialize default branding
    await PurchasingCenterBrandingSetting.create(
      {
        purchasing_center_id: createdCenter.purchasing_center_id,
        system_name_full: trimmedName,
        system_name_short: trimmedCode,
        system_tagline: `${trimmedName} Purchasing & Procurement Workspace`,
        primary_color: "#1e40af",
        secondary_color: "#3b82f6",
        accent_color: "#60a5fa",
        logo_primary_path: logo_path || null,
        logo_secondary_path: logo_path || null,
      },
      { transaction: t }
    );

    await t.commit();
    return getPurchasingCenterById(createdCenter.purchasing_center_id);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function updatePurchasingCenter(purchasingCenterId, payload) {
  const center = await PurchasingCenter.findByPk(purchasingCenterId);
  if (!center) {
    const error = new Error("Purchasing Center not found.");
    error.status = 404;
    throw error;
  }

  const { name, code, description, logo_path } = payload;
  const updates = {};

  if (name !== undefined) {
    const trimmed = name.trim();
    if (!trimmed) {
      const error = new Error("Purchasing Center name cannot be empty.");
      error.status = 400;
      throw error;
    }
    const dup = await PurchasingCenter.findOne({
      where: {
        name: { [Op.iLike]: trimmed },
        purchasing_center_id: { [Op.ne]: purchasingCenterId },
      },
    });
    if (dup) {
      const error = new Error("A purchasing center with this name already exists.");
      error.status = 409;
      throw error;
    }
    updates.name = trimmed;
  }

  if (code !== undefined) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      const error = new Error("Purchasing Center code cannot be empty.");
      error.status = 400;
      throw error;
    }
    const dup = await PurchasingCenter.findOne({
      where: {
        code: { [Op.iLike]: trimmed },
        purchasing_center_id: { [Op.ne]: purchasingCenterId },
      },
    });
    if (dup) {
      const error = new Error("A purchasing center with this code already exists.");
      error.status = 409;
      throw error;
    }
    updates.code = trimmed;
  }

  if (description !== undefined) {
    updates.description = description ? description.trim() : null;
  }

  if (logo_path !== undefined) {
    updates.logo_path = logo_path || null;
  }

  await center.update(updates);
  return getPurchasingCenterById(purchasingCenterId);
}

async function togglePurchasingCenterStatus(purchasingCenterId, isActive) {
  const center = await PurchasingCenter.findByPk(purchasingCenterId);
  if (!center) {
    const error = new Error("Purchasing Center not found.");
    error.status = 404;
    throw error;
  }

  const activeBool = isActive === true || isActive === "true";
  await center.update({ is_active: activeBool });
  return getPurchasingCenterById(purchasingCenterId);
}

async function deletePurchasingCenter(purchasingCenterId) {
  const center = await PurchasingCenter.findByPk(purchasingCenterId);
  if (!center) {
    const error = new Error("Purchasing Center not found.");
    error.status = 404;
    throw error;
  }

  const activeUsersCount = await User.count({
    where: { purchasing_center_id: purchasingCenterId, is_active: true },
  });

  if (activeUsersCount > 0) {
    const error = new Error(
      "Cannot delete purchasing center with active users. Please reassign or deactivate users first."
    );
    error.status = 400;
    throw error;
  }

  await center.destroy();
  return { success: true, message: "Purchasing center deactivated successfully." };
}

module.exports = {
  listPurchasingCenters,
  getPurchasingCenterById,
  createPurchasingCenter,
  updatePurchasingCenter,
  togglePurchasingCenterStatus,
  deletePurchasingCenter,
};
