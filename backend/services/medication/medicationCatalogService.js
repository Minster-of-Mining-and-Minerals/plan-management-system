"use strict";

const { Op } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const db = require("../../models");

class MedicationCatalogService {
  /**
   * Search medication catalog by query string.
   */
  async searchMedications(query = "", limit = 20) {
    const where = { active: true };
    if (query && query.trim().length > 0) {
      const q = `%${query.trim().toLowerCase()}%`;
      where[Op.or] = [
        db.Sequelize.where(db.Sequelize.fn("LOWER", db.Sequelize.col("generic_name")), { [Op.like]: q }),
        db.Sequelize.where(db.Sequelize.fn("LOWER", db.Sequelize.col("brand_name")), { [Op.like]: q }),
        db.Sequelize.where(db.Sequelize.fn("LOWER", db.Sequelize.col("medication_code")), { [Op.like]: q }),
      ];
    }

    const items = await db.MedicationCatalog.findAll({
      where,
      limit: parseInt(limit, 10) || 20,
      order: [["generic_name", "ASC"]],
    });

    return items.map((i) => i.get({ plain: true }));
  }

  /**
   * Create or seed a medication catalog entry.
   */
  async createMedication(data) {
    if (!data.generic_name) {
      const err = new Error("generic_name is required");
      err.status = 400;
      throw err;
    }

    const existing = await db.MedicationCatalog.findOne({
      where: {
        generic_name: db.Sequelize.where(
          db.Sequelize.fn("LOWER", db.Sequelize.col("generic_name")),
          data.generic_name.trim().toLowerCase()
        ),
      },
    });

    if (existing) {
      return existing.get({ plain: true });
    }

    const item = await db.MedicationCatalog.create({
      id: uuidv4(),
      generic_name: data.generic_name.trim(),
      brand_name: data.brand_name ? data.brand_name.trim() : null,
      medication_code: data.medication_code || `MED-${uuidv4().slice(0, 8).toUpperCase()}`,
      dosage_form: data.dosage_form || "Tablet",
      strength: data.strength || "500mg",
      route: data.route || "Oral",
      manufacturer: data.manufacturer || "Generic Pharma",
      controlled_status: data.controlled_status || "UNCONTROLLED",
      active: data.active !== undefined ? data.active : true,
    });

    return item.get({ plain: true });
  }
}

module.exports = new MedicationCatalogService();
