"use strict";

const { Op } = require("sequelize");
const { Company, CompanyStructure, User, sequelize } = require("../models");

async function listCompanyStructures(companyId, query = {}) {
  const where = { company_id: companyId };

  if (query.is_active !== undefined && query.is_active !== "") {
    where.is_active = query.is_active === "true" || query.is_active === true;
  }

  const structures = await CompanyStructure.findAll({
    where,
    order: [["level", "ASC"], ["name", "ASC"]],
    include: [
      {
        model: CompanyStructure,
        as: "parent",
        attributes: ["company_structure_id", "name"],
      },
    ],
  });

  const structureIds = structures.map((s) => s.company_structure_id);
  const userCounts = new Map();

  if (structureIds.length > 0) {
    const [userRows] = await sequelize.query(`
      SELECT company_structure_id, COUNT(*) as count 
      FROM users 
      WHERE company_structure_id IN (:structureIds) AND is_active = true 
      GROUP BY company_structure_id;
    `, { replacements: { structureIds } });

    for (const row of userRows) {
      userCounts.set(row.company_structure_id, parseInt(row.count, 10));
    }
  }

  return structures.map((struct) => {
    const plain = struct.toJSON ? struct.toJSON() : { ...struct };
    return {
      ...plain,
      users_count: userCounts.get(plain.company_structure_id) || 0,
    };
  });
}

async function getCompanyStructureById(structureId) {
  const structure = await CompanyStructure.findByPk(structureId, {
    include: [
      {
        model: Company,
        as: "company",
        attributes: ["company_id", "name", "code"],
      },
      {
        model: CompanyStructure,
        as: "parent",
        attributes: ["company_structure_id", "name", "level"],
      },
      {
        model: CompanyStructure,
        as: "children",
        attributes: ["company_structure_id", "name", "level", "is_active"],
      },
      {
        model: User,
        as: "users",
        attributes: ["user_id", "full_name", "email", "phone_number", "is_active"],
      },
    ],
  });

  if (!structure) {
    const error = new Error("Company department not found.");
    error.status = 404;
    throw error;
  }

  return structure;
}

async function createCompanyStructure(companyId, payload) {
  const { name, parent_id } = payload;

  if (!name || !name.trim()) {
    const error = new Error("Department name is required.");
    error.status = 400;
    throw error;
  }

  // Verify company exists and is active
  const company = await Company.findByPk(companyId);
  if (!company) {
    const error = new Error("Company not found.");
    error.status = 404;
    throw error;
  }

  if (!company.is_active) {
    const error = new Error("Cannot add departments to an inactive company.");
    error.status = 400;
    throw error;
  }

  let calculatedLevel = 1;

  if (parent_id) {
    const parent = await CompanyStructure.findByPk(parent_id);
    if (!parent) {
      const error = new Error("Parent department not found.");
      error.status = 400;
      throw error;
    }

    // MANDATORY ISOLATION RULE: Parent must belong to the exact same company!
    if (parent.company_id !== companyId) {
      const error = new Error(
        "Invalid parent department: parent must belong to the same company. Cross-company, regional, and federal parent references are prohibited."
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

  // Check unique name under same parent in this company
  const cleanName = name.trim();
  const existing = await CompanyStructure.findOne({
    where: {
      company_id: companyId,
      parent_id: parent_id || null,
      name: { [Op.iLike]: cleanName },
    },
  });

  if (existing) {
    const error = new Error(
      `A department named '${cleanName}' already exists under this parent level in ${company.name}.`
    );
    error.status = 400;
    throw error;
  }

  const created = await CompanyStructure.create({
    company_id: companyId,
    parent_id: parent_id || null,
    name: cleanName,
    level: calculatedLevel,
    is_active: true,
  });

  return getCompanyStructureById(created.company_structure_id);
}

async function updateCompanyStructure(structureId, payload) {
  const structure = await CompanyStructure.findByPk(structureId);
  if (!structure) {
    const error = new Error("Company department not found.");
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
      const parent = await CompanyStructure.findByPk(parent_id);
      if (!parent) {
        const error = new Error("Parent department not found.");
        error.status = 400;
        throw error;
      }

      if (parent.company_id !== structure.company_id) {
        const error = new Error(
          "Parent department must belong to the same company. Cross-company relationships are forbidden."
        );
        error.status = 400;
        throw error;
      }

      // Check circular reference: ensure parent is not a descendant of this structure
      let ancestor = parent;
      while (ancestor && ancestor.parent_id) {
        if (ancestor.parent_id === structureId) {
          const error = new Error("Circular parent relationship detected. A department cannot have its own descendant as parent.");
          error.status = 400;
          throw error;
        }
        ancestor = await CompanyStructure.findByPk(ancestor.parent_id);
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

    const checkParentId = updates.parent_id !== undefined ? updates.parent_id : structure.parent_id;
    const existing = await CompanyStructure.findOne({
      where: {
        company_id: structure.company_id,
        parent_id: checkParentId || null,
        name: { [Op.iLike]: cleanName },
        company_structure_id: { [Op.ne]: structureId },
      },
    });

    if (existing) {
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

  // If level changed, update child levels
  if (updates.level !== undefined && updates.level !== structure.level) {
    await recalculateDescendantLevels(structure.company_structure_id, updates.level);
  }

  return getCompanyStructureById(structureId);
}

async function recalculateDescendantLevels(parentId, parentLevel) {
  const children = await CompanyStructure.findAll({
    where: { parent_id: parentId },
  });

  for (const child of children) {
    const childLevel = parentLevel + 1;
    await child.update({ level: childLevel });
    await recalculateDescendantLevels(child.company_structure_id, childLevel);
  }
}

async function deleteCompanyStructure(structureId) {
  const structure = await CompanyStructure.findByPk(structureId);
  if (!structure) {
    const error = new Error("Company department not found.");
    error.status = 404;
    throw error;
  }

  // Check if active children exist
  const childCount = await CompanyStructure.count({
    where: { parent_id: structureId },
  });
  if (childCount > 0) {
    const error = new Error("Cannot delete department because subordinate departments exist. Reassign or delete them first.");
    error.status = 400;
    throw error;
  }

  // Check if users are assigned
  const userCount = await User.count({
    where: { company_structure_id: structureId, is_active: true },
  });
  if (userCount > 0) {
    const error = new Error("Cannot delete department because active users are currently assigned to it.");
    error.status = 400;
    throw error;
  }

  await structure.destroy();
  return { success: true, message: "Department deleted successfully." };
}

module.exports = {
  listCompanyStructures,
  getCompanyStructureById,
  createCompanyStructure,
  updateCompanyStructure,
  deleteCompanyStructure,
};
