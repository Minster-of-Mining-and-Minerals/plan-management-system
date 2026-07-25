"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create pharmacy_warehouses
    await queryInterface.createTable("pharmacy_warehouses", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      pharmacy_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      warehouse_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "ACTIVE",
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

    // 2. Create medication_batches
    await queryInterface.createTable("medication_batches", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      pharmacy_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      warehouse_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      medication_catalog_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      batch_number: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      manufacturer: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      manufacture_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      expiry_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      quantity_received: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      quantity_available: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      unit_cost: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      selling_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "ACTIVE", // ACTIVE, EXPIRED, QUARANTINED, DEPLETED
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

    // 3. Create pharmacy_stock_transactions
    await queryInterface.createTable("pharmacy_stock_transactions", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      pharmacy_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      warehouse_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      medication_batch_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      transaction_type: {
        type: Sequelize.STRING(50),
        allowNull: false, // PURCHASE_RECEIVED, DISPENSED, RETURNED, ADJUSTMENT, EXPIRED, TRANSFER
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      reference_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      reference_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      performed_by: {
        type: Sequelize.UUID,
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

    // 4. Create medication_substitution_requests
    await queryInterface.createTable("medication_substitution_requests", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      pharmacy_prescription_item_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      original_medication_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      requested_medication_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "REQUESTED", // REQUESTED, PHYSICIAN_REVIEW, APPROVED, REJECTED
      },
      requested_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      approved_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      approved_at: {
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

    // 5. Create controlled_medication_logs
    await queryInterface.createTable("controlled_medication_logs", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      medication_batch_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      prescription_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      dispensed_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      verified_by: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      digital_signature: {
        type: Sequelize.STRING(255),
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("controlled_medication_logs");
    await queryInterface.dropTable("medication_substitution_requests");
    await queryInterface.dropTable("pharmacy_stock_transactions");
    await queryInterface.dropTable("medication_batches");
    await queryInterface.dropTable("pharmacy_warehouses");
  },
};
