"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. clinical_rooms
    await queryInterface.createTable("clinical_rooms", {
      room_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      room_number: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      department_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "CONSULTATION",
      },
      room_type: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "CONSULTATION",
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "AVAILABLE", // AVAILABLE, OCCUPIED, MAINTENANCE, RESERVED
      },
      capacity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      current_occupancy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // 2. clinical_equipment
    await queryInterface.createTable("clinical_equipment", {
      equipment_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      equipment_code: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      department_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "RADIOLOGY",
      },
      equipment_type: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: "DIAGNOSTIC",
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "AVAILABLE", // AVAILABLE, IN_USE, MAINTENANCE, OFFLINE
      },
      maintenance_due: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // 3. clinical_shifts
    await queryInterface.createTable("clinical_shifts", {
      shift_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      provider_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      department_id: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      shift_type: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "MORNING", // MORNING, EVENING, NIGHT, ON_CALL
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "SCHEDULED", // SCHEDULED, ACTIVE, COMPLETED, CANCELLED
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // 4. clinical_resource_assignments
    await queryInterface.createTable("clinical_resource_assignments", {
      assignment_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      resource_type: {
        type: Sequelize.STRING(64),
        allowNull: false, // STAFF, ROOM, EQUIPMENT
      },
      resource_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      assigned_to_type: {
        type: Sequelize.STRING(64),
        allowNull: false, // DEPARTMENT, ENCOUNTER, CLINICAL_ORDER
      },
      assigned_to_id: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "ACTIVE", // ACTIVE, COMPLETED, RELEASED, OVERRIDDEN
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      end_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      priority: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "ROUTINE",
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // 5. clinical_capacity_snapshots
    await queryInterface.createTable("clinical_capacity_snapshots", {
      snapshot_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      snapshot_type: {
        type: Sequelize.STRING(64),
        allowNull: false, // HOSPITAL, DEPARTMENT, PROVIDER
      },
      entity_id: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      capacity_metrics: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      utilization_pct: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
      },
      peak_utilization_pct: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0.0,
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("clinical_capacity_snapshots");
    await queryInterface.dropTable("clinical_resource_assignments");
    await queryInterface.dropTable("clinical_shifts");
    await queryInterface.dropTable("clinical_equipment");
    await queryInterface.dropTable("clinical_rooms");
  },
};
