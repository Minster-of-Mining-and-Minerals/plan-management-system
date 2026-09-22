"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Add missing columns to sync with the model
      await queryInterface.addColumn(
        "prescriptions",
        "category_id",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "prescription_categories",
            key: "category_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "prescriptions",
        "document_template_id",
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "prescription_document_templates",
            key: "document_template_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "prescriptions",
        "header_title",
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "prescriptions",
        "signature_type",
        {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "template",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "prescriptions",
        "rendered_html",
        {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "prescriptions",
        "issued_at",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "prescriptions",
        "workflow_log_id",
        {
          type: Sequelize.UUID,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "prescriptions",
        "created_by",
        {
          type: Sequelize.UUID,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "prescriptions",
        "updated_by",
        {
          type: Sequelize.UUID,
          allowNull: true,
        },
        { transaction }
      );

      // Remove obsolete columns if they exist
      const tableDescription = await queryInterface.describeTable("prescriptions", { transaction });

      if (tableDescription.prescription_number) {
        await queryInterface.removeColumn("prescriptions", "prescription_number", { transaction });
      }
      if (tableDescription.valid_until) {
        await queryInterface.removeColumn("prescriptions", "valid_until", { transaction });
      }
      if (tableDescription.diagnosis_id) {
        await queryInterface.removeColumn("prescriptions", "diagnosis_id", { transaction });
      }
      if (tableDescription.metadata) {
        await queryInterface.removeColumn("prescriptions", "metadata", { transaction });
      }
      if (tableDescription.signature_snapshot) {
        await queryInterface.removeColumn("prescriptions", "signature_snapshot", { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Re-add removed columns (making them nullable to prevent errors)
      await queryInterface.addColumn(
        "prescriptions",
        "prescription_number",
        {
          type: Sequelize.STRING(64),
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "prescriptions",
        "valid_until",
        {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "prescriptions",
        "diagnosis_id",
        {
          type: Sequelize.UUID,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "prescriptions",
        "metadata",
        {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "prescriptions",
        "signature_snapshot",
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        { transaction }
      );

      // Remove added columns
      await queryInterface.removeColumn("prescriptions", "category_id", { transaction });
      await queryInterface.removeColumn("prescriptions", "document_template_id", { transaction });
      await queryInterface.removeColumn("prescriptions", "header_title", { transaction });
      await queryInterface.removeColumn("prescriptions", "signature_type", { transaction });
      await queryInterface.removeColumn("prescriptions", "rendered_html", { transaction });
      await queryInterface.removeColumn("prescriptions", "issued_at", { transaction });
      await queryInterface.removeColumn("prescriptions", "workflow_log_id", { transaction });
      await queryInterface.removeColumn("prescriptions", "created_by", { transaction });
      await queryInterface.removeColumn("prescriptions", "updated_by", { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
