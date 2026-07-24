"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables();

    if (!tableExists.includes("laboratory_work_queue_items")) {
      await queryInterface.createTable("laboratory_work_queue_items", {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        specimen_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "laboratory_specimens",
            key: "specimen_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
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
        queue_type: {
          type: Sequelize.STRING(32),
          allowNull: false, // COLLECTION, RECEPTION, PROCESSING, RESULT_ENTRY, VERIFICATION
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "WAITING", // WAITING, CLAIMED, IN_PROGRESS, COMPLETED, CANCELLED
        },
        priority: {
          type: Sequelize.STRING(16),
          allowNull: false,
          defaultValue: "ROUTINE", // STAT, URGENT, ROUTINE
        },
        assigned_staff_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        department_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "departments",
            key: "department_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        entered_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        claimed_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        completed_at: {
          type: Sequelize.DATE,
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

      await queryInterface.addIndex("laboratory_work_queue_items", ["queue_type"]);
      await queryInterface.addIndex("laboratory_work_queue_items", ["status"]);
      await queryInterface.addIndex("laboratory_work_queue_items", ["department_id"]);
      await queryInterface.addIndex("laboratory_work_queue_items", ["priority"]);
      await queryInterface.addIndex("laboratory_work_queue_items", ["created_at"]);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("laboratory_work_queue_items");
  },
};
