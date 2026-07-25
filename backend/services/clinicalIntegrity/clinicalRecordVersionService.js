"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../../models");

class ClinicalRecordVersionService {
  /**
   * Save immutable snapshot version of a clinical record.
   */
  async createRecordVersion({ entity_type, entity_id, snapshot_data, changed_by, change_reason }) {
    if (!entity_type || !entity_id || !snapshot_data || !changed_by) {
      const err = new Error("entity_type, entity_id, snapshot_data, and changed_by are required");
      err.status = 400;
      throw err;
    }

    const previousCount = await db.ClinicalRecordVersion.count({
      where: { entity_type, entity_id },
    });

    const nextVersion = previousCount + 1;

    const version = await db.ClinicalRecordVersion.create({
      id: uuidv4(),
      entity_type,
      entity_id,
      version_number: nextVersion,
      snapshot_json: snapshot_data,
      changed_by,
      change_reason: change_reason || null,
    });

    return version.get({ plain: true });
  }

  /**
   * Retrieve immutable version history for a clinical record.
   */
  async getRecordVersions(entity_type, entity_id) {
    const versions = await db.ClinicalRecordVersion.findAll({
      where: { entity_type, entity_id },
      include: [{ model: db.User, as: "modifier", attributes: ["user_id", "full_name"] }],
      order: [["version_number", "DESC"]],
    });

    return versions.map((v) => v.get({ plain: true }));
  }
}

module.exports = new ClinicalRecordVersionService();
