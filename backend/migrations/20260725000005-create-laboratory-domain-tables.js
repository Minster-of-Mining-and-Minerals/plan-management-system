"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.showAllTables();

    // 1. Create laboratory_test_catalogs
    if (!tableExists.includes("laboratory_test_catalogs")) {
      await queryInterface.createTable("laboratory_test_catalogs", {
        test_catalog_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING(64),
          allowNull: false,
          unique: true,
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        category: {
          type: Sequelize.STRING(64),
          allowNull: false,
          defaultValue: "HEMATOLOGY",
        },
        sample_type: {
          type: Sequelize.STRING(64),
          allowNull: false,
          defaultValue: "BLOOD",
        },
        unit: {
          type: Sequelize.STRING(32),
          allowNull: true,
        },
        reference_range: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        billing_service_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "billing_services",
            key: "service_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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

      await queryInterface.addIndex("laboratory_test_catalogs", ["category"]);
      await queryInterface.addIndex("laboratory_test_catalogs", ["code"]);
    }

    // 2. Create laboratory_order_items
    if (!tableExists.includes("laboratory_order_items")) {
      await queryInterface.createTable("laboratory_order_items", {
        item_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
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
        test_name: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "PENDING",
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

      await queryInterface.addIndex("laboratory_order_items", ["order_id"]);
    }

    // 3. Create laboratory_specimens
    if (!tableExists.includes("laboratory_specimens")) {
      await queryInterface.createTable("laboratory_specimens", {
        specimen_id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
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
        specimen_type: {
          type: Sequelize.STRING(64),
          allowNull: false,
          defaultValue: "BLOOD",
        },
        collection_status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "PENDING_COLLECTION",
        },
        collected_by: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: "users",
            key: "user_id",
          },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        collected_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        notes: {
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

      await queryInterface.addIndex("laboratory_specimens", ["order_id"]);
      await queryInterface.addIndex("laboratory_specimens", ["collection_status"]);
    }

    // 4. Add laboratory_status to clinical_orders
    const orderTableDescription = await queryInterface.describeTable("clinical_orders");
    if (!orderTableDescription.laboratory_status) {
      await queryInterface.addColumn("clinical_orders", "laboratory_status", {
        type: Sequelize.STRING(64),
        allowNull: true,
        defaultValue: "WAITING_FOR_COLLECTION",
      });
    }
  },

  async down(queryInterface) {
    const orderTableDescription = await queryInterface.describeTable("clinical_orders");
    if (orderTableDescription.laboratory_status) {
      await queryInterface.removeColumn("clinical_orders", "laboratory_status");
    }

    await queryInterface.dropTable("laboratory_specimens");
    await queryInterface.dropTable("laboratory_order_items");
    await queryInterface.dropTable("laboratory_test_catalogs");
  },
};
