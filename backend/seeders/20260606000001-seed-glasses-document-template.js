"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  GLASSES_PRESCRIPTION_DOCUMENT_HTML,
} = require("../config/glassesPrescriptionDocumentTemplate");

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const [existing] = await queryInterface.sequelize.query(
      `SELECT document_template_id FROM prescription_document_templates WHERE code = 'glasses_rx' LIMIT 1`
    );
    if (existing.length) {
      await queryInterface.sequelize.query(
        `UPDATE prescription_document_templates
         SET html_content = :html, name = :name, status = 'active', updated_at = :now
         WHERE code = 'glasses_rx'`,
        {
          replacements: {
            html: GLASSES_PRESCRIPTION_DOCUMENT_HTML,
            name: "Glasses / Ophthalmic Prescription",
            now,
          },
        }
      );
    } else {
      const [glassesCategory] = await queryInterface.sequelize.query(
        `SELECT category_id FROM prescription_categories WHERE code = 'glasses' LIMIT 1`
      );
      const categoryId = glassesCategory[0]?.category_id || null;

      await queryInterface.bulkInsert("prescription_document_templates", [
        {
          document_template_id: uuidv4(),
          name: "Glasses / Ophthalmic Prescription",
          code: "glasses_rx",
          category_id: categoryId,
          html_content: GLASSES_PRESCRIPTION_DOCUMENT_HTML,
          is_default: false,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const [glassesCategory] = await queryInterface.sequelize.query(
      `SELECT category_id FROM prescription_categories WHERE code = 'glasses' LIMIT 1`
    );
    if (glassesCategory.length) {
      await queryInterface.sequelize.query(
        `UPDATE prescription_document_templates
         SET is_default = false, updated_at = :now
         WHERE category_id = :categoryId AND code != 'glasses_rx'`,
        { replacements: { now, categoryId: glassesCategory[0].category_id } }
      );
      await queryInterface.sequelize.query(
        `UPDATE prescription_document_templates
         SET is_default = true, category_id = :categoryId, updated_at = :now
         WHERE code = 'glasses_rx'`,
        { replacements: { now, categoryId: glassesCategory[0].category_id } }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `UPDATE prescription_document_templates SET status = 'inactive' WHERE code = 'glasses_rx'`
    );
  },
};
