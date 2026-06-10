"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("plan_versions", {
      plan_version_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      version_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      status: {
        type: Sequelize.ENUM("draft", "active", "completed"),
        defaultValue: "draft",
        allowNull: false,
      },
      government_structure_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "government_structures",
          key: "government_structure_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      based_on_version_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "plan_versions",
          key: "plan_version_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("plan_versions", {
      unique: true,
      fields: ["year", "version_number", "government_structure_id"],
      name: "plan_versions_year_version_govt_unique",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("plan_versions");
  },
};
