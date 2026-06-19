"use strict";

const { removeColumnIfExists, addColumnIfNotExists } = require("./helpers/schemaHelpers");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("issues", "issue_priority_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "issue_priorities", key: "issue_priority_id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    await queryInterface.changeColumn("issues", "entity_type", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.changeColumn("issues", "entity_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.changeColumn("issues", "justification", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("issues", "issue_priority_id", {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: "issue_priorities", key: "issue_priority_id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    await queryInterface.changeColumn("issues", "entity_type", {
      type: Sequelize.STRING(100),
      allowNull: false,
    });

    await queryInterface.changeColumn("issues", "entity_id", {
      type: Sequelize.UUID,
      allowNull: false,
    });

    await queryInterface.changeColumn("issues", "justification", {
      type: Sequelize.TEXT,
      allowNull: false,
    });
  },
};
