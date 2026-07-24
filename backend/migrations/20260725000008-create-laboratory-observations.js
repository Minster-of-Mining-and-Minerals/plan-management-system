"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables();

    if (!tableExists.includes("laboratory_observations")) {
      await queryInterface.createTable("laboratory_observations", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        result_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "clinical_order_results",
            key: "result_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        order_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "clinical_orders",
            key: "order_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        test_catalog_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "laboratory_test_catalogs",
            key: "test_catalog_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        observation_code: {
          type: Sequelize.STRING(64),
          allowNull: false,
        },
        observation_name: {
          type: Sequelize.STRING(128),
          allowNull: false,
        },
        value: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        numeric_value: {
          type: Sequelize.DECIMAL(12, 4),
          allowNull: true,
        },
        unit: {
          type: Sequelize.STRING(32),
          allowNull: true,
        },
        reference_range: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
        },
        abnormal_flag: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "NORMAL", // NORMAL, LOW, HIGH, CRITICAL_LOW, CRITICAL_HIGH
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "PRELIMINARY", // PRELIMINARY, FINAL, AMENDED
        },
        observed_by: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        verified_by: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        observed_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });

      await queryInterface.addIndex("laboratory_observations", ["result_id"]);
      await queryInterface.addIndex("laboratory_observations", ["order_id"]);
      await queryInterface.addIndex("laboratory_observations", ["observation_code"]);
      await queryInterface.addIndex("laboratory_observations", ["abnormal_flag"]);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("laboratory_observations");
  },
};
