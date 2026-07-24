"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables();

    // 1. Create laboratory_specimen_status_histories
    if (!tableExists.includes("laboratory_specimen_status_histories")) {
      await queryInterface.createTable("laboratory_specimen_status_histories", {
        specimen_status_history_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        specimen_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "laboratory_specimens",
            key: "specimen_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        previous_status: {
          type: Sequelize.STRING(32),
          allowNull: true,
        },
        new_status: {
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
        reason: {
          type: Sequelize.TEXT,
          allowNull: true,
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

      await queryInterface.addIndex("laboratory_specimen_status_histories", ["specimen_id"]);
    }

    // 2. Create laboratory_specimen_collections
    if (!tableExists.includes("laboratory_specimen_collections")) {
      await queryInterface.createTable("laboratory_specimen_collections", {
        collection_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        specimen_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "laboratory_specimens",
            key: "specimen_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        collected_by: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        collection_time: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        collection_site: {
          type: Sequelize.STRING(128),
          allowNull: true,
        },
        collector_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
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

      await queryInterface.addIndex("laboratory_specimen_collections", ["specimen_id"]);
    }

    // 3. Add parent_specimen_id to laboratory_specimens
    const specimenTableDescription = await queryInterface.describeTable("laboratory_specimens");
    if (!specimenTableDescription.parent_specimen_id) {
      await queryInterface.addColumn("laboratory_specimens", "parent_specimen_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "laboratory_specimens",
          key: "specimen_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
  },

  async down(queryInterface) {
    const specimenTableDescription = await queryInterface.describeTable("laboratory_specimens");
    if (specimenTableDescription.parent_specimen_id) {
      await queryInterface.removeColumn("laboratory_specimens", "parent_specimen_id");
    }

    await queryInterface.dropTable("laboratory_specimen_collections");
    await queryInterface.dropTable("laboratory_specimen_status_histories");
  },
};
