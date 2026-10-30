"use strict";

const { Op } = require("sequelize");
const { Company, CompanyStructure, CompanyBrandingSetting, User, sequelize } = require("../models");
const companyPlanService = require("./companyPlanService");

async function listCompanies(query = {}) {
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

  const companies = await Company.findAll({
    where,
    order: [["name", "ASC"]],
    include: [
      {
        model: CompanyBrandingSetting,
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

  const companyIds = companies.map((c) => c.company_id);
  let structureCounts = new Map();
  let userCounts = new Map();

  if (companyIds.length > 0) {
    const [structRows] = await sequelize.query(`
      SELECT company_id, COUNT(*) as count 
      FROM company_structures 
      WHERE company_id IN (:companyIds) AND deleted_at IS NULL 
      GROUP BY company_id;
    `, { replacements: { companyIds } });

    for (const row of structRows) {
      structureCounts.set(row.company_id, parseInt(row.count, 10));
    }

    const [userRows] = await sequelize.query(`
      SELECT company_id, COUNT(*) as count 
      FROM users 
      WHERE company_id IN (:companyIds) AND is_active = true 
      GROUP BY company_id;
    `, { replacements: { companyIds } });

    for (const row of userRows) {
      userCounts.set(row.company_id, parseInt(row.count, 10));
    }
  }

  return companies.map((company) => {
    const plain = company.toJSON ? company.toJSON() : { ...company };
    return {
      ...plain,
      structures_count: structureCounts.get(plain.company_id) || 0,
      active_users_count: userCounts.get(plain.company_id) || 0,
    };
  });
}

async function getCompanyById(companyId) {
  const company = await Company.findByPk(companyId, {
    include: [
      {
        model: CompanyBrandingSetting,
        as: "branding",
      },
      {
        model: CompanyStructure,
        as: "structures",
        where: { is_active: true },
        required: false,
      },
    ],
  });

  if (!company) {
    const error = new Error("Company not found.");
    error.status = 404;
    throw error;
  }

  const plain = company.toJSON ? company.toJSON() : { ...company };
  const userCount = await User.count({
    where: { company_id: companyId, is_active: true },
  });

  return {
    ...plain,
    active_users_count: userCount,
  };
}

async function createCompany(payload) {
  const { name, code, description, logo_path } = payload;

  if (!name || !name.trim()) {
    const error = new Error("Company name is required.");
    error.status = 400;
    throw error;
  }

  if (!code || !code.trim()) {
    const error = new Error("Company code is required.");
    error.status = 400;
    throw error;
  }

  const cleanCode = code.trim().toUpperCase();
  const cleanName = name.trim();

  // Check unique code and name
  const existing = await Company.findOne({
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
        ? `A company with code '${cleanCode}' already exists.`
        : `A company with name '${cleanName}' already exists.`
    );
    error.status = 400;
    throw error;
  }

  const t = await sequelize.transaction();
  try {
    const company = await Company.create(
      {
        name: cleanName,
        code: cleanCode,
        description: description?.trim() || null,
        logo_path: logo_path || null,
        is_active: true,
      },
      { transaction: t }
    );

    // Seed default company branding for this company
    await CompanyBrandingSetting.create(
      {
        company_id: company.company_id,
        system_name_full: `${cleanName} Mining Corporation`,
        system_name_short: `${cleanCode} PMS`,
        system_tagline: `Operational Planning and Production Management — ${cleanName}`,
        logo_primary_path: logo_path || "/logo-only.png",
        primary_color: "#0F766E",
        secondary_color: "#64748B",
        accent_color: "#D97706",
      },
      { transaction: t }
    );

    // Initialize domain-isolated company planning defaults (plan rule, config)
    await companyPlanService.initializeCompanyPlanningDefaults(company.company_id, t);

    await t.commit();
    return getCompanyById(company.company_id);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function updateCompany(companyId, payload) {
  const company = await Company.findByPk(companyId);
  if (!company) {
    const error = new Error("Company not found.");
    error.status = 404;
    throw error;
  }

  const { name, code, description, logo_path, is_active } = payload;
  const updates = {};

  if (name !== undefined) {
    const cleanName = name.trim();
    if (!cleanName) {
      const error = new Error("Company name cannot be empty.");
      error.status = 400;
      throw error;
    }
    if (cleanName.toLowerCase() !== company.name.toLowerCase()) {
      const existingName = await Company.findOne({
        where: {
          name: { [Op.iLike]: cleanName },
          company_id: { [Op.ne]: companyId },
        },
      });
      if (existingName) {
        const error = new Error(`A company with name '${cleanName}' already exists.`);
        error.status = 400;
        throw error;
      }
    }
    updates.name = cleanName;
  }

  if (code !== undefined) {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      const error = new Error("Company code cannot be empty.");
      error.status = 400;
      throw error;
    }
    if (cleanCode !== company.code) {
      const existingCode = await Company.findOne({
        where: {
          code: cleanCode,
          company_id: { [Op.ne]: companyId },
        },
      });
      if (existingCode) {
        const error = new Error(`A company with code '${cleanCode}' already exists.`);
        error.status = 400;
        throw error;
      }
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

  await company.update(updates);
  return getCompanyById(companyId);
}

async function toggleCompanyStatus(companyId, isActive) {
  const company = await Company.findByPk(companyId);
  if (!company) {
    const error = new Error("Company not found.");
    error.status = 404;
    throw error;
  }

  await company.update({ is_active: Boolean(isActive) });
  return getCompanyById(companyId);
}

async function deleteCompany(companyId) {
  const company = await Company.findByPk(companyId);
  if (!company) {
    const error = new Error("Company not found.");
    error.status = 404;
    throw error;
  }

  // Paranoid soft delete preserves all accounts, structures, branding
  await company.destroy();
  return { success: true, message: "Company soft-deleted successfully." };
}

module.exports = {
  listCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  toggleCompanyStatus,
  deleteCompany,
};
