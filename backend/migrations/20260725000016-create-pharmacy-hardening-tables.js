"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add barcode_identifier to medication_batches
    const batchTable = await queryInterface.describeTable("medication_batches");
    if (!batchTable.barcode_identifier) {
      await queryInterface.addColumn("medication_batches", "barcode_identifier", {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    // 2. Create pharmacy_stock_transfers
    await queryInterface.createTable("pharmacy_stock_transfers", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      source_pharmacy_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      destination_pharmacy_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      medication_batch_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "REQUESTED", // REQUESTED, TRANSIT, RECEIVED, REJECTED
      },
      requested_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      received_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      received_at: {
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

    // 3. Create prescription_refills
    await queryInterface.createTable("prescription_refills", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      prescription_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      refill_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      max_refills: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      dispensed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      dispensed_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "DISPENSED", // AUTHORIZED, DISPENSED, CANCELLED
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("prescription_refills");
    await queryInterface.dropTable("pharmacy_stock_transfers");
    await queryInterface.removeColumn("medication_batches", "barcode_identifier");
  },
};
