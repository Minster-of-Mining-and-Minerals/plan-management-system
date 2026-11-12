"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add annual_target to national_reporting_assignments
    const assignTable = await queryInterface.describeTable("national_reporting_assignments");
    if (!assignTable.annual_target) {
      await queryInterface.addColumn("national_reporting_assignments", "annual_target", {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    }

    // 2. Create national_reporting_custom_categories table
    await queryInterface.createTable("national_reporting_custom_categories", {
      category_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      code: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      label: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      icon: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: "📊",
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      mandate_level: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "mandatory_default",
      },
      frequency_default: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "monthly",
      },
      typical_units: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
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

    // 3. Create national_reporting_custom_units table
    await queryInterface.createTable("national_reporting_custom_units", {
      unit_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      unit_code: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      label: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      base_unit: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      multiplier: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 1.0,
      },
      is_base: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
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
  },

  async down(queryInterface) {
    const assignTable = await queryInterface.describeTable("national_reporting_assignments");
    if (assignTable.annual_target) {
      await queryInterface.removeColumn("national_reporting_assignments", "annual_target");
    }
    await queryInterface.dropTable("national_reporting_custom_units");
    await queryInterface.dropTable("national_reporting_custom_categories");
  },
};

