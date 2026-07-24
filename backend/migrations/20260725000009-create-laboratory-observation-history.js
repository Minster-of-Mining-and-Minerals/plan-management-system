"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables();

    if (!tableExists.includes("laboratory_observation_histories")) {
      await queryInterface.createTable("laboratory_observation_histories", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        observation_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "laboratory_observations",
            key: "id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        previous_value: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        previous_unit: {
          type: Sequelize.STRING(32),
          allowNull: true,
        },
        previous_flag: {
          type: Sequelize.STRING(32),
          allowNull: false,
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
        change_reason: {
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

      await queryInterface.addIndex("laboratory_observation_histories", ["observation_id"]);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("laboratory_observation_histories");
  },
};
