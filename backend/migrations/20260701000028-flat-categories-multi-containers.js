"use strict";

const {
  addColumnIfNotExists,
  removeColumnIfExists,
  dropIndexIfExists,
} = require("./helpers/schemaHelpers");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await dropIndexIfExists(queryInterface, "form_config_containers", "uq_form_config_containers_category");

    await queryInterface.sequelize.query(`
      UPDATE issue_categories
      SET parent_category_id = NULL
      WHERE parent_category_id IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE issue_categories
      SET is_active = false
      WHERE is_selectable = false
    `);

    await queryInterface.sequelize.query(`
      UPDATE issue_categories
      SET is_selectable = true
      WHERE is_active = true
    `);

    await removeColumnIfExists(queryInterface, "issue_categories", "form_config_container_id");

    await addColumnIfNotExists(queryInterface, "issues", "form_config_container_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "form_config_containers",
        key: "form_config_container_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.sequelize.query(`
      DELETE FROM form_config_containers WHERE issue_category_id IS NULL
    `);

    await queryInterface.changeColumn("form_config_containers", "issue_category_id", {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: "issue_categories",
        key: "issue_category_id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },

  async down(queryInterface, Sequelize) {
    await removeColumnIfExists(queryInterface, "issues", "form_config_container_id");

    await addColumnIfNotExists(queryInterface, "issue_categories", "form_config_container_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "form_config_containers",
        key: "form_config_container_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.changeColumn("form_config_containers", "issue_category_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "issue_categories",
        key: "issue_category_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_form_config_containers_category
      ON form_config_containers (issue_category_id)
      WHERE issue_category_id IS NOT NULL
    `);
  },
};
