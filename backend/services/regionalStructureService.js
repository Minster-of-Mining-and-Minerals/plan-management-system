"use strict";

const { Op } = require("sequelize");
const { Region, RegionalStructure, User, sequelize } = require("../models");

async function listRegionalStructures(regionId, query = {}) {
  const where = { region_id: regionId };

  if (query.is_active !== undefined && query.is_active !== "") {
    where.is_active = query.is_active === "true" || query.is_active === true;
  }

  const structures = await RegionalStructure.findAll({
    where,
    order: [["level", "ASC"], ["name", "ASC"]],
    include: [
      {
        model: RegionalStructure,
        as: "parent",
        attributes: ["regional_structure_id", "name"],
      },
    ],
  });

  const structureIds = structures.map((s) => s.regional_structure_id);
  const userCounts = new Map();

  if (structureIds.length > 0) {
    const [userRows] = await sequelize.query(`
      SELECT regional_structure_id, COUNT(*) as count 
      FROM users 
      WHERE regional_structure_id IN (:structureIds) AND is_active = true 
      GROUP BY regional_structure_id;
    `, { replacements: { structureIds } });

    for (const row of userRows) {
      userCounts.set(row.regional_structure_id, parseInt(row.count, 10));
    }
  }

  return structures.map((struct) => {
    const plain = struct.toJSON ? struct.toJSON() : { ...struct };
    return {
      ...plain,
      users_count: userCounts.get(plain.regional_structure_id) || 0,
    };
  });
}

async function getRegionalStructureById(structureId) {
  const structure = await RegionalStructure.findByPk(structureId, {
    include: [
      {
        model: Region,
        as: "region",
        attributes: ["region_id", "name", "code"],
      },
      {
        model: RegionalStructure,
        as: "parent",
        attributes: ["regional_structure_id", "name", "level"],
      },
      {
        model: RegionalStructure,
        as: "children",
        attributes: ["regional_structure_id", "name", "level", "is_active"],
      },
      {
        model: User,
        as: "users",
        attributes: ["user_id", "full_name", "email", "phone_number", "is_active"],
      },
    ],
  });

  if (!structure) {
    const error = new Error("Regional department not found.");
    error.status = 404;
    throw error;
  }

  return structure;
}

async function createRegionalStructure(regionId, payload) {
  const { name, parent_id } = payload;

  if (!name || !name.trim()) {
    const error = new Error("Department name is required.");
    error.status = 400;
    throw error;
  }

  // Verify region exists and is active
  const region = await Region.findByPk(regionId);
  if (!region) {
    const error = new Error("Region not found.");
    error.status = 404;
    throw error;
  }

  if (!region.is_active) {
    const error = new Error("Cannot add departments to an inactive region.");
    error.status = 400;
    throw error;
  }

  let calculatedLevel = 1;

  if (parent_id) {
    const parent = await RegionalStructure.findByPk(parent_id);
    if (!parent) {
      const error = new Error("Parent department not found.");
      error.status = 400;
      throw error;
    }

    // MANDATORY ISOLATION RULE: Parent must belong to the exact same region!
    if (parent.region_id !== regionId) {
      const error = new Error(
        "Invalid parent department: parent must belong to the same region. Cross-region and federal parent references are prohibited."
      );
      error.status = 400;
      throw error;
    }

    if (!parent.is_active) {
      const error = new Error("Cannot create a department under an inactive parent.");
      error.status = 400;
      throw error;
    }

    calculatedLevel = (parent.level || 1) + 1;
  }

  // Check unique name under same parent in this region
  const cleanName = name.trim();
  const existing = await RegionalStructure.findOne({
    where: {
      region_id: regionId,
      parent_id: parent_id || null,
      name: { [Op.iLike]: cleanName },
    },
  });

  if (existing) {
    const error = new Error(
      `A department named '${cleanName}' already exists under this parent level in ${region.name}.`
    );
    error.status = 400;
    throw error;
  }

  const created = await RegionalStructure.create({
    region_id: regionId,
    parent_id: parent_id || null,
    name: cleanName,
    level: calculatedLevel,
    is_active: true,
  });

  return getRegionalStructureById(created.regional_structure_id);
}

async function updateRegionalStructure(structureId, payload) {
  const structure = await RegionalStructure.findByPk(structureId);
  if (!structure) {
    const error = new Error("Regional department not found.");
    error.status = 404;
    throw error;
  }

  const { name, parent_id, is_active } = payload;
  const updates = {};

  if (parent_id !== undefined) {
    if (parent_id === structureId) {
      const error = new Error("A department cannot be its own parent.");
      error.status = 400;
      throw error;
    }

    if (parent_id) {
      const parent = await RegionalStructure.findByPk(parent_id);
      if (!parent) {
        const error = new Error("Parent department not found.");
        error.status = 400;
        throw error;
      }

      if (parent.region_id !== structure.region_id) {
        const error = new Error(
          "Parent department must belong to the same region. Cross-region relationships are forbidden."
        );
        error.status = 400;
        throw error;
      }

      // Check circular reference
      let ancestor = parent;
      while (ancestor.parent_id) {
        if (ancestor.parent_id === structureId) {
          const error = new Error("Circular department hierarchy detected.");
          error.status = 400;
          throw error;
        }
        ancestor = await RegionalStructure.findByPk(ancestor.parent_id);
        if (!ancestor) break;
      }

      updates.parent_id = parent_id;
      updates.level = (parent.level || 1) + 1;
    } else {
      updates.parent_id = null;
      updates.level = 1;
    }
  }

  if (name !== undefined) {
    const cleanName = name.trim();
    if (!cleanName) {
      const error = new Error("Department name cannot be empty.");
      error.status = 400;
      throw error;
    }

    const checkParent = updates.parent_id !== undefined ? updates.parent_id : structure.parent_id;
    const duplicate = await RegionalStructure.findOne({
      where: {
        region_id: structure.region_id,
        parent_id: checkParent || null,
        name: { [Op.iLike]: cleanName },
        regional_structure_id: { [Op.ne]: structureId },
      },
    });

    if (duplicate) {
      const error = new Error(`A department named '${cleanName}' already exists under this level.`);
      error.status = 400;
      throw error;
    }

    updates.name = cleanName;
  }

  if (is_active !== undefined) {
    updates.is_active = Boolean(is_active);
  }

  await structure.update(updates);
  return getRegionalStructureById(structureId);
}

async function deleteRegionalStructure(structureId) {
  const structure = await RegionalStructure.findByPk(structureId);
  if (!structure) {
    const error = new Error("Regional department not found.");
    error.status = 404;
    throw error;
  }

  // Check if active children exist
  const childrenCount = await RegionalStructure.count({
    where: { parent_id: structureId },
  });
  if (childrenCount > 0) {
    const error = new Error(
      `Cannot delete department '${structure.name}' because it has ${childrenCount} child department(s). Delete or reassign child departments first.`
    );
    error.status = 400;
    throw error;
  }

  // Check if users are assigned to this department
  const userCount = await User.count({
    where: { regional_structure_id: structureId },
  });
  if (userCount > 0) {
    const error = new Error(
      `Cannot delete department '${structure.name}' because it has ${userCount} assigned user(s). Reassign them first.`
    );
    error.status = 400;
    throw error;
  }

  await structure.destroy();
  return { success: true, message: `Department '${structure.name}' deleted successfully.` };
}

async function assignUsersToRegionalStructure(structureId, userIds = []) {
  const structure = await RegionalStructure.findByPk(structureId);
  if (!structure) {
    const error = new Error("Regional department not found.");
    error.status = 404;
    throw error;
  }

  if (!Array.isArray(userIds) || userIds.length === 0) {
    const error = new Error("userIds array is required.");
    error.status = 400;
    throw error;
  }

  const users = await User.findAll({
    where: { user_id: { [Op.in]: userIds } },
  });

  if (users.length !== userIds.length) {
    const error = new Error("One or more user IDs could not be found.");
    error.status = 400;
    throw error;
  }

  // MANDATORY ACCOUNT-DOMAIN ISOLATION:
  // Every user assigned to a regional department MUST belong to the EXACT same region!
  for (const user of users) {
    if (user.government_structure_id) {
      const error = new Error(
        `User '${user.full_name}' is a federal user and cannot be assigned to a regional department.`
      );
      error.status = 400;
      throw error;
    }

    if (!user.region_id || user.region_id !== structure.region_id) {
      const error = new Error(
        `User '${user.full_name}' belongs to a different domain or region than this department.`
      );
      error.status = 400;
      throw error;
    }
  }

  await User.update(
    { regional_structure_id: structureId },
    { where: { user_id: { [Op.in]: userIds } } }
  );

  return getRegionalStructureById(structureId);
}

async function removeUserFromRegionalStructure(structureId, userId) {
  const user = await User.findOne({
    where: { user_id: userId, regional_structure_id: structureId },
  });

  if (!user) {
    const error = new Error("User is not assigned to this department.");
    error.status = 404;
    throw error;
  }

  await user.update({ regional_structure_id: null });
  return { success: true, message: "User removed from department." };
}

module.exports = {
  listRegionalStructures,
  getRegionalStructureById,
  createRegionalStructure,
  updateRegionalStructure,
  deleteRegionalStructure,
  assignUsersToRegionalStructure,
  removeUserFromRegionalStructure,
};
