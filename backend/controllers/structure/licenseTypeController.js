"use strict";

const { LicenseType, CompanyLicense } = require("../../models");
const { Op } = require("sequelize");

async function listLicenseTypes(req, res) {
  try {
    const where = {};
    if (req.query.is_active !== undefined) {
      where.is_active = req.query.is_active === "true" || req.query.is_active === true;
    }

    const types = await LicenseType.findAll({
      where,
      order: [["name", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      data: types,
    });
  } catch (err) {
    console.error("Error listing license types:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getLicenseTypeById(req, res) {
  try {
    const { id } = req.params;
    const type = await LicenseType.findByPk(id);
    if (!type) {
      return res.status(404).json({ success: false, message: "License type not found." });
    }
    return res.status(200).json({ success: true, data: type });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function createLicenseType(req, res) {
  try {
    const { name, code, description, is_active } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: "Code is required." });
    }

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    const existing = await LicenseType.findOne({
      where: {
        [Op.or]: [{ code: cleanCode }, { name: { [Op.iLike]: cleanName } }],
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: existing.code === cleanCode
          ? `License type with code '${cleanCode}' already exists.`
          : `License type with name '${cleanName}' already exists.`,
      });
    }

    const type = await LicenseType.create({
      name: cleanName,
      code: cleanCode,
      description: description ? description.trim() : null,
      is_active: is_active !== undefined ? Boolean(is_active) : true,
    });

    return res.status(201).json({ success: true, data: type });
  } catch (err) {
    console.error("Error creating license type:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function updateLicenseType(req, res) {
  try {
    const { id } = req.params;
    const type = await LicenseType.findByPk(id);
    if (!type) {
      return res.status(404).json({ success: false, message: "License type not found." });
    }

    const { name, code, description, is_active } = req.body;
    const updates = {};

    if (name !== undefined) {
      const cleanName = name.trim();
      if (!cleanName) {
        return res.status(400).json({ success: false, message: "Name cannot be empty." });
      }
      const existing = await LicenseType.findOne({
        where: {
          name: { [Op.iLike]: cleanName },
          license_type_id: { [Op.ne]: id },
        },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: `Name '${cleanName}' is already in use.` });
      }
      updates.name = cleanName;
    }

    if (code !== undefined) {
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) {
        return res.status(400).json({ success: false, message: "Code cannot be empty." });
      }
      const existing = await LicenseType.findOne({
        where: {
          code: cleanCode,
          license_type_id: { [Op.ne]: id },
        },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: `Code '${cleanCode}' is already in use.` });
      }
      updates.code = cleanCode;
    }

    if (description !== undefined) {
      updates.description = description ? description.trim() : null;
    }

    if (is_active !== undefined) {
      updates.is_active = Boolean(is_active);
    }

    await type.update(updates);
    return res.status(200).json({ success: true, data: type });
  } catch (err) {
    console.error("Error updating license type:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteLicenseType(req, res) {
  try {
    const { id } = req.params;
    const type = await LicenseType.findByPk(id);
    if (!type) {
      return res.status(404).json({ success: false, message: "License type not found." });
    }

    const assignedCount = await CompanyLicense.count({
      where: { license_type_id: id },
    });

    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete license type because it is associated with ${assignedCount} active licenses. Deactivate it instead.`,
      });
    }

    await type.destroy();
    return res.status(200).json({ success: true, message: "License type deleted successfully." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  listLicenseTypes,
  getLicenseTypeById,
  createLicenseType,
  updateLicenseType,
  deleteLicenseType,
};
