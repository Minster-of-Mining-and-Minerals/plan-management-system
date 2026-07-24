"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables();
    if (tableExists.includes("clinical_order_result_histories")) {
      return;
    }

    await queryInterface.createTable("clinical_order_result_histories", {
      history_id: {
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
      previous_summary: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      previous_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      new_summary: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      new_data: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      changed_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false,
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

    await queryInterface.addIndex("clinical_order_result_histories", ["result_id"]);
    await queryInterface.addIndex("clinical_order_result_histories", ["changed_by"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("clinical_order_result_histories");
  },
};
